let inspector = null;
let isInspecting = false;
let isTooltipVisible = true;
let isTrailEnabled = true;
let trailContainer = null;
let lastTrailTime = 0;
let trailCounter = 0;

document.addEventListener("keydown", handleKeyPress);

function initTrailCanvas() {
  if (trailContainer) return;
  trailContainer = document.createElement('div');
  trailContainer.id = 'mouse-trail-container';
  trailContainer.style.cssText = 'position:fixed!important;top:0!important;left:0!important;width:100vw!important;height:100vh!important;pointer-events:none!important;z-index:9999998!important;overflow:hidden!important;';
  document.body.appendChild(trailContainer);
}

function removeTrailCanvas() {
  if (trailContainer) { trailContainer.remove(); trailContainer = null; }
}

function getRainbowColor(progress) {
  return `hsl(${progress * 360}, 100%, 60%)`;
}

function createTrailDot(x, y) {
  if (!isTrailEnabled || !isInspecting || !trailContainer) return;
  const dot = document.createElement('div');
  dot.className = 'trail-dot';
  trailCounter = (trailCounter + 1) % 360;
  const color = getRainbowColor(trailCounter / 360);
  dot.style.cssText = `position:absolute!important;left:${x}px!important;top:${y}px!important;width:8px!important;height:8px!important;border-radius:50%!important;background:${color}!important;box-shadow:0 0 6px ${color},0 0 12px ${color}!important;transform:translate(-50%,-50%) scale(1)!important;pointer-events:none!important;animation:trailFadeOut 0.6s ease-out forwards!important;z-index:9999998!important;`;
  trailContainer.appendChild(dot);
  setTimeout(() => { if (dot.parentNode) dot.remove(); }, 600);
}

function addTrailPoint(x, y) {
  if (!isTrailEnabled || !isInspecting) return;
  const now = Date.now();
  if (now - lastTrailTime < 30) return;
  lastTrailTime = now;
  createTrailDot(x, y);
  if (trailContainer && trailContainer.children.length > 30) {
    const firstChild = trailContainer.firstChild;
    if (firstChild) firstChild.remove();
  }
}

