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
          openMoveToDate(ticketId);
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
    try {
      chrome.storage.local.get(['redmineApiKey'], result => {
        if (chrome.runtime.lastError) {
          console.log('Storage access error in getApiKey:', chrome.runtime.lastError);
          resolve(null);
        } else {
          resolve(result.redmineApiKey);
        }
      });
    } catch (error) {
      console.log('Extension context error in getApiKey:', error);
      resolve(null);
    }
  });
}

function sendSynchronize(ticketId) {
  console.log('[SYNC] sendSynchronize called with ticketId:', ticketId);
  getApiKey().then(apiKey => {
    console.log('[SYNC] API Key:', apiKey);
    if (!apiKey) {
      alert('Please save your Redmine API Key first in extension popup.');
      return;
    }
    showLoadingState('Synchronizing issues...');
    try {
      chrome.storage.local.set({ isSynchronizing: true, syncJustFinished: false }, () => {
        if (chrome.runtime.lastError) {
          console.log('[SYNC] Storage set error in sendSynchronize:', chrome.runtime.lastError);
        }
      });
      chrome.runtime.sendMessage({ type: 'START_SYNCHRONIZE', issueId: ticketId, apiKey }, response => {
        try {
          console.log('[SYNC] Response from background:', response);
          chrome.storage.local.set({ isSynchronizing: false, syncJustFinished: true }, () => {
            if (chrome.runtime.lastError) {
              console.log('[SYNC] Storage set error in sendSynchronize response:', chrome.runtime.lastError);
            }
          });
          hideLoadingState();
          if (response && !response.ok) {
            alert('Synchronize failed: ' + (response.error || 'Unknown error'));
          } else {
            alert('Auto-update status for all issues with children completed!\n\nPage will refresh automatically in 0.5 seconds.');
            setTimeout(() => {
              location.reload();
            }, 500);
          }
        } catch (error) {
          console.log('[SYNC] Extension context error in sendSynchronize response:', error);
          hideLoadingState();
          alert('Synchronize failed: Extension context error');
        }
      });
    } catch (error) {
      console.log('[SYNC] Extension context error in sendSynchronize:', error);
      hideLoadingState();
      alert('Synchronize failed: Extension context error');
    }
  });
}

function openMultiTask(ticketId) {
  getApiKey().then(apiKey => {
    if (!apiKey) {
      alert('Please save your Redmine API Key first in extension popup.');
      return;
    }
    try {
      const extensionUrl = chrome.runtime.getURL('multi-task.html');
      const url = `${extensionUrl}?issueId=${encodeURIComponent(ticketId)}&apiKey=${encodeURIComponent(apiKey)}`;
      window.open(url, '_blank');
    } catch (error) {
      console.log('Extension context error in openMultiTask:', error);
      alert('Failed to open multi-task popup: Extension context error');
    }
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
    
    // Hiển thị loading state
    showLoadingState(`Moving issues ${absDays} working day(s) ${direction}...`);
    
    try {
      chrome.runtime.sendMessage({ 
        type: 'MOVE_ISSUE_DATES', 
        issueId: ticketId, 
        days: days, 
        apiKey: apiKey 
      }, response => {
        try {
          hideLoadingState();
          
          if (response && response.ok) {
            const { summary } = response;
            const successMsg = `Successfully moved ${summary.success} out of ${summary.total} issues ${absDays} working day(s) ${direction}.`;
            if (summary.failed > 0) {
              alert(`${successMsg}\n${summary.failed} issues failed to update.\n\nPage will refresh automatically in 0.5 seconds.`);
            } else {
              alert(`${successMsg}\n\nPage will refresh automatically in 0.5 seconds.`);
            }
            console.log('Move dates completed:', response);
            
            // Refresh page sau khi hoàn thành
            setTimeout(() => {
              location.reload();
            }, 500);
          } else {
            const errorMsg = response && response.error ? response.error : 'Unknown error occurred';
            alert(`Failed to move dates: ${errorMsg}`);
            console.error('Move dates failed:', response);
          }
        } catch (error) {
          console.log('Extension context error in moveIssueDates response:', error);
          hideLoadingState();
          alert('Move dates failed: Extension context error');
        }
      });
    } catch (error) {
      console.log('Extension context error in moveIssueDates:', error);
      hideLoadingState();
      alert('Move dates failed: Extension context error');
    }
  });
}

