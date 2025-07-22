// Popup script for Redmine Task Manager

document.addEventListener('DOMContentLoaded', function() {
    // API Key logic
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    if (apiKeyInput && saveApiKeyBtn) {
        // Load API key nếu đã lưu
        const savedKey = localStorage.getItem('redmineApiKey');
        if (savedKey) apiKeyInput.value = savedKey;
        saveApiKeyBtn.addEventListener('click', function() {
            localStorage.setItem('redmineApiKey', apiKeyInput.value.trim());
            saveApiKeyBtn.textContent = 'Saved!';
            setTimeout(() => { saveApiKeyBtn.textContent = 'Save'; }, 1200);
        });
    }

    const gantChartButton = document.getElementById('gantChartButton');
    const synchroButton = document.getElementById('synchroButton');
    const createMultiTaskButton = document.getElementById('createMultiTaskButton');

    if (gantChartButton) {
        gantChartButton.addEventListener('click', function() {
            const now = new Date();
            const month = now.getMonth() + 1; // JS month is 0-based
            const year = now.getFullYear();
            const baseUrl = 'https://redmine.famishare.jp/projects/drjoy_vn/issues/gantt?utf8=%E2%9C%93&set_filter=1&gantt=1&f%5B%5D=assigned_to_id&op%5Bassigned_to_id%5D=%3D&v%5Bassigned_to_id%5D%5B%5D=me&f%5B%5D=status_id&op%5Bstatus_id%5D=%3D&v%5Bstatus_id%5D%5B%5D=1&v%5Bstatus_id%5D%5B%5D=2&v%5Bstatus_id%5D%5B%5D=3&f%5B%5D=&query%5Bdraw_selected_columns%5D=0&query%5Bdraw_relations%5D=0&query%5Bdraw_relations%5D=1&query%5Bdraw_progress_line%5D=0&months=3';
            const url = `${baseUrl}&month=${month}&year=${year}&zoom=4`;
            chrome.tabs.create({ url });
        });
    }

    if (synchroButton) {
        synchroButton.addEventListener('click', function() {
            // Not implemented yet
        });
    }

    if (createMultiTaskButton) {
        createMultiTaskButton.addEventListener('click', async function() {
            try {
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                if (!tab || !tab.url) {
                    alert('Cannot get current URL');
                    return;
                }

                const url = tab.url;
                const issueMatch = url.match(/https:\/\/redmine\.famishare\.jp\/issues\/(\d+)/);
                
                if (!issueMatch) {
                    alert('Invalid ticket link. Please open a Redmine ticket before using this feature.');
                    return;
                }

                const issueId = issueMatch[1];
                openMultiTaskTab(issueId);
            } catch (error) {
                alert('Error: ' + error.message);
            }
        });
    }
});

// Global Redmine API Key (cố định, dễ thay đổi)
const REDMINE_API_KEY = '4d91a17281092c5f955cb51a9e2a70f021479901';

function openMultiTaskTab(issueId) {
    // Ưu tiên dùng API key người dùng nhập, nếu không có thì dùng mặc định
    const userKey = localStorage.getItem('redmineApiKey');
    const apiKey = userKey && userKey.trim() ? userKey.trim() : REDMINE_API_KEY;
    // Mở tab mới với query string truyền apiKey
    const extensionUrl = chrome.runtime.getURL('multi-task.html');
    const url = `${extensionUrl}?issueId=${encodeURIComponent(issueId)}&apiKey=${encodeURIComponent(apiKey)}`;
    chrome.tabs.create({ url });
}