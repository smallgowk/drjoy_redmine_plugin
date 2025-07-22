// Background script chỉ phục vụ Redmine multi-task

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
    if (message.type === 'REDMINE_API_REQUEST') {
        console.log('BG: Received REDMINE_API_REQUEST', message);
        const { url, method, apiKey, body } = message;
        const fetchOptions = {
            method: method || 'GET',
            headers: {
                'Content-Type': 'application/json',
                'X-Redmine-API-Key': apiKey
            },
        };
        if (body && method === 'POST') {
            fetchOptions.body = JSON.stringify(body);
        }
        fetch(url, fetchOptions)
            .then(async res => {
                const text = await res.text();
                let data = null;
                try { data = JSON.parse(text); } catch (e) { data = text; }
                console.log('BG: Fetched', url, 'status', res.status, 'data', data);
                sendResponse({ ok: res.ok, status: res.status, data });
            })
            .catch(e => {
                console.error('BG: Fetch error', e);
                sendResponse({ ok: false, error: 'Failed to fetch Redmine API: ' + e.message });
            });
        return true;
    }
    // Lắng nghe message từ popup để thực hiện đồng bộ Redmine
    if (message.type === 'START_SYNCHRONIZE') {
        (async () => {
            try {
                const { issueId, apiKey } = message;
                await chrome.storage.local.set({ isSynchronizing: true });
                // 1. Get parent chain (to root)
                const parentIds = [];
                let currentId = issueId;
                let rootIssue = null;
                while (true) {
                    const res = await fetch(`https://redmine.famishare.jp/issues/${currentId}.json`, {
                        headers: { 'X-Redmine-API-Key': apiKey }
                    });
                    if (!res.ok) throw new Error('Failed to fetch issue data.');
                    const data = await res.json();
                    if (data.issue.parent && data.issue.parent.id) {
                        parentIds.push(data.issue.parent.id);
                        currentId = data.issue.parent.id;
                    } else {
                        rootIssue = data.issue;
                        break;
                    }
                }
                // 2. Build issue tree (3 lớp)
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
                const issueTree = await buildTree(rootIssue, 3);
                // 3. Process update status
                function allChildrenClosed(children) {
                    return children.length > 0 && children.every(child => child.status && child.status.id === 5);
                }
                function anyChildNotNew(children) {
                    return children.some(child => child.status && child.status.id !== 1);
                }
                async function updateIssueStatus(issue, statusId, doneRatio) {
                    const updateData = {
                        issue: {
                            id: issue.id,
                            subject: issue.subject,
                            assigned_to_id: issue.assigned_to ? issue.assigned_to.id : undefined,
                            estimated_hours: issue.estimated_hours,
                            start_date: issue.start_date,
                            due_date: issue.due_date,
                            status_id: statusId
                        }
                    };
                    if (doneRatio !== undefined) updateData.issue.done_ratio = doneRatio;
                    const res = await fetch(`https://redmine.famishare.jp/issues/${issue.id}.json`, {
                        method: 'PUT',
                        headers: {
                            'X-Redmine-API-Key': apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updateData)
                    });
                    return res.ok;
                }
                async function processNode(node) {
                    if (!node.children || node.children.length === 0) return;
                    if (allChildrenClosed(node.children) && node.status && node.status.id !== 5) {
                        await updateIssueStatus(node, 5);
                    } else if (anyChildNotNew(node.children) && node.status && node.status.id === 1) {
                        await updateIssueStatus(node, 2, 20);
                    }
                    for (const child of node.children) {
                        await processNode(child);
                    }
                }
                await processNode(issueTree);
                await chrome.storage.local.set({ isSynchronizing: false });
                sendResponse({ ok: true });
            } catch (e) {
                await chrome.storage.local.set({ isSynchronizing: false });
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true; // keep message channel open for async
    }
    return false;
});