// Content script: Thêm 2 menu vào context menu Redmine
function addCustomContextMenuItems() {
  const menu = document.getElementById('context-menu');
  if (menu) {
    const ul = menu.querySelector('ul');
    if (ul) {
      // Create sub tasks
      if (!ul.querySelector('.my-plugin-create-subtasks')) {
        const li1 = document.createElement('li');
        li1.className = 'my-plugin-create-subtasks';
        li1.innerHTML = '<a href="#">Create sub tasks</a>';
        li1.onclick = function(e) {
          e.stopPropagation();
          e.preventDefault();
          const ticketId = getTicketIdFromMenu(menu);
          if (!ticketId) {
            alert('Cannot detect ticket id!');
            return;
          }
          openMultiTask(ticketId);
          menu.style.display = 'none';
        };
        ul.appendChild(li1);
      }
      // Migrate time
      if (!ul.querySelector('.my-plugin-migrate-time')) {
        const li2 = document.createElement('li');
        li2.className = 'my-plugin-migrate-time';
        li2.innerHTML = '<a href="#">Migrate time</a>';
        li2.onclick = function(e) {
          e.stopPropagation();
          e.preventDefault();
          alert('Migrate time');
          menu.style.display = 'none';
        };
        ul.appendChild(li2);
      }
      // Synchronize
      if (!ul.querySelector('.my-plugin-synchronize')) {
        const li3 = document.createElement('li');
        li3.className = 'my-plugin-synchronize';
        li3.innerHTML = '<a href="#">Synchronize</a>';
        li3.onclick = function(e) {
          e.stopPropagation();
          e.preventDefault();
          const ticketId = getTicketIdFromMenu(menu);
          if (!ticketId) {
            alert('Cannot detect ticket id!');
            return;
          }
          sendSynchronize(ticketId);
          menu.style.display = 'none';
        };
        ul.appendChild(li3);
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

// Theo dõi menu context xuất hiện
const observer = new MutationObserver(() => {
  addCustomContextMenuItems();
});
observer.observe(document.body, { childList: true, subtree: true }); 