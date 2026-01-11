(function (global, factory) {
  typeof exports === "object" && typeof module !== "undefined"
    ? (module.exports = factory())
    : typeof define === "function" && define.amd
    ? define(factory)
    : ((global = global || self), (global.DomInspector = factory()));
})(this, function () {
  "use strict";

  function DomInspector(options) {
    this.options = Object.assign(
      {
        root: document.body,
        className: "dom-inspector",
        hover: true,
        exclude: [],
        labelClassName: "dom-inspector-label",
        theme: "default",
      },
      options
    );
    this.hoveredElement = null;
    this.overlay = this.createOverlay();
    this.label = this.createLabel();
    this.frozen = false;
    if (this.options.hover) {
      this.addHoverEvents();
    }
  }

  DomInspector.prototype = {
    enable: function () {
      document.body.appendChild(this.overlay);
      document.body.appendChild(this.label);
      this.enabled = true;
    },
    disable: function () {
      if (this.overlay.parentNode) this.overlay.parentNode.removeChild(this.overlay);
      if (this.label.parentNode) this.label.parentNode.removeChild(this.label);
      this.enabled = false;
      this.frozen = false;
    },
    createOverlay: function () {
      var overlay = document.createElement("div");
      overlay.className = this.options.className;
      overlay.style.cssText = "position:fixed;pointer-events:none;background:rgba(120,170,210,0.2);border:2px solid rgba(120,170,210,0.8);box-shadow:0 0 10px rgba(120,170,210,0.3);z-index:10000;transition:all 0.2s ease;";
      return overlay;
    },
    createLabel: function () {
      var label = document.createElement("div");
      label.className = this.options.labelClassName;
      label.style.cssText = "position:fixed;background:rgba(35,39,47,0.95);color:#fff;padding:8px;border-radius:4px;font-size:12px;z-index:10001;pointer-events:auto;";
      return label;
    },
    addHoverEvents: function () {
      document.addEventListener("mousemove", this.onMouseMove.bind(this));
    },
    onMouseMove: function (e) {
      if (!this.enabled || this.frozen) return;
      var target = e.target;
      if (target.closest("." + this.options.labelClassName)) return;
      if (this.shouldExclude(target)) return;
      this.hoveredElement = target;
      this.updateOverlay();
      this.updateLabel(e);
    },
    shouldExclude: function (element) {
      return this.options.exclude.some(function (selector) {
        return element.matches(selector);
      });
    },
    updateOverlay: function () {
      if (!this.hoveredElement) return;
      var rect = this.hoveredElement.getBoundingClientRect();
      this.overlay.style.top = rect.top + "px";
      this.overlay.style.left = rect.left + "px";
      this.overlay.style.width = rect.width + "px";
      this.overlay.style.height = rect.height + "px";
    },
    updateLabel: function (e) {
      if (!this.hoveredElement) return;
      var content = this.options.render ? this.options.render(this.hoveredElement) : this.defaultRender(this.hoveredElement);
      this.label.innerHTML = content;
      var labelRect = this.label.getBoundingClientRect();
      var x = e.clientX + 10;
      var y = e.clientY + 10;
      if (x + labelRect.width > window.innerWidth) x = window.innerWidth - labelRect.width - 10;
      if (y + labelRect.height > window.innerHeight) y = window.innerHeight - labelRect.height - 10;
      this.label.style.left = x + "px";
      this.label.style.top = y + "px";
    },
    defaultRender: function (element) {
      return "<div style='font-family:monospace;'>" + element.tagName.toLowerCase() + (element.id ? "#" + element.id : "") + (element.className ? "." + element.className.split(" ").join(".") : "") + "</div>";
    },
    toggleFrozen: function () {
      this.frozen = !this.frozen;
      if (this.frozen) {
        this.overlay.style.background = "rgba(120,170,210,0.3)";
        this.overlay.style.borderColor = "rgba(120,170,210,1)";
      } else {
        this.overlay.style.background = "rgba(120,170,210,0.2)";
        this.overlay.style.borderColor = "rgba(120,170,210,0.8)";
      }
    },
  };
  return DomInspector;
});