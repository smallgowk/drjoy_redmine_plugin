// Content script: Thêm 2 menu vào context menu Redmine
function addCustomContextMenuItems() {
  const menu = document.getElementById('context-menu');
  if (menu) {
    const ul = menu.querySelector('ul');
    if (ul) {
      // Create sub tasks (custom icon, style đồng bộ Redmine)
      if (!ul.querySelector('.my-plugin-create-subtasks-item')) {
        const li = document.createElement('li');
        li.className = 'my-plugin-create-subtasks-item';
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'my-plugin-custom-icon';
        a.innerHTML = '<span class="my-plugin-emoji-icon">📝</span> Create sub tasks';
        a.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          const ticketId = getTicketIdFromMenu(menu);
          if (!ticketId) {
            alert('Cannot detect ticket id!');
            return;
          }
          openMultiTask(ticketId);
          menu.style.display = 'none';
        };
        li.appendChild(a);
        ul.appendChild(li);
      }
      // Synchronize (custom icon, style đồng bộ Redmine)
      if (!ul.querySelector('.my-plugin-synchronize-item')) {
        const li = document.createElement('li');
        li.className = 'my-plugin-synchronize-item';
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'my-plugin-custom-icon';
        a.innerHTML = '<span class="my-plugin-emoji-icon">🔄</span> Synchronize';
        a.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          const ticketId = getTicketIdFromMenu(menu);
          if (!ticketId) {
            alert('Cannot detect ticket id!');
            return;
          }
          sendSynchronize(ticketId);
          menu.style.display = 'none';
        };
        li.appendChild(a);
        ul.appendChild(li);
      }
      // Migrate time (Redmine style, có menu con, LUÔN ở cuối)
      if (!ul.querySelector('.my-plugin-migrate-folder')) {
        const li = document.createElement('li');
        li.className = 'folder my-plugin-migrate-folder';
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'submenu my-plugin-custom-icon';
        a.innerHTML = '<span class="my-plugin-emoji-icon">⏱️</span> Migrate time';
        const migrateUl = document.createElement('ul');
        migrateUl.style.minWidth = '160px';
        // Helper tạo menu con style Redmine, menu tầng 3 style riêng
        function addSubMenuCustomPopup(parentUl, text, options, isLeaf) {
          const subLi = document.createElement('li');
          subLi.className = 'folder';
          let subA;
          if (isLeaf) {
            subA = document.createElement('a');
            subA.href = '#';
            subA.textContent = text;
            subA.onclick = function(e) {
              e.preventDefault();
              e.stopPropagation();
              const ticketId = getTicketIdFromMenu(menu);
              alert(`${text} (Ticket #${ticketId})`);
              menu.style.display = 'none';
            };
          } else {
            subA = document.createElement('a');
            subA.href = '#';
            subA.className = 'submenu';
            subA.textContent = text;
            // Tạo popup menu tầng 3 style riêng
            let popup = null;
            let popupHover = false;
            subLi.onmouseenter = function(e) {
              if (popup) return;
              popup = document.createElement('div');
              popup.className = 'my-plugin-popup-menu3';
              popup.style.position = 'fixed';
              const rect = subA.getBoundingClientRect();
              popup.style.top = rect.top + 'px';
              popup.style.left = (rect.right + 2) + 'px';
              popup.style.minWidth = '140px';
              popup.style.background = '#fff';
              popup.style.border = '1px solid #ccc';
              popup.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.12)';
              popup.style.padding = '2px 0';
              popup.style.zIndex = 10001;
              options.forEach(opt => {
                const item = document.createElement('div');
                item.className = 'my-plugin-popup-menu3-item';
                item.textContent = opt.label;
                item.style.padding = '6px 18px';
                item.style.cursor = 'pointer';
                item.style.fontSize = '13px';
                item.style.color = '#333';
                item.onmouseenter = () => item.style.background = '#e6f0fa';
                item.onmouseleave = () => item.style.background = '';
                item.onclick = (ev) => {
                  ev.preventDefault();
                  ev.stopPropagation();
                  const ticketId = getTicketIdFromMenu(menu);
                  alert(`${text} - ${opt.label} (Ticket #${ticketId})`);
                  menu.style.display = 'none';
                  if (popup) popup.remove();
                };
                popup.appendChild(item);
              });
              // Theo dõi hover trên popup
              popup.addEventListener('mouseenter', () => { popupHover = true; });
              popup.addEventListener('mouseleave', () => {
                popupHover = false;
                setTimeout(() => {
                  if (!popupHover && !subLi.matches(':hover')) {
                    if (popup) popup.remove();
                    popup = null;
                  }
                }, 80);
              });
              document.body.appendChild(popup);
            };
            subLi.addEventListener('mouseleave', () => {
              setTimeout(() => {
                if (!popupHover && !subLi.matches(':hover')) {
                  if (popup) popup.remove();
                  popup = null;
                }
              }, 80);
            });
          }
          subLi.appendChild(subA);
          parentUl.appendChild(subLi);
        }
        addSubMenuCustomPopup(migrateUl, 'Move forward', [
          { label: '1 day' }, { label: '2 days' }, { label: '3 days' }, { label: '4 days' }, { label: '5 days' }
        ], false);
        addSubMenuCustomPopup(migrateUl, 'Move backward', [
          { label: '1 day' }, { label: '2 days' }, { label: '3 days' }, { label: '4 days' }, { label: '5 days' }
        ], false);
        addSubMenuCustomPopup(migrateUl, 'Change Ticket Date', [], true);
        li.appendChild(a);
        li.appendChild(migrateUl);
        ul.appendChild(li);
        ul.appendChild(li); // Đảm bảo luôn ở cuối
      }
    }
  }
}

