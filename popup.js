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
        synchroButton.addEventListener('click', async function () {
            try {
                // 1. Validate current tab URL
                const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
                const url = tab.url;
                const match = url.match(/^https:\/\/redmine\.famishare\.jp\/issues\/(\d+)/);
                if (!match) {
                    alert('Invalid ticket link. Please open a valid Redmine issue URL.');
                    return;
                }
                const issueId = match[1];
                // 2. Get API key from storage
                const apiKey = await new Promise((resolve) => {
                    chrome.storage.local.get(['redmineApiKey'], (result) => {
                        resolve(result.redmineApiKey);
                    });
                });
                if (!apiKey) {
                    alert('Please save your Redmine API Key first.');
                    return;
                }
                // 3. Get parent chain (to root)
                const parentIds = [];
                let currentId = issueId;
                let rootIssue = null;
                while (true) {
                    const res = await fetch(`https://redmine.famishare.jp/issues/${currentId}.json`, {
                        headers: { 'X-Redmine-API-Key': apiKey }
                    });
                    if (!res.ok) {
                        alert('Failed to fetch issue data.');
                        return;
                    }
                    const data = await res.json();
                    if (data.issue.parent && data.issue.parent.id) {
                        parentIds.push(data.issue.parent.id);
                        currentId = data.issue.parent.id;
                    } else {
                        rootIssue = data.issue;
                        break;
                    }
                }
                // 4. Build issue tree (root + 2 child levels)
                async function fetchChildren(parentId) {
                    const res = await fetch(`https://redmine.famishare.jp/issues.json?parent_id=${parentId}`, {
                        headers: { 'X-Redmine-API-Key': apiKey }
                    });
                    if (!res.ok) return [];
                    const data = await res.json();
                    return data.issues || [];
                }
                async function buildTree(issue, depth) {
                    if (depth === 0) return issue;
                    const children = await fetchChildren(issue.id);
                    issue.children = [];
                    for (const child of children) {
                        const childDetailRes = await fetch(`https://redmine.famishare.jp/issues/${child.id}.json`, {
                            headers: { 'X-Redmine-API-Key': apiKey }
                        });
                        const childDetail = childDetailRes.ok ? (await childDetailRes.json()).issue : child;
                        const childTree = await buildTree(childDetail, depth - 1);
                        issue.children.push(childTree);
                    }
                    return issue;
                }
                const issueTree = await buildTree(rootIssue, 2);
                console.log('Parent chain:', parentIds);
                console.log('Issue tree:', issueTree);
                alert('Issue tree fetched. Check the console for details.');
            } catch (e) {
                console.error(e);
                alert('An error occurred. See console for details.');
            }
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