function createInspector() {
  if (typeof DomInspector === "undefined") return;
  addCustomStyles();
  inspector = new DomInspector({
    root: document.body,
    theme: "chrome",
    excludes: [],
    overlay: true,
    labelClassName: "dom-inspector-wrapper",
    labelOptions: { pointerEvents: "all" },
    render: function(element) {
      const mouseX = window.mouseX || 0, mouseY = window.mouseY || 0;
      const mousePageX = window.mousePageX || 0, mousePageY = window.mousePageY || 0;
      const mouseOffsetX = window.mouseOffsetX || 0, mouseOffsetY = window.mouseOffsetY || 0;
      const xpaths = generateXPaths(element);
      const attributes = getAllAttributes(element);
      const text = element.textContent.trim();
      const tagName = element.tagName.toLowerCase();
      const preciseSelector = generatePreciseSelector(element);
      const selectorCount = document.querySelectorAll(preciseSelector).length;
      const xpathCounts = xpaths.map(xpath => {
        try {
          const realXpath = xpath.replace(/^x:/, '');
          return document.evaluate(realXpath, document, null, XPathResult.ORDERED_NODE_SNAPSHOT_TYPE, null).snapshotLength;
        } catch (e) { return 0; }
      });
      const elementRect = element.getBoundingClientRect();
      setTimeout(() => {
        const wrapper = document.querySelector(".dom-inspector-wrapper");
        if (wrapper) {
          wrapper.querySelectorAll(".copyable").forEach(el => {
            el.addEventListener("click", function(e) {
              e.preventDefault(); e.stopPropagation();
              const value = this.dataset.value;
              if (value) copyToClipboard(value, this);
            });
          });
        }
      }, 0);
      return `<div class="drag-handle"></div><div class="tooltip-content"><div class="tooltip-section position-info"><h4>位置信息</h4><div class="position-grid"><div class="position-item"><span class="position-label">视口坐标:</span><div class="copyable coordinate-value" data-value="x: ${mouseX}, y: ${mouseY}"><span class="coord-x">x: ${mouseX}</span><span class="coord-y">y: ${mouseY}</span></div></div><div class="position-item"><span class="position-label">页面坐标:</span><div class="copyable coordinate-value" data-value="x: ${mousePageX}, y: ${mousePageY}"><span class="coord-x">x: ${mousePageX}</span><span class="coord-y">y: ${mousePageY}</span></div></div><div class="position-item"><span class="position-label">相对元素坐标:</span><div class="copyable coordinate-value" data-value="x: ${mouseOffsetX}, y: ${mouseOffsetY}"><span class="coord-x">x: ${mouseOffsetX}</span><span class="coord-y">y: ${mouseOffsetY}</span></div></div><div class="position-item"><span class="position-label">目标元素位置:</span><div class="copyable coordinate-value" data-value="x: ${Math.round(elementRect.left)}, y: ${Math.round(elementRect.top)}"><span class="coord-x">x: ${Math.round(elementRect.left)}</span><span class="coord-y">y: ${Math.round(elementRect.top)}</span></div></div></div></div><div class="tooltip-section"><h4>标签名:</h4><div class="copyable" data-value="${tagName}">标签名: <span class="tag-highlight">${tagName}</span></div></div><div class="tooltip-section"><h4>CSS选择器:</h4><div class="match-count">(匹配 ${selectorCount} 个元素)</div><div class="copyable" data-value="${preciseSelector}">${preciseSelector}</div></div><div class="tooltip-section"><h4>XPath:</h4><div class="match-count">(匹配元素个数如下)</div>${xpaths.map((xpath, index) => `<div class="copyable" data-value="${escapeHtml(xpath)}">${escapeHtml(xpath)}<div class="match-count">(匹配 ${xpathCounts[index]} 个元素)</div></div>`).join("")}</div>${Object.keys(attributes).length > 0 ? `<div class="tooltip-section"><h4>属性列表:</h4>${Object.entries(attributes).map(([key, value]) => `<div class="copyable" data-value="${escapeHtml(key + "='" + value + "'")}"> ${escapeHtml(key)}='${escapeHtml(value)}'</div>`).join("")}</div>` : ""}${text ? `<div class="tooltip-section"><h4>文本内容:</h4><div class="copyable" data-value="${escapeHtml(text)}">${escapeHtml(text)}</div></div>` : ""}</div>`;
    },
  });
  document.addEventListener("keydown", handleKeyPress);
  addDragFeature();
}

function startInspecting() {
  if (!inspector) createInspector();
  inspector.enable();
  isInspecting = true;
  isTooltipVisible = true;
  if (isTrailEnabled) initTrailCanvas();
}

function stopInspecting() {
  if (inspector) { inspector.disable(); isInspecting = false; }
  removeTrailCanvas();
}

function handleKeyPress(e) {
  if (e.key === "z" || e.key === "Z") {
    e.preventDefault();
    if (isInspecting) {
      stopInspecting();
      chrome.runtime.sendMessage({ action: "updateInspectState", isInspecting: false });
    } else {
      startInspecting();
      chrome.runtime.sendMessage({ action: "updateInspectState", isInspecting: true });
    }
    return;
  }
  if (!isInspecting) return;
  if (e.key === "x" || e.key === "X") {
    e.preventDefault();
    if (inspector) {
      inspector.toggleFrozen();
      const wrapper = document.querySelector(".dom-inspector-wrapper");
      if (wrapper) wrapper.classList.toggle("frozen");
    }
  }
  if (e.key === "c" || e.key === "C") {
    e.preventDefault();
    const wrapper = document.querySelector(".dom-inspector-wrapper");
    if (wrapper) {
      isTooltipVisible = !isTooltipVisible;
      wrapper.style.display = isTooltipVisible ? "block" : "none";
    }
  }
  if (e.key === "t" || e.key === "T") {
    e.preventDefault();
    isTrailEnabled = !isTrailEnabled;
    if (isTrailEnabled && isInspecting) { initTrailCanvas(); showToast("轨迹已开启"); }
    else { removeTrailCanvas(); showToast("轨迹已关闭"); }
  }
}

