// Popup script for Redmine Task Manager

document.addEventListener('DOMContentLoaded', function() {
    // API Key logic
    const apiKeyInput = document.getElementById('apiKeyInput');
    const saveApiKeyBtn = document.getElementById('saveApiKeyBtn');
    const findKeyBtn = document.getElementById('findKeyBtn');
    
    if (apiKeyInput && saveApiKeyBtn) {
        // Load API key nếu đã lưu
        chrome.storage.local.get(['redmineApiKey'], (result) => {
            if (result.redmineApiKey) apiKeyInput.value = result.redmineApiKey;
        });
        saveApiKeyBtn.addEventListener('click', function() {
            const key = apiKeyInput.value.trim();
            chrome.storage.local.set({ redmineApiKey: key }, () => {
                saveApiKeyBtn.textContent = 'Saved!';
                setTimeout(() => { saveApiKeyBtn.textContent = 'Save'; }, 1200);
            });
        });
    }
    
    // Find Key button logic
    if (findKeyBtn) {
        findKeyBtn.addEventListener('click', function() {
            chrome.tabs.create({ url: 'https://redmine.famishare.jp/my/account' });
        });
    }

    const gantChartButton = document.getElementById('gantChartButton');
    const myBugsButton = document.getElementById('myBugsButton');
    const myTasksButton = document.getElementById('myTasksButton');
    const mySpentTimeButton = document.getElementById('mySpentTimeButton');
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

    if (myBugsButton) {
        myBugsButton.addEventListener('click', function() {
            const url = 'https://redmine.famishare.jp/issues?utf8=%E2%9C%93&set_filter=1&sort=id%3Adesc&f%5B%5D=status_id&op%5Bstatus_id%5D=o&f%5B%5D=assigned_to_id&op%5Bassigned_to_id%5D=%3D&v%5Bassigned_to_id%5D%5B%5D=me&f%5B%5D=tracker_id&op%5Btracker_id%5D=%3D&v%5Btracker_id%5D%5B%5D=1&f%5B%5D=&c%5B%5D=status&c%5B%5D=subject&c%5B%5D=cf_100&c%5B%5D=spent_hours&c%5B%5D=cf_4&c%5B%5D=cf_8&c%5B%5D=cf_9&c%5B%5D=start_date&c%5B%5D=due_date&c%5B%5D=cf_10&group_by=&t%5B%5D=';
            chrome.tabs.create({ url });
        });
    }

    if (myTasksButton) {
        myTasksButton.addEventListener('click', function() {
            const url = 'https://redmine.famishare.jp/issues?utf8=%E2%9C%93&set_filter=1&f%5B%5D=status_id&op%5Bstatus_id%5D=o&f%5B%5D=assigned_to_id&op%5Bassigned_to_id%5D=%3D&v%5Bassigned_to_id%5D%5B%5D=me&f%5B%5D=tracker_id&op%5Btracker_id%5D=%21&v%5Btracker_id%5D%5B%5D=1&f%5B%5D=&c%5B%5D=project&c%5B%5D=tracker&c%5B%5D=status&c%5B%5D=priority&c%5B%5D=cf_37&c%5B%5D=subject&c%5B%5D=assigned_to&c%5B%5D=total_spent_hours&c%5B%5D=created_on&c%5B%5D=updated_on&group_by=&t%5B%5D=';
            chrome.tabs.create({ url });
        });
    }

    if (mySpentTimeButton) {
        mySpentTimeButton.addEventListener('click', function() {
            const url = 'https://redmine.famishare.jp/projects/drjoy_vn/time_entries?utf8=%E2%9C%93&set_filter=1&sort=spent_on%3Adesc&f%5B%5D=spent_on&op%5Bspent_on%5D=*&f%5B%5D=user_id&op%5Buser_id%5D=%3D&v%5Buser_id%5D%5B%5D=me&f%5B%5D=&c%5B%5D=spent_on&c%5B%5D=user&c%5B%5D=issue&c%5B%5D=hours&group_by=&t%5B%5D=hours&t%5B%5D=';
            chrome.tabs.create({ url });
        });
    }

    // Hàm set trạng thái đồng bộ UI
    function setSyncUI(isSync) {
        if (saveApiKeyBtn) saveApiKeyBtn.disabled = isSync;
        if (gantChartButton) gantChartButton.disabled = isSync;
        if (synchroButton) {
            synchroButton.disabled = isSync;
            synchroButton.textContent = isSync ? 'Synchronizing...' : 'Synchronize';
        }
        if (createMultiTaskButton) createMultiTaskButton.disabled = isSync;
    }

    // Khi load popup, kiểm tra trạng thái synchronizing
    function watchSyncStatus() {
        chrome.storage.local.get(['isSynchronizing'], (result) => {
            if (result.isSynchronizing) {
                setSyncUI(true);
                setTimeout(watchSyncStatus, 1000);
            } else {
                setSyncUI(false);
                // Nếu trước đó đã từng gửi đồng bộ thì hiện alert hoàn thành
                chrome.storage.local.get(['syncJustFinished'], (r) => {
                    if (r.syncJustFinished) {
                        alert('Auto-update status for all issues with children completed!');
                        chrome.storage.local.set({ syncJustFinished: false });
                    }
                });
            }
        });
    }
    watchSyncStatus();

    if (synchroButton) {
        synchroButton.addEventListener('click', async function () {
            // Lấy issueId từ tab hiện tại
            const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
            const url = tab.url;
            const match = url.match(/^https:\/\/redmine\.famishare\.jp\/issues\/(\d+)/);
            if (!match) {
                alert('Invalid ticket link. Please open a valid Redmine issue URL.');
                return;
            }
            const issueId = match[1];
            // Lấy API key
            const apiKey = await new Promise((resolve) => {
                chrome.storage.local.get(['redmineApiKey'], (result) => {
                    resolve(result.redmineApiKey);
                });
            });
            if (!apiKey) {
                alert('Please save your Redmine API Key first.');
                return;
            }
            // Đặt trạng thái synchronizing vào storage và UI
            chrome.storage.local.set({ isSynchronizing: true, syncJustFinished: false });
            setSyncUI(true);
            // Gửi message sang background để thực hiện đồng bộ
            chrome.runtime.sendMessage({ type: 'START_SYNCHRONIZE', issueId, apiKey }, (response) => {
                // Khi background trả về (hoặc có lỗi), sẽ reset trạng thái
                chrome.storage.local.set({ isSynchronizing: false, syncJustFinished: true });
                setSyncUI(false);
                if (response && !response.ok) {
                    alert('Synchronize failed: ' + (response.error || 'Unknown error'));
                } else {
                    alert('Auto-update status for all issues with children completed!');
                }
            });
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

// Đảm bảo không có key Redmine mặc định hoặc hardcode
// Người dùng phải nhập API key của họ và lưu vào chrome.storage.local với key 'redmineApiKey'
function openMultiTaskTab(issueId) {
    // Ưu tiên dùng API key người dùng nhập, nếu không có thì dùng mặc định
    const userKey = localStorage.getItem('redmineApiKey');
    const apiKey = userKey && userKey.trim() ? userKey.trim() : null; // Không có key mặc định
    if (!apiKey) {
        alert('Please save your Redmine API Key first.');
        return;
    }
    // Mở tab mới với query string truyền apiKey
    const extensionUrl = chrome.runtime.getURL('multi-task.html');
    const url = `${extensionUrl}?issueId=${encodeURIComponent(issueId)}&apiKey=${encodeURIComponent(apiKey)}`;
    chrome.tabs.create({ url });
}