// 存储检查状态
let inspectingTabs = new Set();

// 监听标签页更新
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.status === 'complete' && inspectingTabs.has(tabId)) {
        chrome.tabs.sendMessage(tabId, { action: "startInspect" });
    }
});

// 监听来自content script的消息
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "updateInspectState") {
        if (request.isInspecting) {
            inspectingTabs.add(sender.tab.id);
        } else {
            inspectingTabs.delete(sender.tab.id);
        }
    }
    else if (request.action === "copyText") {
        try {
            navigator.clipboard.writeText(request.text).then(() => {
                sendResponse({ success: true });
            }).catch(err => {
                console.error('复制失败:', err);
                sendResponse({ success: false, error: err.message });
            });
            return true;
        } catch (err) {
            sendResponse({ success: false, error: err.message });
        }
    }
});

chrome.tabs.onRemoved.addListener((tabId) => {
    inspectingTabs.delete(tabId);
});

chrome.runtime.onInstalled.addListener(() => {
    chrome.scripting.registerContentScripts([{
        id: 'xpath-inspector',
        matches: ['<all_urls>'],
        js: ['lib/dom-inspector.js', 'content.js'],
        css: ['content.css'],
        runAt: 'document_end'
    }]).catch(err => {
        console.error('Failed to register content scripts:', err);
    });
});