function getTicketIdFromMenu(menu) {
  const firstLi = menu.querySelector('ul > li');
  if (firstLi) {
    const a = firstLi.querySelector('a[href*="/issues/"]');
    if (a) {
      const match = a.getAttribute('href').match(/\/issues\/(\d+)\/edit/);
      if (match) return match[1];
    }
  }
  return null;
}

async function getApiKey() {
  return new Promise(resolve => {
    chrome.storage.local.get(['redmineApiKey'], result => {
      resolve(result.redmineApiKey);
    });
  });
}

function sendSynchronize(ticketId) {
  getApiKey().then(apiKey => {
    if (!apiKey) {
      alert('Please save your Redmine API Key first in extension popup.');
      return;
    }
    chrome.storage.local.set({ isSynchronizing: true, syncJustFinished: false });
    chrome.runtime.sendMessage({ type: 'START_SYNCHRONIZE', issueId: ticketId, apiKey }, response => {
      chrome.storage.local.set({ isSynchronizing: false, syncJustFinished: true });
      if (response && !response.ok) {
        alert('Synchronize failed: ' + (response.error || 'Unknown error'));
      } else {
        alert('Auto-update status for all issues with children completed!');
      }
    });
  });
}

function openMultiTask(ticketId) {
  getApiKey().then(apiKey => {
    if (!apiKey) {
      alert('Please save your Redmine API Key first in extension popup.');
      return;
    }
    const extensionUrl = chrome.runtime.getURL('multi-task.html');
    const url = `${extensionUrl}?issueId=${encodeURIComponent(ticketId)}&apiKey=${encodeURIComponent(apiKey)}`;
    window.open(url, '_blank');
  });
}

function createMigrateSubMenu(menu, ticketId, parentLi) {
  // Xóa submenu cũ nếu có trong parentLi
  parentLi.querySelectorAll('.my-plugin-migrate-submenu').forEach(e => e.remove());
  // Tạo submenu chính
  const submenu = document.createElement('ul');
  submenu.className = 'my-plugin-migrate-submenu';
  submenu.style.position = 'absolute';
  submenu.style.top = '0';
  submenu.style.left = '100%';
  submenu.style.minWidth = parentLi.offsetWidth + 'px';
  submenu.style.zIndex = 9999;
  submenu.style.background = '#fff';
  submenu.style.border = '1px solid #ccc';
  submenu.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.08)';
  submenu.style.padding = '2px 0';
  submenu.style.listStyle = 'none';

  // Helper tạo li có submenu
  function createLiWithSub(text, subOptions) {
    const li = document.createElement('li');
    li.className = 'my-plugin-migrate-parent';
    li.style.position = 'relative';
    li.style.cursor = 'pointer';
    li.innerHTML = `<span>${text} <span style=\"float:right\">▶</span></span>`;
    // Tạo submenu con
    const subUl = document.createElement('ul');
    subUl.className = 'my-plugin-migrate-submenu2';
    subUl.style.position = 'absolute';
    subUl.style.top = '0';
    subUl.style.left = '100%';
    subUl.style.minWidth = '120px';
    subUl.style.background = '#fff';
    subUl.style.border = '1px solid #ccc';
    subUl.style.boxShadow = '2px 2px 6px rgba(0,0,0,0.08)';
    subUl.style.padding = '2px 0';
    subUl.style.display = 'none';
    subUl.style.listStyle = 'none';
    subOptions.forEach(opt => {
      const subLi = document.createElement('li');
      subLi.className = 'my-plugin-migrate-leaf';
      subLi.style.cursor = 'pointer';
      subLi.style.padding = '4px 16px 4px 16px';
      subLi.textContent = opt.label;
      subLi.onmouseenter = () => subLi.style.background = '#e6f0fa';
      subLi.onmouseleave = () => subLi.style.background = '';
      subLi.onclick = (e) => {
        e.stopPropagation();
        e.preventDefault();
        alert(`${text} - ${opt.label} (Ticket #${ticketId})`);
        submenu.remove();
        menu.style.display = 'none';
      };
      subUl.appendChild(subLi);
    });
    li.appendChild(subUl);
    li.onmouseenter = () => { subUl.style.display = 'block'; li.style.background = '#e6f0fa'; };
    li.onmouseleave = () => { subUl.style.display = 'none'; li.style.background = ''; };
    return li;
  }
  // Move forward
  submenu.appendChild(createLiWithSub('Move forward', [
    { label: '1 day' }, { label: '2 days' }, { label: '3 days' }, { label: '4 days' }, { label: '5 days' }
  ]));
  // Move backward
  submenu.appendChild(createLiWithSub('Move backward', [
    { label: '1 day' }, { label: '2 days' }, { label: '3 days' }, { label: '4 days' }, { label: '5 days' }
  ]));
  // Change Ticket Date
  submenu.appendChild(createLiWithSub('Change Ticket Date', [
    { label: 'Change to specific day' }, { label: 'Change by days' }
  ]));
  parentLi.appendChild(submenu);
}

