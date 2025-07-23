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
                    const res = await fetch(`https://redmine.famishare.jp/issues.json?parent_id=${parentId}&status_id=*`, {
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
                // Thay thế processNode bằng post-order traversal
                async function processNodePostOrder(node) {
                    if (node.children && node.children.length > 0) {
                        for (const child of node.children) {
                            await processNodePostOrder(child);
                        }
                        // Log toàn bộ child và status của node hiện tại
                        console.log('BG: Node', node.id, 'children:', node.children.map(c => ({id: c.id, status: c.status ? c.status : null})));
                        // Sau khi đã cập nhật hết children, mới xét node hiện tại
                        const childrenStatuses = node.children.map(c => c.status ? c.status.id : null);
                        if (childrenStatuses.every(s => s === 5) && node.status && node.status.id !== 5) {
                            console.log('BG: All children closed, updating node', node.id, 'to status 5');
                            await updateIssueStatus(node, 5);
                            node.status.id = 5; // Cập nhật local để cha trên biết
                        } else if (childrenStatuses.some(s => s !== 1) && node.status && node.status.id === 1) {
                            console.log('BG: Some child not new, updating node', node.id, 'to status 2');
                            await updateIssueStatus(node, 2, 20);
                            node.status.id = 2; // Cập nhật local để cha trên biết
                        } else {
                            console.log('BG: Node', node.id, 'does not meet any update condition');
                        }
                    } else {
                        console.log('BG: Node', node.id, 'has no children, skip');
                    }
                }
                await processNodePostOrder(issueTree);
                await chrome.storage.local.set({ isSynchronizing: false });
                sendResponse({ ok: true });
            } catch (e) {
                await chrome.storage.local.set({ isSynchronizing: false });
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true; // keep message channel open for async
    }
    // Lắng nghe message để move ngày cho issue và tất cả issue con
    if (message.type === 'MOVE_ISSUE_DATES') {
        (async () => {
            try {
                const { issueId, days, apiKey } = message;
                console.log(`BG: Moving issue ${issueId} and children by ${days} days`);
                
                // Hàm lấy thông tin chi tiết issue
                async function getIssueDetail(issueId) {
                    const res = await fetch(`https://redmine.famishare.jp/issues/${issueId}.json`, {
                        headers: { 'X-Redmine-API-Key': apiKey }
                    });
                    if (!res.ok) throw new Error(`Failed to fetch issue ${issueId}`);
                    const data = await res.json();
                    return data.issue;
                }
                
                // Hàm lấy tất cả issue con (recursive)
                async function getAllChildren(parentId) {
                    const res = await fetch(`https://redmine.famishare.jp/issues.json?parent_id=${parentId}&status_id=*`, {
                        headers: { 'X-Redmine-API-Key': apiKey }
                    });
                    if (!res.ok) return [];
                    const data = await res.json();
                    const children = data.issues || [];
                    
                    // Lấy thông tin chi tiết cho mỗi child
                    const detailedChildren = [];
                    for (const child of children) {
                        const childDetail = await getIssueDetail(child.id);
                        detailedChildren.push(childDetail);
                        
                        // Lấy children của child (recursive)
                        const grandChildren = await getAllChildren(child.id);
                        detailedChildren.push(...grandChildren);
                    }
                    
                    return detailedChildren;
                }
                
                // Lấy issue chính và tất cả issue con
                const mainIssue = await getIssueDetail(issueId);
                const allChildren = await getAllChildren(issueId);
                const allIssues = [mainIssue, ...allChildren];
                
                console.log(`BG: Found ${allIssues.length} issues to update`);
                
                // Hàm tính ngày làm việc (bỏ qua thứ 7, chủ nhật)
                function addWorkingDays(date, days) {
                    const result = new Date(date);
                    const direction = days > 0 ? 1 : -1;
                    const absDays = Math.abs(days);
                    
                    let workingDaysAdded = 0;
                    while (workingDaysAdded < absDays) {
                        result.setDate(result.getDate() + direction);
                        const dayOfWeek = result.getDay(); // 0 = Sunday, 6 = Saturday
                        if (dayOfWeek !== 0 && dayOfWeek !== 6) {
                            workingDaysAdded++;
                        }
                    }
                    
                    return result;
                }
                
                // Hàm cập nhật ngày cho một issue
                async function updateIssueDates(issue) {
                    const updateData = {
                        issue: {
                            id: issue.id,
                            subject: issue.subject,
                            assigned_to_id: issue.assigned_to ? issue.assigned_to.id : undefined,
                            estimated_hours: issue.estimated_hours,
                            status_id: issue.status ? issue.status.id : undefined
                        }
                    };
                    
                    // Cập nhật start_date nếu có
                    if (issue.start_date) {
                        const newStartDate = addWorkingDays(issue.start_date, days);
                        updateData.issue.start_date = newStartDate.toISOString().split('T')[0];
                    }
                    
                    // Cập nhật due_date nếu có
                    if (issue.due_date) {
                        const newDueDate = addWorkingDays(issue.due_date, days);
                        updateData.issue.due_date = newDueDate.toISOString().split('T')[0];
                    }
                    
                    const res = await fetch(`https://redmine.famishare.jp/issues/${issue.id}.json`, {
                        method: 'PUT',
                        headers: {
                            'X-Redmine-API-Key': apiKey,
                            'Content-Type': 'application/json'
                        },
                        body: JSON.stringify(updateData)
                    });
                    
                    if (!res.ok) {
                        throw new Error(`Failed to update issue ${issue.id}: ${res.statusText}`);
                    }
                    
                    return res.ok;
                }
                
                // Cập nhật tất cả issues
                const results = [];
                for (const issue of allIssues) {
                    try {
                        await updateIssueDates(issue);
                        results.push({ id: issue.id, success: true });
                        console.log(`BG: Updated issue ${issue.id} successfully`);
                    } catch (error) {
                        results.push({ id: issue.id, success: false, error: error.message });
                        console.error(`BG: Failed to update issue ${issue.id}:`, error);
                    }
                }
                
                const successCount = results.filter(r => r.success).length;
                const failedCount = results.filter(r => !r.success).length;
                
                console.log(`BG: Move dates completed. Success: ${successCount}, Failed: ${failedCount}`);
                
                sendResponse({ 
                    ok: true, 
                    results,
                    summary: {
                        total: allIssues.length,
                        success: successCount,
                        failed: failedCount
                    }
                });
                
            } catch (e) {
                console.error('BG: Move dates error:', e);
                sendResponse({ ok: false, error: e.message });
            }
        })();
        return true; // keep message channel open for async
    }
    // Lắng nghe message để refresh page
    if (message.type === 'REFRESH_PAGE') {
        // Gửi message đến content script để refresh page
        chrome.tabs.query({active: true, currentWindow: true}, function(tabs) {
            if (tabs[0]) {
                chrome.tabs.sendMessage(tabs[0].id, {type: 'REFRESH_PAGE'});
            }
        });
        sendResponse({ok: true});
        return true;
    }
    // Lắng nghe message từ popup để refresh page
    if (message.type === 'REFRESH_PAGE_FROM_POPUP') {
        console.log('BG: Received REFRESH_PAGE_FROM_POPUP for issue:', message.issueId);
        
        // Tìm tab chứa Redmine
        chrome.tabs.query({url: "*://redmine.famishare.jp/*"}, function(tabs) {
            if (tabs.length > 0) {
                // Refresh tab đầu tiên tìm thấy
                chrome.tabs.reload(tabs[0].id);
                console.log('BG: Refreshed tab:', tabs[0].id);
                sendResponse({ok: true, tabId: tabs[0].id});
            } else {
                console.log('BG: No Redmine tabs found');
                sendResponse({ok: false, error: 'No Redmine tabs found'});
            }
        });
        return true;
    }
    // Lắng nghe message để refresh tất cả tab Redmine
    if (message.type === 'REFRESH_ALL_REDMINE_PAGES') {
        console.log('BG: Received REFRESH_ALL_REDMINE_PAGES for issue:', message.issueId);
        
        // Tìm tất cả tab chứa Redmine
        chrome.tabs.query({url: "*://redmine.famishare.jp/*"}, function(tabs) {
            console.log('BG: Found Redmine tabs:', tabs.length, tabs.map(t => ({id: t.id, url: t.url})));
            
            if (tabs.length > 0) {
                let refreshedCount = 0;
                let errorCount = 0;
                
                // Refresh từng tab một cách tuần tự để tránh lỗi
                tabs.forEach((tab, index) => {
                    setTimeout(() => {
                        // Phương pháp 1: Sử dụng chrome.tabs.reload
                        chrome.tabs.reload(tab.id, {}, (result) => {
                            if (chrome.runtime.lastError) {
                                console.error('BG: Error refreshing tab', tab.id, chrome.runtime.lastError);
                                // Phương pháp 2: Thử chrome.tabs.update
                                chrome.tabs.update(tab.id, {url: tab.url}, (updateResult) => {
                                    if (chrome.runtime.lastError) {
                                        console.error('BG: Error updating tab', tab.id, chrome.runtime.lastError);
                                        errorCount++;
                                    } else {
                                        console.log('BG: Successfully updated tab:', tab.id);
                                        refreshedCount++;
                                    }
                                    checkCompletion();
                                });
                            } else {
                                console.log('BG: Successfully refreshed tab:', tab.id);
                                refreshedCount++;
                                checkCompletion();
                            }
                        });
                        
                        function checkCompletion() {
                            // Kiểm tra nếu đã refresh xong tất cả
                            if (refreshedCount + errorCount === tabs.length) {
                                console.log(`BG: Completed refreshing. Success: ${refreshedCount}, Errors: ${errorCount}`);
                                sendResponse({
                                    ok: refreshedCount > 0, 
                                    refreshedTabs: refreshedCount, 
                                    errorTabs: errorCount,
                                    totalTabs: tabs.length,
                                    tabIds: tabs.map(t => t.id)
                                });
                                
                                // Gửi message đến tất cả content script để refresh
                                tabs.forEach(tab => {
                                    chrome.tabs.sendMessage(tab.id, {type: 'REFRESH_PAGE'}, (response) => {
                                        if (chrome.runtime.lastError) {
                                            console.log('BG: Could not send message to tab', tab.id, chrome.runtime.lastError);
                                        } else {
                                            console.log('BG: Sent refresh message to tab', tab.id);
                                        }
                                    });
                                });
                            }
                        }
                    }, index * 100); // Delay 100ms giữa mỗi tab để tránh quá tải
                });
            } else {
                console.log('BG: No Redmine tabs found');
                sendResponse({ok: false, error: 'No Redmine tabs found'});
            }
        });
        return true;
    }
    return false;
});