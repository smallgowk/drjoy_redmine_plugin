// Move to Date popup logic
let issueId = null;
let apiKey = null;
let issueData = null;

// Khởi tạo popup
document.addEventListener('DOMContentLoaded', function() {
    // Lấy tham số từ URL
    const urlParams = new URLSearchParams(window.location.search);
    issueId = urlParams.get('issueId');
    apiKey = urlParams.get('apiKey');
    
    if (!issueId || !apiKey) {
        showError('Missing required parameters: issueId or apiKey');
        return;
    }
    
    // Set ngày mặc định là hôm nay
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('target-date').value = today;
    
    // Load thông tin issue
    loadIssueInformation();
    
    // Bind events
    document.getElementById('cancel-btn').addEventListener('click', closeWindow);
    document.getElementById('move-btn').addEventListener('click', moveToDate);
    document.getElementById('close-btn').addEventListener('click', closeWithRefresh);
    document.getElementById('confirm-cancel-btn').addEventListener('click', hideConfirmDialog);
    document.getElementById('confirm-ok-btn').addEventListener('click', executeMove);
    document.getElementById('target-date').addEventListener('change', updateInfoMessage);
});

// Load thông tin issue và children
async function loadIssueInformation() {
    try {
        showLoading(true, 'Loading issue information...');
        
        // Lấy thông tin issue chính
        const mainIssue = await getIssueDetail(issueId);
        
        // Lấy tất cả children
        const allChildren = await getAllChildren(issueId);
        const allIssues = [mainIssue, ...allChildren];
        
        issueData = {
            mainIssue: mainIssue,
            children: allChildren,
            allIssues: allIssues
        };
        
        // Hiển thị thông tin
        displayIssueInfo(allIssues);
        
        // Cập nhật thông báo
        updateInfoMessage();
        
    } catch (error) {
        showError('Failed to load issue information: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Lấy thông tin chi tiết issue
async function getIssueDetail(issueId) {
    const response = await fetch(`https://redmine.famishare.jp/issues/${issueId}.json`, {
        headers: { 'X-Redmine-API-Key': apiKey }
    });
    
    if (!response.ok) {
        throw new Error(`Failed to fetch issue ${issueId}`);
    }
    
    const data = await response.json();
    return data.issue;
}

// Lấy tất cả issue con (recursive)
async function getAllChildren(parentId) {
    const response = await fetch(`https://redmine.famishare.jp/issues.json?parent_id=${parentId}`, {
        headers: { 'X-Redmine-API-Key': apiKey }
    });
    
    if (!response.ok) return [];
    
    const data = await response.json();
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

// Hiển thị thông tin issue
function displayIssueInfo(allIssues) {
    const issueInfo = document.getElementById('issue-info');
    
    const issuesWithStartDate = allIssues.filter(issue => 
        issue.start_date && issue.start_date.trim() !== ''
    );
    
    const earliestStartDate = issuesWithStartDate.length > 0 
        ? issuesWithStartDate.reduce((earliest, issue) => 
            issue.start_date < earliest ? issue.start_date : earliest
          , issuesWithStartDate[0].start_date)
        : null;
    
    let infoText = `Issue #${issueId} and ${allIssues.length - 1} children`;
    
    if (earliestStartDate) {
        infoText += `<br>Earliest start date: ${earliestStartDate}`;
    }
    
    if (issuesWithStartDate.length < allIssues.length) {
        infoText += `<br>${allIssues.length - issuesWithStartDate.length} issues without start date`;
    }
    
    issueInfo.innerHTML = infoText;
}

// Cập nhật thông báo khi thay đổi ngày
function updateInfoMessage() {
    const targetDate = document.getElementById('target-date').value;
    const infoMessage = document.getElementById('info-message');
    
    if (!targetDate || !issueData) {
        infoMessage.style.display = 'none';
        return;
    }
    
    const issuesWithStartDate = issueData.allIssues.filter(issue => 
        issue.start_date && issue.start_date.trim() !== ''
    );
    
    if (issuesWithStartDate.length === 0) {
        infoMessage.style.display = 'block';
        infoMessage.textContent = 'No issues have start dates to move.';
        return;
    }
    
    const earliestStartDate = issuesWithStartDate.reduce((earliest, issue) => 
        issue.start_date < earliest ? issue.start_date : earliest
    , issuesWithStartDate[0].start_date);
    
    const daysDiff = calculateWorkingDaysDifference(earliestStartDate, targetDate);
    
    if (daysDiff === 0) {
        infoMessage.style.display = 'block';
        infoMessage.textContent = 'Target date is the same as earliest start date. No movement needed.';
        document.getElementById('date-preview').style.display = 'none';
    } else {
        const direction = daysDiff > 0 ? 'forward' : 'backward';
        const absDays = Math.abs(daysDiff);
        infoMessage.style.display = 'block';
        infoMessage.textContent = `Will move ${absDays} working day(s) ${direction} (weekends excluded).`;
        
        // Hiển thị preview chi tiết
        const previewElement = document.getElementById('date-preview');
        previewElement.style.display = 'block';
        previewElement.innerHTML = `
            <strong>Preview:</strong><br>
            From: ${earliestStartDate} → To: ${targetDate}<br>
            Direction: ${direction} | Working days: ${absDays}
        `;
    }
}

// Tính số ngày làm việc giữa 2 ngày
function calculateWorkingDaysDifference(startDate, endDate) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // Nếu cùng ngày thì return 0
    if (start.toDateString() === end.toDateString()) {
        return 0;
    }
    
    // Xác định hướng và số ngày cần tính
    const isForward = end > start;
    const absDays = Math.abs(Math.ceil((end - start) / (1000 * 60 * 60 * 24)));
    
    let workingDays = 0;
    const current = new Date(start);
    
    // Tính từ ngày tiếp theo của start đến end
    for (let i = 0; i < absDays; i++) {
        current.setDate(current.getDate() + (isForward ? 1 : -1));
        const dayOfWeek = current.getDay();
        if (dayOfWeek !== 0 && dayOfWeek !== 6) { // Không phải thứ 7, chủ nhật
            workingDays++;
        }
    }
    
    return isForward ? workingDays : -workingDays;
}

// Thực hiện move to date
async function moveToDate() {
    const targetDate = document.getElementById('target-date').value;
    
    if (!targetDate) {
        showError('Please select a target date');
        return;
    }
    
    if (!issueData) {
        showError('Issue data not loaded');
        return;
    }
    
    const issuesWithStartDate = issueData.allIssues.filter(issue => 
        issue.start_date && issue.start_date.trim() !== ''
    );
    
    if (issuesWithStartDate.length === 0) {
        showError('No issues have start dates to move');
        return;
    }
    
    const earliestStartDate = issuesWithStartDate.reduce((earliest, issue) => 
        issue.start_date < earliest ? issue.start_date : earliest
    , issuesWithStartDate[0].start_date);
    
    const daysDiff = calculateWorkingDaysDifference(earliestStartDate, targetDate);
    
    if (daysDiff === 0) {
        showError('Target date is the same as earliest start date. No movement needed.');
        return;
    }
    
    // Hiển thị confirm dialog thay vì browser confirm
    showConfirmDialog(daysDiff);
}

// Hiển thị confirm dialog
function showConfirmDialog(daysDiff) {
    const direction = daysDiff > 0 ? 'forward' : 'backward';
    const absDays = Math.abs(daysDiff);
    
    const confirmMessage = `Are you sure you want to move issue #${issueId} and all its children ${absDays} working day(s) ${direction}?`;
    
    document.getElementById('confirm-message').textContent = confirmMessage;
    document.getElementById('confirm-dialog').style.display = 'flex';
    
    // Lưu daysDiff để sử dụng khi confirm
    window.pendingMoveDays = daysDiff;
}

// Ẩn confirm dialog
function hideConfirmDialog() {
    document.getElementById('confirm-dialog').style.display = 'none';
    window.pendingMoveDays = null;
}

// Thực hiện move sau khi confirm
async function executeMove() {
    const daysDiff = window.pendingMoveDays;
    if (!daysDiff) {
        hideConfirmDialog();
        return;
    }
    
    hideConfirmDialog();
    
    try {
        showLoading(true, 'Moving issues...');
        
        // Gửi message đến background script
        const response = await new Promise((resolve) => {
            chrome.runtime.sendMessage({
                type: 'MOVE_ISSUE_DATES',
                issueId: issueId,
                days: daysDiff,
                apiKey: apiKey
            }, resolve);
        });
        
        if (response && response.ok) {
            const { summary } = response;
            const direction = daysDiff > 0 ? 'forward' : 'backward';
            const absDays = Math.abs(daysDiff);
            
            const successMsg = `Successfully moved ${summary.success} out of ${summary.total} issues ${absDays} working day(s) ${direction}.`;
            
            if (summary.failed > 0) {
                showSuccess(`${successMsg}\n${summary.failed} issues failed to update.`);
            } else {
                showSuccess(successMsg);
            }
            
            // Ẩn các element không cần thiết và hiển thị nút Close
            hideMoveElements();
            showCloseButton();
            
            // Hiển thị thông báo refresh
            const successElement = document.getElementById('success-message');
            successElement.innerHTML = successMsg + '<br><br><small style="color: #666;">Page will refresh automatically in 2 seconds...<br>Or click "Close" to refresh and close popup.</small>';
            
            // Refresh page sau 2 giây
            setTimeout(() => {
                console.log('Attempting to refresh page...');
                
                // Phương pháp 1: Lưu trạng thái để content script tự refresh
                chrome.storage.local.set({ 
                    shouldRefreshPage: true, 
                    refreshTime: Date.now(),
                    issueId: issueId 
                });
                
                // Phương pháp 2: Gửi message đến background script để reload tất cả tab Redmine
                chrome.runtime.sendMessage({
                    type: 'REFRESH_ALL_REDMINE_PAGES',
                    issueId: issueId
                }, (response) => {
                    console.log('Refresh response:', response);
                    if (response && response.ok) {
                        console.log(`Refreshed ${response.refreshedTabs} Redmine tabs`);
                        // Đóng popup sau khi refresh thành công
                        setTimeout(() => {
                            closeWindow();
                        }, 500);
                    } else {
                        // Nếu background refresh thất bại, thử phương pháp khác
                        try {
                            if (window.opener && !window.opener.closed) {
                                window.opener.location.reload();
                                console.log('Refreshed parent window via window.opener');
                                setTimeout(() => {
                                    closeWindow();
                                }, 500);
                            } else {
                                // Đóng popup sau 0.5 giây nếu không refresh được
                                setTimeout(() => {
                                    closeWindow();
                                }, 500);
                            }
                        } catch (error) {
                            console.log('Error with window.opener:', error);
                            setTimeout(() => {
                                closeWindow();
                            }, 500);
                        }
                    }
                });
            }, 500);
        } else {
            const errorMsg = response && response.error ? response.error : 'Unknown error occurred';
            showError(`Failed to move dates: ${errorMsg}`);
        }
        
    } catch (error) {
        showError('Failed to move dates: ' + error.message);
    } finally {
        showLoading(false);
    }
}

// Hiển thị lỗi
function showError(message) {
    const errorElement = document.getElementById('error-message');
    errorElement.textContent = message;
    errorElement.style.display = 'block';
    
    // Ẩn các message khác
    document.getElementById('success-message').style.display = 'none';
    document.getElementById('info-message').style.display = 'none';
    
    // Ẩn lỗi sau 5 giây
    setTimeout(() => {
        errorElement.style.display = 'none';
    }, 5000);
}

// Hiển thị thành công
function showSuccess(message) {
    const successElement = document.getElementById('success-message');
    successElement.textContent = message;
    successElement.style.display = 'block';
    
    // Ẩn các message khác
    document.getElementById('error-message').style.display = 'none';
    document.getElementById('info-message').style.display = 'none';
    
    // Ẩn preview
    document.getElementById('date-preview').style.display = 'none';
}

// Ẩn các element liên quan đến move
function hideMoveElements() {
    document.getElementById('target-date').style.display = 'none';
    document.getElementById('date-preview').style.display = 'none';
    document.getElementById('issue-info').style.display = 'none';
    document.getElementById('move-btn').style.display = 'none';
    document.getElementById('cancel-btn').style.display = 'none';
}

// Hiển thị nút Close
function showCloseButton() {
    document.getElementById('close-btn').style.display = 'block';
}

// Đóng popup với refresh
function closeWithRefresh() {
    console.log('Close button clicked, attempting to refresh...');
    
    // Thử refresh trước khi đóng
    let refreshAttempted = false;
    
    // Phương pháp 1: Gửi message đến background script để reload tất cả tab Redmine
    chrome.runtime.sendMessage({
        type: 'REFRESH_ALL_REDMINE_PAGES',
        issueId: issueId
    }, (response) => {
        console.log('Close refresh response:', response);
        if (response && response.ok) {
            console.log(`Refreshed ${response.refreshedTabs} Redmine tabs via background, closing popup`);
            closeWindow();
        } else {
            // Nếu background refresh thất bại, thử phương pháp khác
            try {
                if (window.opener && !window.opener.closed) {
                    window.opener.location.reload();
                    console.log('Refresh successful via window.opener, closing popup');
                    closeWindow();
                } else {
                    console.log('No refresh method available, closing popup anyway');
                    closeWindow();
                }
            } catch (error) {
                console.log('Error refreshing via window.opener:', error);
                closeWindow();
            }
        }
    });
    
    // Timeout fallback - đóng popup sau 0.5 giây nếu không có response
    setTimeout(() => {
        if (!refreshAttempted) {
            console.log('Refresh timeout, closing popup');
            closeWindow();
        }
    }, 500);
}

// Hiển thị/ẩn loading
function showLoading(show, message = 'Processing...') {
    const loadingElement = document.getElementById('loading');
    const loadingText = document.querySelector('.loading-text');
    const moveBtn = document.getElementById('move-btn');
    const cancelBtn = document.getElementById('cancel-btn');
    
    if (show) {
        loadingText.textContent = message;
        loadingElement.style.display = 'block';
        moveBtn.disabled = true;
        cancelBtn.disabled = true;
    } else {
        loadingElement.style.display = 'none';
        moveBtn.disabled = false;
        cancelBtn.disabled = false;
    }
}

// Đóng popup
function closeWindow() {
    window.close();
} 