function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'trail-toast';
  toast.textContent = message;
  toast.style.cssText = 'position:fixed!important;top:20px!important;right:20px!important;background:rgba(76,175,80,0.95)!important;color:white!important;padding:12px 20px!important;border-radius:6px!important;font-size:14px!important;z-index:10000001!important;box-shadow:0 4px 12px rgba(0,0,0,0.3)!important;animation:slideInRight 0.3s ease!important;pointer-events:none!important;';
  document.body.appendChild(toast);
  setTimeout(() => { toast.style.animation = 'slideOutRight 0.3s ease'; setTimeout(() => toast.remove(), 300); }, 2000);
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  switch (request.action) {
    case "startInspect": startInspecting(); chrome.runtime.sendMessage({ action: "updateInspectState", isInspecting: true }); break;
    case "stopInspect": stopInspecting(); chrome.runtime.sendMessage({ action: "updateInspectState", isInspecting: false }); break;
    case "getState": sendResponse({ isInspecting }); break;
  }
});

function addDragFeature() {
  let isDragging = false, currentX, currentY, initialX, initialY, xOffset = 0, yOffset = 0;
  document.addEventListener("mousedown", function(e) {
    const dragHandle = e.target.closest(".drag-handle");
    const wrapper = document.querySelector(".dom-inspector-wrapper");
    if (dragHandle && wrapper) {
      isDragging = true; wrapper.style.transition = "none";
      initialX = e.clientX - xOffset; initialY = e.clientY - yOffset;
      e.preventDefault();
    }
  });
  document.addEventListener("mousemove", function(e) {
    if (isDragging) {
      e.preventDefault();
      currentX = e.clientX - initialX; currentY = e.clientY - initialY;
      xOffset = currentX; yOffset = currentY;
      const wrapper = document.querySelector(".dom-inspector-wrapper");
      if (wrapper) {
        const rect = wrapper.getBoundingClientRect();
        const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
        if (currentX < 0) currentX = 0;
        if (currentX + rect.width > viewportWidth) currentX = viewportWidth - rect.width;
        if (currentY < 0) currentY = 0;
        if (currentY + rect.height > viewportHeight) currentY = viewportHeight - rect.height;
        wrapper.style.transform = `translate(${currentX}px, ${currentY}px)`;
      }
    }
  });
  document.addEventListener("mouseup", function() {
    isDragging = false;
    const wrapper = document.querySelector(".dom-inspector-wrapper");
    if (wrapper) wrapper.style.transition = "transform 0.2s ease";
  });
}

function generateXPaths(element) {
  const xpaths = [];
  if (element.id) xpaths.push(`x://${element.tagName.toLowerCase()}[@id="${element.id}"]`);
  if (element.className) xpaths.push(`x://${element.tagName.toLowerCase()}[@class="${element.className}"]`);
  const attributes = getAllAttributes(element);
  for (let attr in attributes) {
    if (attr !== "id" && attr !== "class" && attr !== "style") {
      xpaths.push(`x://${element.tagName.toLowerCase()}[@${attr}="${attributes[attr]}"]`);
    }
  }
  const text = element.textContent.trim();
  if (text && text.length < 50) {
    xpaths.push(`x://${element.tagName.toLowerCase()}[text()="${text}"]`);
    xpaths.push(`x://${element.tagName.toLowerCase()}[contains(text(), "${text}")]`);
  }
  let path = "", current = element;
  while (current && current !== document.body) {
    let tag = current.tagName.toLowerCase();
    let index = Array.from(current.parentNode.children).filter(child => child.tagName === current.tagName).indexOf(current) + 1;
    path = `/${tag}[${index}]${path}`;
    current = current.parentNode;
  }
  xpaths.push(`x:/html/body${path}`);
  return xpaths;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/'/g, '&#39;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function getAllAttributes(element) {
  const attributes = {};
  for (let attr of element.attributes) attributes[attr.name] = attr.value;
  return attributes;
}

