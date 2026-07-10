/**
 * Free Canvas Card for Home Assistant
 * =====================================
 * A freeform canvas Lovelace card. Place any HA cards on it at arbitrary
 * positions (no grid, no snap). Drag to move, corner handle to resize,
 * top handle to rotate by any angle. Layout persists to localStorage.
 *
 * Vanilla JS — no Lit, no bundler, no dependencies.
 *
 * MIT License — (c) 2026 Mallory
 */

(function () {
  "use strict";

  const STORAGE_PREFIX = "free-canvas-";

  // Minimal CSS as a string
  const STYLES = `
    :host { display: block; position: relative; }
    .fc-toolbar {
      display: flex; gap: 8px; padding: 10px 14px; flex-wrap: wrap;
      background: var(--card-background-color, var(--ha-card-background, #1c1c1c));
      border-radius: 12px 12px 0 0; align-items: center;
    }
    .fc-toolbar button {
      background: var(--primary-color, #03a9f4); color: var(--text-primary-color, #fff);
      border: none; border-radius: 6px; padding: 8px 16px; cursor: pointer;
      font-size: 14px; font-weight: 500; transition: filter 0.15s;
    }
    .fc-toolbar button:hover { filter: brightness(1.15); }
    .fc-toolbar button.fc-secondary {
      background: var(--secondary-background-color, #2a2a2a);
      color: var(--primary-text-color, #fff);
    }
    .fc-toolbar button.fc-danger { background: var(--error-color, #db4437); }
    .fc-toolbar .fc-spacer { flex: 1; }
    .fc-toolbar .fc-hint { font-size: 12px; color: var(--secondary-text-color, #888); }
    .fc-canvas {
      position: relative;
      background: var(--card-background-color, var(--ha-card-background, #1c1c1c));
      border-radius: 0 0 12px 12px; overflow: auto;
    }
    .fc-canvas.fc-editing { overflow: auto; touch-action: none; }
    .fc-item { position: absolute; box-sizing: border-box; transition: none; }
    .fc-item-body { width: 100%; height: 100%; overflow: hidden; border-radius: 8px; }
    .fc-item-body > * { --ha-card-border-radius: 8px; }
    .fc-drag-overlay {
      position: absolute; inset: 0; cursor: move; z-index: 5; touch-action: none;
    }
    .fc-item.fc-selected {
      outline: 2px solid var(--primary-color, #03a9f4); outline-offset: 3px;
    }
    .fc-item.fc-editing:not(.fc-selected) {
      outline: 1px dashed rgba(128,128,128,0.4); outline-offset: 1px;
    }
    .fc-handle {
      position: absolute; width: 18px; height: 18px; border-radius: 50%;
      z-index: 20; touch-action: none; display: flex; align-items: center;
      justify-content: center; font-size: 10px; font-weight: bold; color: #fff;
      user-select: none;
    }
    .fc-handle.fc-resize {
      bottom: -9px; right: -9px; background: var(--primary-color, #03a9f4);
      border: 2px solid var(--card-background-color, #fff); cursor: nwse-resize;
    }
    .fc-handle.fc-rotate {
      top: -32px; left: 50%; transform: translateX(-50%);
      background: var(--primary-color, #03a9f4);
      border: 2px solid var(--card-background-color, #fff); cursor: grab;
    }
    .fc-handle.fc-rotate:active { cursor: grabbing; }
    .fc-rotate-line {
      position: absolute; top: -14px; left: 50%; width: 2px; height: 14px;
      background: var(--primary-color, #03a9f4); transform: translateX(-50%);
      z-index: 19; pointer-events: none;
    }
    .fc-handle.fc-delete {
      top: -10px; right: -10px; background: var(--error-color, #db4437);
      border: 2px solid var(--card-background-color, #fff); cursor: pointer;
    }
    .fc-handle.fc-edit {
      top: -10px; left: -10px; background: var(--secondary-background-color, #555);
      border: 2px solid var(--card-background-color, #fff); cursor: pointer;
    }
    .fc-rotate-badge {
      position: absolute; top: -58px; left: 50%; transform: translateX(-50%);
      background: var(--primary-color, #03a9f4); color: #fff; font-size: 12px;
      padding: 3px 8px; border-radius: 4px; white-space: nowrap; z-index: 25;
      pointer-events: none; font-weight: 600;
    }
    .fc-edit-toggle {
      position: absolute; top: 8px; right: 8px; z-index: 100;
      background: rgba(0,0,0,0.4); border: 1px solid rgba(255,255,255,0.15);
      border-radius: 50%; width: 36px; height: 36px;
      display: flex; align-items: center; justify-content: center;
      cursor: pointer; font-size: 16px; color: var(--primary-text-color, #fff);
      backdrop-filter: blur(4px); opacity: 0.3; transition: opacity 0.2s;
    }
    .fc-edit-toggle:hover { opacity: 1; }
    .fc-dialog-overlay {
      position: fixed; inset: 0; background: rgba(0,0,0,0.6); z-index: 99999;
      display: flex; align-items: center; justify-content: center;
    }
    .fc-dialog {
      background: var(--card-background-color, var(--ha-card-background, #1c1c1c));
      border-radius: 12px; padding: 24px; max-width: 650px; width: 90%;
      max-height: 85vh; overflow: auto; color: var(--primary-text-color, #fff);
    }
    .fc-dialog h3 { margin: 0 0 8px 0; color: var(--primary-text-color, #fff); }
    .fc-dialog p { color: var(--secondary-text-color, #888); font-size: 13px; margin: 0 0 12px 0; }
    .fc-dialog textarea {
      width: 100%; height: 240px; font-family: monospace; font-size: 13px;
      background: var(--secondary-background-color, #111);
      color: var(--primary-text-color, #fff);
      border: 1px solid var(--divider-color, #444); border-radius: 8px;
      padding: 14px; box-sizing: border-box; resize: vertical; line-height: 1.5;
    }
    .fc-dialog textarea:focus { outline: 2px solid var(--primary-color, #03a9f4); }
    .fc-dialog-buttons { display: flex; gap: 8px; margin-top: 16px; justify-content: flex-end; }
    .fc-empty {
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      height: 100%; min-height: 300px; color: var(--secondary-text-color, #888); gap: 12px;
    }
    .fc-empty button {
      background: var(--primary-color, #03a9f4); color: #fff; border: none;
      border-radius: 8px; padding: 12px 24px; cursor: pointer; font-size: 16px;
    }
  `;

  class FreeCanvasCard extends HTMLElement {
    constructor() {
      super();
      this._items = [];
      this._editing = false;
      this._selectedId = null;
      this._showDialog = false;
      this._dialogMode = "add";
      this._editingItemId = null;
      this._cardConfigText = "";
      this._activeDrag = null;
      this._helpers = null;
      this._cardElements = new Map();
      this._storageKey = "default";
      this._canvasHeight = 500;
      this._hass = null;
      this._config = null;

      // Attach shadow DOM
      const shadow = this.attachShadow({ mode: "open" });
      const style = document.createElement("style");
      style.textContent = STYLES;
      shadow.appendChild(style);

      // Main containers
      this._toolbarEl = null;
      this._canvasEl = null;
      this._dialogEl = null;
      this._toggleEl = null;
      this._container = document.createElement("div");
      shadow.appendChild(this._container);
    }

    // ---- HA lifecycle ----

    setConfig(config) {
      if (!config) return;
      this._config = config;
      this._storageKey = config.storage_key || "default";
      this._canvasHeight = config.height || 500;

      const saved = this._loadLayout();
      if (saved && saved.length > 0) {
        this._items = saved;
      } else if (config.cards && Array.isArray(config.cards) && config.cards.length > 0) {
        this._items = config.cards.map((c, i) => ({
          id: "card_" + Date.now() + "_" + i,
          x: c.x || 20 + i * 40,
          y: c.y || 20 + i * 30,
          w: c.w || 320,
          h: c.h || 220,
          rotation: c.rotation || 0,
          card: c.card || c,
        }));
      }
      this._render();
    }

    set hass(hass) {
      this._hass = hass;
      this._cardElements.forEach(function (el) { el.hass = hass; });
    }
    get hass() { return this._hass; }

    getCardSize() {
      return Math.ceil(this._canvasHeight / 50);
    }

    // ---- Persistence ----

    _loadLayout() {
      try {
        var raw = localStorage.getItem(STORAGE_PREFIX + this._storageKey);
        if (raw) return JSON.parse(raw);
      } catch (e) {
        console.error("[FreeCanvas] load failed:", e);
      }
      return null;
    }

    _saveLayout() {
      try {
        var data = this._items.map(function (i) {
          return { id: i.id, x: i.x, y: i.y, w: i.w, h: i.h, rotation: i.rotation, card: i.card };
        });
        localStorage.setItem(STORAGE_PREFIX + this._storageKey, JSON.stringify(data));
      } catch (e) {
        console.error("[FreeCanvas] save failed:", e);
      }
    }

    // ---- Card element creation ----

    _getHelpers() {
      var self = this;
      if (self._helpers) return Promise.resolve(self._helpers);
      return new Promise(function (resolve, reject) {
        var attempts = 0;
        function check() {
          if (window.loadCardHelpers) {
            window.loadCardHelpers().then(function (h) {
              self._helpers = h;
              resolve(h);
            }).catch(reject);
          } else if (attempts < 50) {
            attempts++;
            setTimeout(check, 100);
          } else {
            reject(new Error("loadCardHelpers not available"));
          }
        }
        check();
      });
    }

    _createCardElement(cardConfig) {
      var self = this;
      return self._getHelpers().then(function (helpers) {
        var cfg = typeof cardConfig === "string" ? JSON.parse(cardConfig) : cardConfig;
        var el = helpers.createCardElement(cfg);
        el.hass = self._hass;
        return el;
      });
    }

    _attachCardElement(item) {
      var self = this;
      if (self._cardElements.has(item.id)) {
        self._reattachDom(item.id);
        return Promise.resolve();
      }
      return self._createCardElement(item.card).then(function (el) {
        self._cardElements.set(item.id, el);
        self._reattachDom(item.id);
      }).catch(function (e) {
        console.error("[FreeCanvas] card creation failed:", e);
      });
    }

    _reattachDom(itemId) {
      var el = this._cardElements.get(itemId);
      var body = this.shadowRoot.getElementById("fc-body-" + itemId);
      if (el && body && !body.contains(el)) {
        body.innerHTML = "";
        body.appendChild(el);
      }
    }

    // ---- Edit mode ----

    _toggleEdit() {
      this._editing = !this._editing;
      this._selectedId = null;
      this._render();
    }

    _selectItem(id, ev) {
      if (!this._editing) return;
      if (ev) ev.stopPropagation();
      this._selectedId = id;
      this._render();
    }

    _onCanvasClick(ev) {
      if (this._editing && ev.target === this._canvasEl) {
        this._selectedId = null;
        this._render();
      }
    }

    // ---- HA native card picker ----

    _fireEvent(node, type, detail, options) {
      options = options || {};
      var event = new CustomEvent(type, {
        detail: detail,
        bubbles: options.bubbles !== undefined ? options.bubbles : true,
        cancelable: options.cancelable !== undefined ? options.cancelable : true,
        composed: options.composed !== undefined ? options.composed : true,
      });
      node.dispatchEvent(event);
    }

    _openHACardPicker() {
      var self = this;
      // Build a list of available card types from HA's registered customCards
      // and built-in cards
      var builtInCards = [
        { type: "entities", name: "Entities", description: "List of entities" },
        { type: "gauge", name: "Gauge", description: "Single value gauge" },
        { type: "sensor", name: "Sensor", description: "Simple sensor card" },
        { type: "picture", name: "Picture", description: "Image card" },
        { type: "picture-entity", name: "Picture Entity", description: "Image from entity" },
        { type: "picture-glance", name: "Picture Glance", description: "Image with entity icons" },
        { type: "picture-elements", name: "Picture Elements", description: "Image with overlays" },
        { type: "thermostat", name: "Thermostat", description: "Climate control" },
        { type: "history-graph", name: "History Graph", description: "History chart" },
        { type: "statistics-graph", name: "Statistics Graph", description: "Statistics chart" },
        { type: "markdown", name: "Markdown", description: "Rich text card" },
        { type: "horizontal-stack", name: "Horizontal Stack", description: "Stack cards horizontally" },
        { type: "vertical-stack", name: "Vertical Stack", description: "Stack cards vertically" },
        { type: "grid", name: "Grid", description: "Grid layout" },
        { type: "conditional", name: "Conditional", description: "Show based on conditions" },
        { type: "button", name: "Button", description: "Action button" },
        { type: "iframe", name: "iFrame", description: "Embed webpage" },
        { type: "map", name: "Map", description: "Map with zones" },
        { type: "light", name: "Light", description: "Light control" },
        { type: "media-control", name: "Media Control", description: "Media player control" },
        { type: "alarm-panel", name: "Alarm Panel", description: "Alarm control" },
        { type: "climate", name: "Climate", description: "Climate control" },
        { type: "cover", name: "Cover", description: "Blind/cover control" },
        { type: "fan", name: "Fan", description: "Fan control" },
        { type: "humidifier", name: "Humidifier", description: "Humidifier control" },
        { type: "water-heater", name: "Water Heater", description: "Water heater control" },
        { type: "lock", name: "Lock", description: "Lock control" },
        { type: "vacuum", name: "Vacuum", description: "Vacuum control" },
        { type: "lawn-mower", name: "Lawn Mower", description: "Lawn mower control" },
        { type: "logbook", name: "Logbook", description: "Activity log" },
        { type: "glance", name: "Glance", description: "Compact entity list" },
        { type: "tile", name: "Tile", description: "Tile card" },
        { type: "heading", name: "Heading", description: "Section heading" },
      ];

      // Add custom cards from window.customCards
      var customCards = [];
      if (window.customCards) {
        customCards = window.customCards.map(function (c) {
          return { type: c.type, name: c.name, description: c.description || "Custom card", custom: true };
        });
      }

      // Merge and deduplicate
      var allCards = builtInCards.concat(customCards);
      var seen = {};
      allCards = allCards.filter(function (c) {
        if (seen[c.type]) return false;
        seen[c.type] = true;
        return true;
      });

      self._showCardPicker(allCards);
    }

    _showCardPicker(cards) {
      var self = this;
      var root = self._container;

      // Build the picker overlay
      var overlay = document.createElement("div");
      overlay.className = "fc-dialog-overlay";

      var dialog = document.createElement("div");
      dialog.className = "fc-dialog";
      dialog.style.maxWidth = "700px";

      var title = document.createElement("h3");
      title.textContent = "Pick a Card";
      title.style.margin = "0 0 12px 0";
      dialog.appendChild(title);

      var search = document.createElement("input");
      search.type = "text";
      search.placeholder = "Search cards...";
      search.style.cssText = "width:100%;box-sizing:border-box;padding:10px 14px;margin-bottom:14px;border-radius:8px;border:1px solid var(--divider-color,#444);background:var(--secondary-background-color,#111);color:var(--primary-text-color,#fff);font-size:14px;";
      dialog.appendChild(search);

      var grid = document.createElement("div");
      grid.style.cssText = "display:grid;grid-template-columns:repeat(auto-fill,minmax(180px,1fr));gap:8px;max-height:400px;overflow-y:auto;";
      dialog.appendChild(grid);

      function renderCards(filter) {
        grid.innerHTML = "";
        cards.forEach(function (c) {
          if (filter && c.name.toLowerCase().indexOf(filter.toLowerCase()) === -1 && c.type.toLowerCase().indexOf(filter.toLowerCase()) === -1) return;
          var card = document.createElement("div");
          card.style.cssText = "padding:12px;border-radius:8px;cursor:pointer;border:1px solid var(--divider-color,#444);background:var(--secondary-background-color,#1a1a1a);transition:background 0.15s;";
          card.onmouseenter = function () { card.style.background = "var(--primary-color,#03a9f4)"; card.style.opacity = "0.8"; };
          card.onmouseleave = function () { card.style.background = "var(--secondary-background-color,#1a1a1a)"; card.style.opacity = "1"; };
          card.innerHTML =
            '<div style="font-weight:600;font-size:14px;margin-bottom:4px;">' + c.name + '</div>' +
            '<div style="font-size:11px;color:var(--secondary-text-color,#888);">' + c.description + '</div>' +
            '<div style="font-size:10px;color:var(--secondary-text-color,#555);margin-top:4px;font-family:monospace;">' + c.type + '</div>' +
            (c.custom ? '<div style="font-size:9px;color:var(--primary-color,#03a9f4);margin-top:2px;">CUSTOM</div>' : '');
          card.onclick = function () {
            overlay.remove();
            // Create a default config for this card type
            var config = { type: c.type };
            if (c.type === "entities") config.entities = [];
            if (c.type === "gauge") { config.entity = ""; config.min = 0; config.max = 100; }
            if (c.type === "sensor") config.entity = "";
            if (c.type === "markdown") config.content = "# Markdown\nEdit this text";
            if (c.type === "button") { config.entity = ""; config.name = ""; }
            if (c.type === "iframe") config.url = "https://example.com";
            if (c.type === "picture") config.image = "https://example.com/image.png";
            if (c.type === "history-graph") { config.entities = []; config.hours_to_show = 24; }
            if (c.type === "horizontal-stack" || c.type === "vertical-stack" || c.type === "grid") config.cards = [];
            if (c.type === "conditional") { config.conditions = []; config.card = {}; };
            if (c.type === "glance") config.entities = [];
            if (c.type === "tile") config.entity = "";
            if (c.type === "logbook") { config.entities = []; };
            // Now open the JSON editor with this default config
            self._dialogMode = "add";
            self._editingItemId = null;
            self._cardConfigText = JSON.stringify(config, null, 2);
            self._showDialog = true;
            self._render();
          };
          grid.appendChild(card);
        });
      }
      renderCards("");

      search.addEventListener("input", function (e) { renderCards(e.target.value); });
      search.focus();

      overlay.addEventListener("pointerdown", function (e) {
        if (e.target === overlay) overlay.remove();
      });

      var buttons = document.createElement("div");
      buttons.className = "fc-dialog-buttons";
      var cancelBtn = document.createElement("button");
      cancelBtn.className = "fc-secondary";
      cancelBtn.textContent = "Cancel";
      cancelBtn.onclick = function () { overlay.remove(); };
      buttons.appendChild(cancelBtn);
      dialog.appendChild(buttons);

      overlay.appendChild(dialog);
      root.appendChild(overlay);
    }

    // ---- Add / Edit / Delete ----

    _openAddDialog() {
      // Try HA native card picker first; fall back to JSON dialog
      var self = this;
      try {
        self._openHACardPicker();
      } catch (e) {
        console.warn("[FreeCanvas] HA card picker failed, falling back to JSON:", e);
        self._openAddDialogJSON();
      }
    }

    _openAddDialogJSON() {
      var self = this;
      self._dialogMode = "add";
      self._editingItemId = null;
      self._cardConfigText = JSON.stringify({
        type: "entities",
        title: "New Card",
        entities: ["sensor.tp350s_a6e2_temperature"],
      }, null, 2);
      self._showDialog = true;
      self._render();
    }

    _openEditDialog(item) {
      this._dialogMode = "edit";
      this._editingItemId = item.id;
      this._cardConfigText = JSON.stringify(item.card, null, 2);
      this._showDialog = true;
      this._render();
    }

    _closeDialog() {
      this._showDialog = false;
      this._editingItemId = null;
      this._cardConfigText = "";
      this._render();
    }

    _confirmDialog() {
      var self = this;
      var config;
      try {
        config = JSON.parse(self._cardConfigText);
      } catch (e) {
        // Try YAML as fallback
        if (window.jsyaml) {
          try {
            config = window.jsyaml.load(self._cardConfigText);
          } catch (e2) {
            alert("Invalid JSON/YAML: " + e2.message);
            return;
          }
        } else {
          alert("Invalid JSON: " + e.message);
          return;
        }
        if (!config) {
          alert("Could not parse config.");
          return;
        }
      }

      if (self._dialogMode === "edit" && self._editingItemId) {
        var id = self._editingItemId;
        self._updateItem(id, { card: config });
        self._cardElements.delete(id);
        self._saveLayout();
        self._render();
        var item = self._items.find(function (i) { return i.id === id; });
        if (item) self._attachCardElement(item);
      } else {
        self._addItem(config);
      }
      self._showDialog = false;
      self._editingItemId = null;
      self._cardConfigText = "";
      self._render();
    }

    _addItem(cardConfig) {
      var self = this;
      var id = "card_" + Date.now() + "_" + Math.random().toString(36).slice(2, 6);
      var offset = self._items.length * 30;
      var item = {
        id: id,
        x: 20 + offset,
        y: 20 + offset,
        w: 320,
        h: 220,
        rotation: 0,
        card: cardConfig,
      };
      self._items = self._items.concat([item]);
      self._saveLayout();
      self._render();
      self._attachCardElement(item);
    }

    _deleteItem(id) {
      var self = this;
      self._items = self._items.filter(function (i) { return i.id !== id; });
      var el = self._cardElements.get(id);
      if (el && el.remove) el.remove();
      self._cardElements.delete(id);
      if (self._selectedId === id) self._selectedId = null;
      self._saveLayout();
      self._render();
    }

    _updateItem(id, changes) {
      this._items = this._items.map(function (i) {
        if (i.id === id) {
          var updated = {};
          for (var k in i) updated[k] = i[k];
          for (var k2 in changes) updated[k2] = changes[k2];
          return updated;
        }
        return i;
      });
    }

    // ---- Drag ----

    _onDragStart(ev, item) {
      var self = this;
      if (!self._editing) return;
      ev.preventDefault();
      ev.stopPropagation();
      self._selectedId = item.id;
      self._activeDrag = "drag";
      self._render();

      var startX = ev.clientX;
      var startY = ev.clientY;
      var origX = item.x;
      var origY = item.y;

      function onMove(e) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        self._updateItem(item.id, {
          x: Math.round(origX + dx),
          y: Math.round(origY + dy),
        });
        self._updateItemDom(item.id);
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        self._activeDrag = null;
        self._saveLayout();
        self._render();
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }

    // ---- Resize ----

    _onResizeStart(ev, item) {
      var self = this;
      if (!self._editing) return;
      ev.preventDefault();
      ev.stopPropagation();
      self._selectedId = item.id;
      self._activeDrag = "resize";
      self._render();

      var startX = ev.clientX;
      var startY = ev.clientY;
      var origW = item.w;
      var origH = item.h;

      function onMove(e) {
        var dx = e.clientX - startX;
        var dy = e.clientY - startY;
        self._updateItem(item.id, {
          w: Math.max(80, Math.round(origW + dx)),
          h: Math.max(60, Math.round(origH + dy)),
        });
        self._updateItemDom(item.id);
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        self._activeDrag = null;
        self._saveLayout();
        self._render();
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }

    // ---- Rotate ----

    _onRotateStart(ev, item) {
      var self = this;
      if (!self._editing) return;
      ev.preventDefault();
      ev.stopPropagation();
      self._selectedId = item.id;
      self._activeDrag = "rotate";
      self._render();

      var cardEl = self.shadowRoot.getElementById("fc-item-" + item.id);
      var rect = cardEl.getBoundingClientRect();
      var cx = rect.left + rect.width / 2;
      var cy = rect.top + rect.height / 2;

      function onMove(e) {
        var dx = e.clientX - cx;
        var dy = e.clientY - cy;
        var angle = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
        if (angle < 0) angle += 360;
        if (angle >= 360) angle -= 360;
        if (e.shiftKey) angle = Math.round(angle / 15) * 15;
        self._updateItem(item.id, { rotation: Math.round(angle) });
        self._updateItemDom(item.id);

        // Update badge
        var badge = self.shadowRoot.querySelector(".fc-rotate-badge");
        if (badge) badge.textContent = Math.round(angle) + "\u00b0";
      }
      function onUp() {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup", onUp);
        self._activeDrag = null;
        self._saveLayout();
        self._render();
      }
      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup", onUp);
    }

    // ---- Export / Import ----

    _exportLayout() {
      var data = JSON.stringify(this._items, null, 2);
      var blob = new Blob([data], { type: "application/json" });
      var url = URL.createObjectURL(blob);
      var a = document.createElement("a");
      a.href = url;
      a.download = "free-canvas-" + this._storageKey + ".json";
      a.click();
      URL.revokeObjectURL(url);
    }

    _importLayout() {
      var self = this;
      var input = document.createElement("input");
      input.type = "file";
      input.accept = "application/json";
      input.onchange = function (e) {
        var file = e.target.files && e.target.files[0];
        if (!file) return;
        var reader = new FileReader();
        reader.onload = function (ev) {
          try {
            var data = JSON.parse(ev.target.result);
            if (!Array.isArray(data)) throw new Error("Expected an array");
            self._cardElements.forEach(function (el) { if (el.remove) el.remove(); });
            self._cardElements.clear();
            self._items = data;
            self._saveLayout();
            self._render();
            self._items.forEach(function (item) { self._attachCardElement(item); });
          } catch (err) {
            alert("Import failed: " + err.message);
          }
        };
        reader.readAsText(file);
      };
      input.click();
    }

    _resetLayout() {
      var self = this;
      if (!confirm("Remove all cards? This cannot be undone.")) return;
      self._cardElements.forEach(function (el) { if (el.remove) el.remove(); });
      self._cardElements.clear();
      self._items = [];
      self._selectedId = null;
      self._saveLayout();
      self._render();
    }

    // ---- DOM updates without full re-render (during drag) ----

    _updateItemDom(id) {
      var item = this._items.find(function (i) { return i.id === id; });
      if (!item) return;
      var el = this.shadowRoot.getElementById("fc-item-" + id);
      if (el) {
        el.style.left = item.x + "px";
        el.style.top = item.y + "px";
        el.style.width = item.w + "px";
        el.style.height = item.h + "px";
        el.style.transform = "rotate(" + item.rotation + "deg)";
      }
    }

    // ---- Full render ----

    _render() {
      var self = this;
      var root = self._container;
      root.innerHTML = "";

      // Toolbar / edit toggle
      if (self._editing) {
        var toolbar = document.createElement("div");
        toolbar.className = "fc-toolbar";
        toolbar.innerHTML =
          '<button id="fc-btn-add">+ Add Card</button>' +
          '<button class="fc-secondary" id="fc-btn-add-json">+ Add (JSON)</button>' +
          '<button class="fc-secondary" id="fc-btn-export">Export</button>' +
          '<button class="fc-secondary" id="fc-btn-import">Import</button>' +
          '<button class="fc-danger" id="fc-btn-reset">Reset</button>' +
          '<div class="fc-spacer"></div>' +
          '<span class="fc-hint">' + (self._activeDrag === "rotate" ? "Shift = snap 15\u00b0" : "Drag=move \u00b7 Corner=resize \u00b7 Top=rotate \u00b7 Dbl-click=edit") + '</span>' +
          '<button class="fc-secondary" id="fc-btn-done">Done</button>';
        root.appendChild(toolbar);

        toolbar.querySelector("#fc-btn-add").onclick = function () { self._openAddDialog(); };
        toolbar.querySelector("#fc-btn-add-json").onclick = function () { self._openAddDialogJSON(); };
        toolbar.querySelector("#fc-btn-export").onclick = function () { self._exportLayout(); };
        toolbar.querySelector("#fc-btn-import").onclick = function () { self._importLayout(); };
        toolbar.querySelector("#fc-btn-reset").onclick = function () { self._resetLayout(); };
        toolbar.querySelector("#fc-btn-done").onclick = function () { self._toggleEdit(); };
      } else {
        var toggle = document.createElement("div");
        toggle.className = "fc-edit-toggle";
        toggle.textContent = "\u270e";
        toggle.title = "Edit layout";
        toggle.onclick = function () { self._toggleEdit(); };
        root.appendChild(toggle);
      }

      // Canvas
      var canvas = document.createElement("div");
      canvas.className = "fc-canvas" + (self._editing ? " fc-editing" : "");
      canvas.style.height = self._canvasHeight + "px";
      canvas.addEventListener("pointerdown", function (ev) { self._onCanvasClick(ev); });
      root.appendChild(canvas);
      self._canvasEl = canvas;

      if (self._items.length === 0 && self._editing) {
        var empty = document.createElement("div");
        empty.className = "fc-empty";
        empty.innerHTML = "<p>Canvas is empty. Add your first card.</p>";
        var addBtn = document.createElement("button");
        addBtn.textContent = "+ Add Card";
        addBtn.onclick = function () { self._openAddDialog(); };
        empty.appendChild(addBtn);
        canvas.appendChild(empty);
      } else {
        self._items.forEach(function (item) {
          var el = document.createElement("div");
          el.id = "fc-item-" + item.id;
          var classes = ["fc-item"];
          if (self._editing) classes.push("fc-editing");
          if (self._selectedId === item.id) classes.push("fc-selected");
          el.className = classes.join(" ");
          el.style.left = item.x + "px";
          el.style.top = item.y + "px";
          el.style.width = item.w + "px";
          el.style.height = item.h + "px";
          el.style.transform = "rotate(" + item.rotation + "deg)";

          // Card body (where HA card element gets appended)
          var body = document.createElement("div");
          body.id = "fc-body-" + item.id;
          body.className = "fc-item-body";
          el.appendChild(body);

          // Drag overlay (edit mode)
          if (self._editing) {
            var overlay = document.createElement("div");
            overlay.className = "fc-drag-overlay";
            overlay.addEventListener("pointerdown", function (ev) { self._onDragStart(ev, item); });
            overlay.addEventListener("dblclick", function (ev) {
              ev.stopPropagation();
              self._openEditDialog(item);
            });
            el.appendChild(overlay);
          }

          // Handles (when selected in edit mode)
          if (self._editing && self._selectedId === item.id) {
            var line = document.createElement("div");
            line.className = "fc-rotate-line";
            el.appendChild(line);

            var rotHandle = document.createElement("div");
            rotHandle.className = "fc-handle fc-rotate";
            rotHandle.textContent = "\u27f3";
            rotHandle.title = "Drag to rotate (Shift = snap 15\u00b0)";
            rotHandle.addEventListener("pointerdown", function (ev) { self._onRotateStart(ev, item); });
            el.appendChild(rotHandle);

            if (self._activeDrag === "rotate") {
              var badge = document.createElement("div");
              badge.className = "fc-rotate-badge";
              badge.textContent = item.rotation + "\u00b0";
              el.appendChild(badge);
            }

            var resizeHandle = document.createElement("div");
            resizeHandle.className = "fc-handle fc-resize";
            resizeHandle.textContent = "\u29a1";
            resizeHandle.title = "Drag to resize";
            resizeHandle.addEventListener("pointerdown", function (ev) { self._onResizeStart(ev, item); });
            el.appendChild(resizeHandle);

            var delHandle = document.createElement("div");
            delHandle.className = "fc-handle fc-delete";
            delHandle.textContent = "\u2715";
            delHandle.title = "Delete card";
            delHandle.addEventListener("pointerdown", function (ev) {
              ev.stopPropagation();
              ev.preventDefault();
              self._deleteItem(item.id);
            });
            el.appendChild(delHandle);

            var editHandle = document.createElement("div");
            editHandle.className = "fc-handle fc-edit";
            editHandle.textContent = "\u2699";
            editHandle.title = "Edit card config";
            editHandle.addEventListener("pointerdown", function (ev) {
              ev.stopPropagation();
              ev.preventDefault();
              self._openEditDialog(item);
            });
            el.appendChild(editHandle);
          }

          // Click to select (in edit mode)
          if (self._editing) {
            el.addEventListener("pointerdown", function (ev) {
              if (ev.target === el || ev.target.classList.contains("fc-drag-overlay")) {
                self._selectItem(item.id, ev);
              }
            });
          }

          canvas.appendChild(el);
        });
      }

      // Dialog
      if (self._showDialog) {
        var overlay2 = document.createElement("div");
        overlay2.className = "fc-dialog-overlay";
        overlay2.addEventListener("pointerdown", function (e) {
          if (e.target === overlay2) self._closeDialog();
        });

        var dialog = document.createElement("div");
        dialog.className = "fc-dialog";
        dialog.innerHTML =
          "<h3>" + (self._dialogMode === "edit" ? "Edit Card Config" : "Add Card") + "</h3>" +
          "<p>Paste a Lovelace card config as JSON" + (window.jsyaml ? " or YAML" : "") + ".</p>";
        var textarea = document.createElement("textarea");
        textarea.value = self._cardConfigText;
        textarea.spellcheck = false;
        textarea.addEventListener("input", function (e) { self._cardConfigText = e.target.value; });
        dialog.appendChild(textarea);

        var buttons = document.createElement("div");
        buttons.className = "fc-dialog-buttons";
        var cancelBtn = document.createElement("button");
        cancelBtn.className = "fc-secondary";
        cancelBtn.textContent = "Cancel";
        cancelBtn.onclick = function () { self._closeDialog(); };
        var okBtn = document.createElement("button");
        okBtn.textContent = self._dialogMode === "edit" ? "Update Card" : "Add Card";
        okBtn.onclick = function () { self._confirmDialog(); };
        buttons.appendChild(cancelBtn);
        buttons.appendChild(okBtn);
        dialog.appendChild(buttons);

        overlay2.appendChild(dialog);
        root.appendChild(overlay2);
      }

      // Re-attach card DOM elements
      self._items.forEach(function (item) { self._reattachDom(item.id); });
    }

    // ---- Lit lifecycle equivalents ----

    connectedCallback() {
      // Called when element is inserted into DOM
      var self = this;
      // Attach all card elements
      self._items.forEach(function (item) { self._attachCardElement(item); });
    }
  }

  // Register the custom element
  customElements.define("free-canvas-card", FreeCanvasCard);

  // Register as a Lovelace card type
  if (window.customCards) {
    window.customCards.push({
      type: "free-canvas-card",
      name: "Free Canvas Card",
      description: "A freeform canvas — drag, resize, and rotate cards at any position with no grid or snap.",
      preview: false,
    });
  } else {
    window.customCards = [{
      type: "free-canvas-card",
      name: "Free Canvas Card",
      description: "A freeform canvas — drag, resize, and rotate cards at any position with no grid or snap.",
      preview: false,
    }];
  }
})();