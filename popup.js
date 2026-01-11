chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
  chrome.tabs.sendMessage(tabs[0].id, { action: "getState" }, (response) => {
    if (response && response.isInspecting) {
      document.getElementById("startInspect").style.display = "none";
      document.getElementById("stopInspect").style.display = "block";
    }
  });
});

document.getElementById("startInspect").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "startInspect" }, (response) => {
      if (chrome.runtime.lastError) {
        chrome.scripting.executeScript({
          target: { tabId: tabs[0].id },
          files: ["lib/dom-inspector.js", "content.js"],
        });
      }
    });
    document.getElementById("startInspect").style.display = "none";
    document.getElementById("stopInspect").style.display = "block";
  });
});

document.getElementById("stopInspect").addEventListener("click", () => {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    chrome.tabs.sendMessage(tabs[0].id, { action: "stopInspect" });
    document.getElementById("stopInspect").style.display = "none";
    document.getElementById("startInspect").style.display = "block";
    window.close();
  });
});