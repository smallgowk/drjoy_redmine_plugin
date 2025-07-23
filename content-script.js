// Content script: Thêm 2 menu vào context menu Redmine
function addCustomContextMenuItems() {
  const menu = document.getElementById('context-menu');
  if (menu) {
    const ul = menu.querySelector('ul');
    if (ul) {
      // Create sub tasks (SVG icon, thẳng hàng chuẩn Redmine)
      if (!ul.querySelector('.my-plugin-create-subtasks-item')) {
        const li = document.createElement('li');
        li.className = 'my-plugin-create-subtasks-item';
        const a = document.createElement('a');
        a.href = '#';
        a.innerHTML = `
          <span style="display:inline-block;width:18px;margin-left:-22px;margin-right:4px;vertical-align:middle;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <rect x="2" y="2" width="12" height="12" rx="2" fill="#2196F3"/>
              <path d="M5 8h6M8 5v6" stroke="#fff" stroke-width="1.5" stroke-linecap="round"/>
            </svg>
          </span>
          Create sub tasks`;
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.fontSize = '13px';
        a.style.color = '#333';
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
      // Synchronize (SVG icon, thẳng hàng chuẩn Redmine)
      if (!ul.querySelector('.my-plugin-synchronize-item')) {
        const li = document.createElement('li');
        li.className = 'my-plugin-synchronize-item';
        const a = document.createElement('a');
        a.href = '#';
        a.innerHTML = `
          <span style="display:inline-block;width:18px;margin-left:-22px;margin-right:4px;vertical-align:middle;">
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
              <path d="M8 2a6 6 0 1 1-6 6" stroke="#43A047" stroke-width="1.5" fill="none"/>
              <path d="M2 2v4h4" stroke="#43A047" stroke-width="1.5" fill="none"/>
            </svg>
          </span>
          Synchronize`;
        a.style.display = 'flex';
        a.style.alignItems = 'center';
        a.style.fontSize = '13px';
        a.style.color = '#333';
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
      // Move to date (Redmine style, không có submenu, đặt trên Move Forward)
      if (!ul.querySelector('.my-plugin-move-to-date-item')) {
        const li = document.createElement('li');
        li.className = 'my-plugin-move-to-date-item';
        const a = document.createElement('a');
        a.href = '#';
        a.textContent = 'Move to date';
        a.onclick = function(e) {
          e.preventDefault();
          e.stopPropagation();
          const ticketId = getTicketIdFromMenu(menu);
          // TODO: Implement custom date picker for move to specific date
          alert(`Move to date feature will be implemented soon (Ticket #${ticketId})`);
          menu.style.display = 'none';
        };
        li.appendChild(a);
        ul.appendChild(li);
      }
      // Move Forward (Redmine style, có submenu 1-5 days)
      if (!ul.querySelector('.my-plugin-move-forward-folder')) {
        const li = document.createElement('li');
        li.className = 'folder my-plugin-move-forward-folder';
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'submenu';
        a.textContent = 'Move Forward';
        const subUl = document.createElement('ul');
        [1,2,3,4,5].forEach(d => {
          const subLi = document.createElement('li');
          const subA = document.createElement('a');
          subA.href = '#';
          subA.textContent = d + (d === 1 ? ' day' : ' days');
                  subA.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const ticketId = getTicketIdFromMenu(menu);
            moveIssueDates(ticketId, d);
            menu.style.display = 'none';
        };
          subLi.appendChild(subA);
          subUl.appendChild(subLi);
        });
        li.appendChild(a);
        li.appendChild(subUl);
        ul.appendChild(li);
      }
      // Move Backward (Redmine style, có submenu 1-5 days)
      if (!ul.querySelector('.my-plugin-move-backward-folder')) {
        const li = document.createElement('li');
        li.className = 'folder my-plugin-move-backward-folder';
        const a = document.createElement('a');
        a.href = '#';
        a.className = 'submenu';
        a.textContent = 'Move Backward';
        const subUl = document.createElement('ul');
        [1,2,3,4,5].forEach(d => {
          const subLi = document.createElement('li');
          const subA = document.createElement('a');
          subA.href = '#';
          subA.textContent = d + (d === 1 ? ' day' : ' days');
          subA.onclick = function(e) {
            e.preventDefault();
            e.stopPropagation();
            const ticketId = getTicketIdFromMenu(menu);
            moveIssueDates(ticketId, -d);
            menu.style.display = 'none';
          };
          subLi.appendChild(subA);
          subUl.appendChild(subLi);
        });
        li.appendChild(a);
        li.appendChild(subUl);
        ul.appendChild(li);
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

function moveIssueDates(ticketId, days) {
  getApiKey().then(apiKey => {
    if (!apiKey) {
      alert('Please save your Redmine API Key first in extension popup.');
      return;
    }
    
    const direction = days > 0 ? 'forward' : 'backward';
    const absDays = Math.abs(days);
    
    if (!confirm(`Are you sure you want to move issue #${ticketId} and all its children ${absDays} working day(s) ${direction}? (Weekends will be skipped)`)) {
      return;
    }
    
    // Hiển thị loading message
    const loadingMsg = `Moving issue #${ticketId} and children ${absDays} working day(s) ${direction}...`;
    console.log(loadingMsg);
    
    chrome.runtime.sendMessage({ 
      type: 'MOVE_ISSUE_DATES', 
      issueId: ticketId, 
      days: days, 
      apiKey: apiKey 
    }, response => {
      if (response && response.ok) {
        const { summary } = response;
        const successMsg = `Successfully moved ${summary.success} out of ${summary.total} issues ${absDays} working day(s) ${direction}.`;
        if (summary.failed > 0) {
          alert(`${successMsg}\n${summary.failed} issues failed to update.`);
        } else {
          alert(successMsg);
        }
        console.log('Move dates completed:', response);
      } else {
        const errorMsg = response && response.error ? response.error : 'Unknown error occurred';
        alert(`Failed to move dates: ${errorMsg}`);
        console.error('Move dates failed:', response);
      }
    });
  });
}

// Thêm style cho menu plugin để icon và text căn trái đồng bộ
(function injectPluginMenuStyle() {
  const style = document.createElement('style');
  style.textContent = `
    #context-menu .my-plugin-create-subtasks a,
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