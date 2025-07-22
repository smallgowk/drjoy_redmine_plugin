(function() {
    // Lấy apiKey và issueId từ query string
    function getParam(name) {
        const url = new URL(window.location.href);
        return url.searchParams.get(name) || '';
    }
    var parentIssueId = getParam('issueId');
    var apiKey = getParam('apiKey');
    document.getElementById('pageTitle').textContent = 'Create Multi Tasks (Parent Issue: #' + parentIssueId + ')';
    var prefixOptions = [
        'Coding','Review','Study','Selftest','Crosstest','Investigate','Research','Document','C_PR','Self-test','CreateTcs','ReviewTcs','ShareViewPoint','TestFruit','TestDev','TestStg','TestMaster','BugFruit','BugDev','BugStg'
    ];
    function addTaskRow() {
        var tbody = document.getElementById('taskTableBody');
        var row = document.createElement('tr');
        var prefixOptionsHtml = prefixOptions.map(function(option, index) {
            return '<option value="' + option + '"' + (index === 0 ? ' selected' : '') + '>' + option + '</option>';
        }).join('');
        row.innerHTML = '<td class="col-prefix">' +
            '<select class="prefix-input">' + prefixOptionsHtml + '</select>' +
            '</td>' +
            '<td class="col-title"><input type="text" class="title-input" placeholder="Task title" required></td>' +
            '<td class="col-date"><input type="date" class="start-date-input"></td>' +
            '<td class="col-date"><input type="date" class="end-date-input"></td>' +
            '<td class="col-estimate"><input type="number" class="estimate-input" placeholder="Hours" min="0" step="0.5"></td>' +
            '<td class="col-action"><button class="remove-btn" onclick="removeRow(this)">Remove</button></td>';
        tbody.appendChild(row);
    }
    window.removeRow = function(button) {
        var tbody = document.getElementById('taskTableBody');
        if (tbody.children.length > 1) {
            button.closest('tr').remove();
        } else {
            showStatus('Must have at least 1 task', 'error');
        }
    };
    function showStatus(message, type) {
        var status = document.getElementById('status');
        status.textContent = message;
        status.className = 'status ' + type;
        status.style.display = 'block';
        setTimeout(function() {
            status.style.display = 'none';
        }, 5000);
    }
    // Hàm gọi background để fetch Redmine API
    function redmineApiRequest(url, method, body) {
        return new Promise(function(resolve) {
            chrome.runtime.sendMessage({
                type: 'REDMINE_API_REQUEST',
                url: url,
                method: method || 'GET',
                apiKey: apiKey,
                body: body
            }, function(response) {
                if (chrome.runtime.lastError) {
                    resolve({ ok: false, error: chrome.runtime.lastError.message });
                } else {
                    resolve(response);
                }
            });
        });
    }
    function getCustomField(issue, id) {
        if (!issue.custom_fields) return {};
        return issue.custom_fields.find(function(f) { return f.id == id; }) || {};
    }
    async function createTicketImpl(issue) {
        var updateData = { issue: issue };
        var res = await redmineApiRequest('https://redmine.famishare.jp/issues.json', 'POST', updateData);
        if (res && res.ok && res.data && res.data.issue) {
            return res.data.issue;
        } else {
            return null;
        }
    }
    async function createTasks() {
        var rows = document.querySelectorAll('#taskTableBody tr');
        var tasks = [];
        var hasEmptyTitle = false;
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var prefix = row.querySelector('.prefix-input').value.trim();
            var title = row.querySelector('.title-input').value.trim();
            var startDate = row.querySelector('.start-date-input').value;
            var endDate = row.querySelector('.end-date-input').value;
            var estimate = row.querySelector('.estimate-input').value;
            if (!title) { hasEmptyTitle = true; }
            tasks.push({ prefix: prefix, subject: title, start_date: startDate, due_date: endDate, estimate: estimate });
        }
        if (hasEmptyTitle) {
            showStatus('Title must not be empty', 'error');
            return;
        }
        // Lấy thông tin ticket cha qua background
        var parentRes = await redmineApiRequest('https://redmine.famishare.jp/issues/' + parentIssueId + '.json', 'GET');
        console.log('parentRes', parentRes);
        if (!parentRes || !parentRes.ok || !parentRes.data || typeof parentRes.data.issue !== 'object') {
            showStatus('Could not fetch parent ticket info', 'error');
            if (parentRes && parentRes.data) {
                console.error('Parent ticket API response:', parentRes.data);
            }
            return;
        }
        var parentIssue = parentRes.data.issue;
        var listNewIssues = [];
        for (var i = 0; i < tasks.length; i++) {
            var data = tasks[i];
            var newIssue = {};
            newIssue['subject'] = '[' + data.prefix + ']' + data.subject;
            newIssue['estimated_hours'] = data.estimate ? parseFloat(data.estimate) : null;
            newIssue['start_date'] = data.start_date || null;
            newIssue['due_date'] = data.due_date || null;
            newIssue['assigned_to_id'] = parentIssue.assigned_to ? parentIssue.assigned_to.id : null;
            newIssue['project_id'] = parentIssue.project.id;
            newIssue['parent_issue_id'] = parentIssue.id;
            newIssue['fixed_version_id'] = parentIssue.fixed_version ? parentIssue.fixed_version.id : null;
            newIssue['tracker_id'] = '7';
            var feature = getCustomField(parentIssue, 37);
            var classification = getCustomField(parentIssue, 97);
            var assignTeam = getCustomField(parentIssue, 86);
            newIssue['custom_fields'] = [
                { "id": 37, "name": feature.name, "multiple": feature.multiple, "value": feature.value },
                { "id": 97, "name": classification.name, "value": classification.value },
                { "id": 86, "name": assignTeam.name, "value": assignTeam.value }
            ];
            var created = await createTicketImpl(newIssue);
            if (created) listNewIssues.push(created);
        }
        var msg = 'Created ' + listNewIssues.length + ' sub task' + (listNewIssues.length === 1 ? '' : 's') + '!';
        showStatus(msg, 'success');
    }
    document.getElementById('addRow').addEventListener('click', addTaskRow);
    document.getElementById('createTasks').addEventListener('click', createTasks);
    addTaskRow();
})(); 