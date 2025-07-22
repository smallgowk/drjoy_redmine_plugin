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
    return false;
});