function generatePreciseSelector(element) {
  if (element.id) return `#${element.id}`;
  const specialAttrs = ["name", "data-testid", "aria-label", "role"];
  for (const attr of specialAttrs) {
    if (element.getAttribute(attr)) return `${element.tagName.toLowerCase()}[${attr}="${element.getAttribute(attr)}"]`;
  }
  if (element.className) {
    const classes = element.className.split(" ").filter(cls => cls && !cls.includes("_") && cls.length < 20).slice(0, 2);
    if (classes.length > 0) return `${element.tagName.toLowerCase()}.${classes.join(".")}`;
  }
  let current = element, path = [], maxDepth = 3;
  while (current && current !== document.body && maxDepth > 0) {
    const parent = current.parentElement;
    if (!parent) break;
    if (parent.id) { path.unshift(`> ${current.tagName.toLowerCase()}`); path.unshift(`#${parent.id}`); return path.join(" "); }
    const siblings = Array.from(parent.children).filter(child => child.tagName === current.tagName);
    if (siblings.length === 1) path.unshift(`> ${current.tagName.toLowerCase()}`);
    else { const index = siblings.indexOf(current) + 1; path.unshift(`> ${current.tagName.toLowerCase()}:nth-of-type(${index})`); }
    current = parent; maxDepth--;
  }
  if (path.length === 0) return element.tagName.toLowerCase();
  return path.join(" ").replace(/^> /, "");
}

function addCustomStyles() {
  const style = document.createElement("style");
  style.textContent = `.dom-inspector-wrapper{pointer-events:auto!important;z-index:10000000!important}.copyable{cursor:pointer!important;pointer-events:auto!important;-webkit-user-select:text!important;user-select:text!important;padding:6px 8px!important;margin:4px 0!important;border-radius:4px!important;background:rgba(0,0,0,0.2)!important;transition:all 0.2s ease!important}.copyable:hover{background:rgba(100,181,246,0.1)!important;box-shadow:0 0 0 1px rgba(100,181,246,0.3)!important}.copyable:active{transform:scale(0.98)!important}`;
  document.head.appendChild(style);
}

function copyToClipboard(text, element) {
  const originalText = element.innerHTML;
  element.classList.add("copy-success");
  element.innerHTML = `<span class="copy-text">${text}</span><span class="copy-success-message"><span class="copy-checkmark">✓</span> 已复制</span>`;
  setTimeout(() => { element.classList.remove("copy-success"); element.innerHTML = originalText; }, 1500);
  if (navigator.clipboard && window.isSecureContext) {
    navigator.clipboard.writeText(text).catch(() => fallbackCopy(text));
  } else { fallbackCopy(text); }
}

function fallbackCopy(text) {
  const textarea = document.createElement("textarea");
  textarea.value = text; textarea.style.cssText = "position:fixed;opacity:0;";
  document.body.appendChild(textarea);
  try { textarea.select(); document.execCommand("copy"); } catch (err) { console.error("复制失败:", err); }
  finally { document.body.removeChild(textarea); }
}

document.addEventListener("mousemove", (e) => {
  const wrapper = document.querySelector(".dom-inspector-wrapper");
  if (wrapper && !inspector.frozen) {
    const rect = wrapper.getBoundingClientRect();
    const viewportWidth = window.innerWidth, viewportHeight = window.innerHeight;
    let x, y; const padding = 20, offset = 50;
    if (e.clientX > viewportWidth * 0.5) x = Math.max(padding, e.clientX - rect.width - offset);
    else x = Math.min(e.clientX + offset, viewportWidth - rect.width - padding);
    y = e.clientY - rect.height / 2;
    y = Math.max(padding, Math.min(y, viewportHeight - rect.height - padding));
    requestAnimationFrame(() => { wrapper.style.transform = `translate3d(${x}px, ${y}px, 0)`; });
  }
});

document.addEventListener("mousemove", (e) => {
  window.mouseX = e.clientX; window.mouseY = e.clientY;
  window.mousePageX = e.pageX; window.mousePageY = e.pageY;
  if (e.target) {
    const rect = e.target.getBoundingClientRect();
    window.mouseOffsetX = e.clientX - rect.left;
    window.mouseOffsetY = e.clientY - rect.top;
  }
  if (isInspecting && isTrailEnabled) addTrailPoint(e.clientX, e.clientY);
});