function openMoveToDate(ticketId) {
  getApiKey().then(apiKey => {
    if (!apiKey) {
      alert('Please save your Redmine API Key first in extension popup.');
      return;
    }
    try {
      const extensionUrl = chrome.runtime.getURL('move-to-date.html');
      const url = `${extensionUrl}?issueId=${encodeURIComponent(ticketId)}&apiKey=${encodeURIComponent(apiKey)}`;
      window.open(url, '_blank', 'width=400,height=600,scrollbars=yes,resizable=yes');
    } catch (error) {
      console.log('Extension context error in openMoveToDate:', error);
      alert('Failed to open move-to-date popup: Extension context error');
    }
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

// Lắng nghe message từ background script để refresh page
try {
  chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    try {
      if (message.type === 'REFRESH_PAGE') {
        console.log('Content script: Refreshing page...');
        location.reload();
      }
    } catch (error) {
      console.log('Extension context error in message listener:', error);
    }
  });
} catch (error) {
  console.log('Extension context error setting up message listener:', error);
}

// Kiểm tra storage để tự động refresh page
setInterval(() => {
  try {
    chrome.storage.local.get(['shouldRefreshPage', 'refreshTime', 'issueId'], (result) => {
      if (chrome.runtime.lastError) {
        console.log('Storage access error:', chrome.runtime.lastError);
        return;
      }
      if (result.shouldRefreshPage && result.refreshTime) {
        const timeDiff = Date.now() - result.refreshTime;
        // Chỉ refresh nếu thời gian chênh lệch < 10 giây (để tránh refresh liên tục)
        if (timeDiff < 10000) {
          console.log('Content script: Auto-refreshing page from storage...');
          chrome.storage.local.remove(['shouldRefreshPage', 'refreshTime', 'issueId'], () => {
            if (chrome.runtime.lastError) {
              console.log('Storage remove error:', chrome.runtime.lastError);
            }
          });
          location.reload();
        }
      }
    });
  } catch (error) {
    console.log('Extension context error in storage check:', error);
    // Nếu extension context bị invalid, dừng interval
    if (error.message.includes('Extension context invalidated')) {
      clearInterval(this);
    }
  }
}, 1000); // Kiểm tra mỗi giây

// Hiển thị loading state
function showLoadingState(message) {
  // Tạo loading overlay nếu chưa có
  let loadingOverlay = document.getElementById('drjoy-loading-overlay');
  if (!loadingOverlay) {
    loadingOverlay = document.createElement('div');
    loadingOverlay.id = 'drjoy-loading-overlay';
    loadingOverlay.style.cssText = `
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background: rgba(0, 0, 0, 0.5);
      display: flex;
      align-items: center;
      justify-content: center;
      z-index: 9999;
      font-family: Arial, sans-serif;
    `;
    
    const loadingContent = document.createElement('div');
    loadingContent.style.cssText = `
      background: white;
      padding: 30px;
      border-radius: 8px;
      text-align: center;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      min-width: 300px;
    `;
    
    const spinner = document.createElement('div');
    spinner.style.cssText = `
      width: 40px;
      height: 40px;
      border: 4px solid #e3e3e3;
      border-top: 4px solid #2196F3;
      border-radius: 50%;
      animation: drjoy-spin 1s linear infinite;
      margin: 0 auto 15px auto;
    `;
    
    const text = document.createElement('div');
    text.id = 'drjoy-loading-text';
    text.style.cssText = `
      font-size: 16px;
      color: #333;
      font-weight: 500;
    `;
    
    loadingContent.appendChild(spinner);
    loadingContent.appendChild(text);
    loadingOverlay.appendChild(loadingContent);
    
    // Thêm CSS animation
    const style = document.createElement('style');
    style.textContent = `
      @keyframes drjoy-spin {
        0% { transform: rotate(0deg); }
        100% { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(style);
    
    document.body.appendChild(loadingOverlay);
  }
  
  // Cập nhật message
  const textElement = document.getElementById('drjoy-loading-text');
  if (textElement) {
    textElement.textContent = message;
  }
  
  loadingOverlay.style.display = 'flex';
}

// Ẩn loading state
function hideLoadingState() {
  const loadingOverlay = document.getElementById('drjoy-loading-overlay');
  if (loadingOverlay) {
    loadingOverlay.style.display = 'none';
  }
} 