// Thêm style cho menu plugin để icon và text căn trái đồng bộ
(function injectPluginMenuStyle() {
  const style = document.createElement('style');
  style.textContent = `
    #context-menu .my-plugin-create-subtasks a,
    #context-menu .my-plugin-migrate-time a,
    #context-menu .my-plugin-synchronize a {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-left: 22px !important;
      font-size: 13px;
      color: #333;
      text-decoration: none;
      min-height: 20px;
    }
    #context-menu .my-plugin-create-subtasks a::before {
      content: "\\1F4DD"; /* 📝 */
      display: inline-block;
      width: 18px;
      margin-left: -22px;
      margin-right: 4px;
    }
    #context-menu .my-plugin-migrate-time a::before {
      content: "\\23F1"; /* ⏱ */
      display: inline-block;
      width: 18px;
      margin-left: -22px;
      margin-right: 4px;
    }
    #context-menu .my-plugin-synchronize a::before {
      content: "\\1F501"; /* 🔄 */
      display: inline-block;
      width: 18px;
      margin-left: -22px;
      margin-right: 4px;
    }
  `;
  document.head.appendChild(style);
})();

// Thêm style cho submenu migrate
(function injectMigrateSubMenuStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .my-plugin-migrate-submenu, .my-plugin-migrate-submenu2 {
      font-size: 13px;
      background: #fff;
      border: 1px solid #ccc;
      box-shadow: 2px 2px 6px rgba(0,0,0,0.08);
      padding: 2px 0;
      margin: 0;
      list-style: none;
      min-width: 140px;
      z-index: 9999;
    }
    .my-plugin-migrate-submenu > li, .my-plugin-migrate-submenu2 > li {
      padding: 4px 16px 4px 16px;
      cursor: pointer;
      white-space: nowrap;
    }
    .my-plugin-migrate-parent > span {
      display: flex;
      justify-content: space-between;
      align-items: center;
      width: 100%;
    }
    .my-plugin-migrate-parent {
      position: relative;
    }
    .my-plugin-migrate-parent:hover, .my-plugin-migrate-leaf:hover {
      background: #e6f0fa;
    }
  `;
  document.head.appendChild(style);
})();

// Bổ sung CSS cho icon riêng và submenu tầng 3
(function injectPluginCustomMenuStyle() {
  const style = document.createElement('style');
  style.textContent = `
    .my-plugin-custom-icon {
      display: flex;
      align-items: center;
      gap: 6px;
      padding-left: 22px !important;
      font-size: 13px;
      color: #333 !important;
      text-decoration: none;
      min-height: 20px;
    }
    .my-plugin-emoji-icon {
      display: inline-block;
      width: 18px;
      margin-left: -22px;
      margin-right: 4px;
      text-align: center;
    }
    .my-plugin-migrate-submenu3 {
      font-size: 13px;
      background: #fff;
      border: 1px solid #ccc;
      box-shadow: 2px 2px 6px rgba(0,0,0,0.08);
      padding: 2px 0;
      margin: 0;
      list-style: none;
      min-width: 140px;
      z-index: 10000;
    }
    .my-plugin-migrate-submenu3 > li {
      padding: 4px 16px 4px 16px;
      cursor: pointer;
      white-space: nowrap;
    }
    .my-plugin-migrate-submenu3 > li:hover {
      background: #e6f0fa;
    }
  `;
  document.head.appendChild(style);
})();

// Bổ sung CSS cho popup menu tầng 3
(function injectPluginPopupMenu3Style() {
  const style = document.createElement('style');
  style.textContent = `
    .my-plugin-popup-menu3 {
      font-size: 13px;
      background: #fff;
      border: 1px solid #ccc;
      box-shadow: 2px 2px 6px rgba(0,0,0,0.12);
      padding: 2px 0;
      margin: 0;
      min-width: 140px;
      z-index: 10001;
      border-radius: 4px;
    }
    .my-plugin-popup-menu3-item {
      padding: 6px 18px;
      cursor: pointer;
      white-space: nowrap;
      color: #333;
      border-radius: 2px;
      transition: background 0.15s;
    }
    .my-plugin-popup-menu3-item:hover {
      background: #e6f0fa;
    }
  `;
  document.head.appendChild(style);
})();

// Theo dõi menu context xuất hiện
const observer = new MutationObserver(() => {
  addCustomContextMenuItems();
});
observer.observe(document.body, { childList: true, subtree: true }); 