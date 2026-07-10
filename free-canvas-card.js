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
        .fc-configurator {
          display: flex; flex-direction: column; gap: 14px;
        }
        .fc-configurator .fc-field {
          display: flex; flex-direction: column; gap: 6px;
        }
        .fc-configurator label {
          font-size: 13px; font-weight: 500; color: var(--primary-text-color, #fff);
        }
        .fc-configurator input, .fc-configurator select {
          width: 100%; box-sizing: border-box; padding: 10px 14px; border-radius: 8px;
          border: 1px solid var(--divider-color, #444);
          background: var(--secondary-background-color, #111);
          color: var(--primary-text-color, #fff); font-size: 14px;
        }
        .fc-configurator select option {
          background: var(--secondary-background-color, #111);
          color: var(--primary-text-color, #fff);
        }
        .fc-configurator .fc-preview-box {
          min-height: 120px; border: 1px dashed var(--divider-color, #444);
          border-radius: 8px; padding: 12px; background: var(--ha-card-background, #222);
          position: relative; overflow: hidden;
        }
        .fc-configurator .fc-raw-toggle {
          display: flex; align-items: center; gap: 8px; font-size: 13px;
          color: var(--secondary-text-color, #888); cursor: pointer;
        }
        .fc-configurator .fc-section-title {
          font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em;
          color: var(--secondary-text-color, #888); margin-top: 4px;
        }
        .fc-configurator .fc-no-entity {
          font-size: 12px; color: var(--secondary-text-color, #666);
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

      // When a custom card is picked, its Lovelace type must include the "custom:" prefix
      allCards.forEach(function (c) {
        c.configType = c.custom ? "custom:" + c.type : c.type;
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
            var configType = c.configType || c.type;
            var defaults = self._getCardDefaults(configType);
            self._showCardConfigurator(configType, c.name, defaults);
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

    // ---- Card defaults / entity helpers ----

    _entityDomainsForCardType(type) {
      var bareType = (type || "").replace(/^custom:/, "");
      var map = {
        // HA sensor card only accepts these numeric domains
        sensor: ["sensor", "counter", "input_number", "number"],
        gauge: ["sensor"],
        tile: ["light", "switch", "sensor", "binary_sensor", "fan", "climate", "cover", "lock", "vacuum", "humidifier", "water_heater", "button", "script", "scene", "automation", "media_player", "person"],
        button: ["button", "script", "scene", "automation"],
        entities: ["sensor", "binary_sensor", "light", "switch", "climate", "cover", "fan", "lock", "vacuum", "media_player", "button", "script", "scene", "automation"],
        glance: ["sensor", "binary_sensor", "light", "switch", "climate", "cover", "fan", "lock", "vacuum", "media_player"],
        "history-graph": ["sensor", "binary_sensor"],
        "statistics-graph": ["sensor"],
        logbook: ["sensor", "binary_sensor", "light", "switch", "climate", "cover", "fan", "lock", "vacuum"],
        light: ["light"],
        climate: ["climate"],
        cover: ["cover"],
        fan: ["fan"],
        lock: ["lock"],
        vacuum: ["vacuum"],
        humidifier: ["humidifier"],
        "water-heater": ["water_heater"],
        "alarm-panel": ["alarm_control_panel"],
        thermostat: ["climate"],
        "media-control": ["media_player"],
        map: ["person", "device_tracker", "zone"],
        "picture-entity": ["light", "switch", "sensor", "person", "climate", "cover", "fan", "media_player"],
        "picture-glance": ["light", "switch", "sensor", "binary_sensor", "climate", "cover", "fan", "lock"],
        // Custom cards
        "mushroom-entity-card": ["light", "switch", "sensor", "binary_sensor", "fan", "climate", "cover", "lock", "vacuum", "humidifier", "water_heater", "button", "script", "scene", "automation", "media_player", "person"],
        "mushroom-person-card": ["person", "device_tracker"],
        "mushroom-number-card": ["number", "input_number"],
        "mushroom-select-card": ["select", "input_select"],
        "mushroom-climate-card": ["climate"],
        "mushroom-alarm-control-panel-card": ["alarm_control_panel"],
        "mushroom-cover-card": ["cover"],
        "mushroom-fan-card": ["fan"],
        "mushroom-humidifier-card": ["humidifier"],
        "mushroom-light-card": ["light"],
        "mushroom-lock-card": ["lock"],
        "mushroom-media-player-card": ["media_player"],
        "mushroom-update-card": ["update"],
        "mushroom-vacuum-card": ["vacuum"],
      };
      return map[bareType] || null;
    }

    _getEntities(domainFilter) {
      var hass = this._hass;
      if (!hass || !hass.states) return [];
      var all = [];
      for (var id in hass.states) {
        var parts = id.split(".");
        var dom = parts[0];
        if (!domainFilter || domainFilter.indexOf(dom) !== -1) {
          var state = hass.states[id];
          all.push({ id: id, domain: dom, name: state.attributes && state.attributes.friendly_name ? state.attributes.friendly_name : id });
        }
      }
      all.sort(function (a, b) { return a.id.localeCompare(b.id); });
      return all;
    }

    _guessEntity(cardType) {
      var domains = this._entityDomainsForCardType(cardType);
      if (!domains) return "";
      var list = this._getEntities(domains);
      // Prefer numeric sensors for sensor/gauge/number cards
      if (cardType === "sensor" || cardType === "gauge" || cardType === "mushroom-number-card" || (cardType || "").replace(/^custom:/, "") === "mushroom-number-card") {
        var numeric = list.filter(function (e) {
          var state = this._hass.states[e.id];
          return state && !isNaN(Number(state.state));
        }.bind(this));
        if (numeric.length > 0) return numeric[0].id;
      }
      if (list.length > 0) return list[0].id;
      // fallback: any entity
      var any = this._getEntities(null);
      return any.length > 0 ? any[0].id : "";
    }

    _getCardDefaults(type) {
      // Strip custom: prefix for internal matching, but keep it in the returned type
      var bareType = type.replace(/^custom:/, "");
      var defaults = { type: type };
      switch (bareType) {
        case "sensor":
        case "gauge":
        case "tile":
        case "light":
        case "climate":
        case "cover":
        case "fan":
        case "lock":
        case "vacuum":
        case "humidifier":
        case "water-heater":
        case "thermostat":
        case "alarm-panel":
        case "media-control":
          defaults.entity = this._guessEntity(type) || "";
          break;
        case "button":
          defaults.entity = this._guessEntity(type) || "";
          defaults.name = "Run";
          defaults.show_name = true;
          defaults.tap_action = { action: "toggle" };
          break;
        case "entities":
        case "glance":
          defaults.entities = [];
          var list = this._getEntities(["sensor", "binary_sensor", "light", "switch"]);
          if (list.length) defaults.entities = list.slice(0, 5).map(function (e) { return e.id; });
          break;
        case "history-graph":
          defaults.entities = [];
          var hist = this._getEntities(["sensor", "binary_sensor"]);
          if (hist.length) defaults.entities = hist.slice(0, 3).map(function (e) { return e.id; });
          defaults.hours_to_show = 24;
          break;
        case "statistics-graph":
          defaults.entities = [];
          var stat = this._getEntities(["sensor"]);
          if (stat.length) defaults.entities = stat.slice(0, 3).map(function (e) { return e.id; });
          defaults.chart_type = "line";
          defaults.period = "hour";
          break;
        case "logbook":
          defaults.entities = [];
          var log = this._getEntities(["sensor", "binary_sensor", "light", "switch"]);
          if (log.length) defaults.entities = log.slice(0, 5).map(function (e) { return e.id; });
          defaults.hours_to_show = 24;
          break;
        case "markdown":
          defaults.content = "# Markdown\n\nEdit this text";
          break;
        case "iframe":
          defaults.url = "https://www.home-assistant.io";
          break;
        case "picture":
          defaults.image = "https://upload.wikimedia.org/wikipedia/commons/thumb/9/9e/Home_Assistant_Logo.svg/1200px-Home_Assistant_Logo.svg.png";
          defaults.aspect_ratio = "16x9";
          break;
        case "picture-entity":
          defaults.entity = this._guessEntity("picture-entity") || "";
          defaults.image = "";
          break;
        case "picture-glance":
          defaults.image = "";
          defaults.entities = [];
          var pg = this._getEntities(["light", "switch", "binary_sensor"]);
          if (pg.length) defaults.entities = pg.slice(0, 4).map(function (e) { return e.id; });
          break;
        case "picture-elements":
          defaults.image = "";
          defaults.elements = [];
          break;
        case "conditional":
          defaults.conditions = [];
          defaults.card = { type: "tile", entity: this._guessEntity("tile") || "" };
          break;
        case "horizontal-stack":
        case "vertical-stack":
        case "grid":
          defaults.cards = [];
          break;
        case "heading":
          defaults.heading = "Section Heading";
          defaults.icon = "mdi:fridge";
          break;
        case "map":
          defaults.entities = [];
          var persons = this._getEntities(["person", "device_tracker"]);
          if (persons.length) defaults.entities = persons.slice(0, 3).map(function (e) { return e.id; });
          break;
        case "weather-radar-card":
          defaults.data_source = "RainViewer";
          defaults.zoom_level = 7;
          defaults.height = "400px";
          defaults.width = "100%";
          break;
        case "mushroom-entity-card":
          defaults.entity = this._guessEntity("tile") || "";
          break;
        case "mushroom-person-card":
          defaults.entity = this._guessEntity("map") || "";
          break;
        case "mushroom-number-card":
          defaults.entity = this._guessEntity("number") || "";
          break;
        case "mushroom-select-card":
          defaults.entity = this._guessEntity("select") || "";
          break;
        case "mushroom-chips-card":
          defaults.chips = [];
          break;
        case "mushroom-title-card":
          defaults.title = "Title";
          defaults.subtitle = "Subtitle";
          break;
        case "mushroom-climate-card":
          defaults.entity = this._guessEntity("climate") || "";
          break;
        case "mushroom-alarm-control-panel-card":
          defaults.entity = this._guessEntity("alarm-panel") || "";
          break;
        case "mushroom-cover-card":
          defaults.entity = this._guessEntity("cover") || "";
          break;
        case "mushroom-fan-card":
          defaults.entity = this._guessEntity("fan") || "";
          break;
        case "mushroom-humidifier-card":
          defaults.entity = this._guessEntity("humidifier") || "";
          break;
        case "mushroom-light-card":
          defaults.entity = this._guessEntity("light") || "";
          break;
        case "mushroom-lock-card":
          defaults.entity = this._guessEntity("lock") || "";
          break;
        case "mushroom-media-player-card":
          defaults.entity = this._guessEntity("media-control") || "";
          break;
        case "mushroom-template-card":
          defaults.primary = "Hello";
          defaults.secondary = "";
          defaults.icon = "mdi:home";
          break;
        case "mushroom-update-card":
          defaults.entity = this._guessEntity("update") || "";
          break;
        case "mushroom-vacuum-card":
          defaults.entity = this._guessEntity("vacuum") || "";
          break;
        case "mushroom-empty-card":
          break;
      }
      return defaults;
    }

    _showCardConfigurator(cardType, cardName, config) {
      var self = this;
      var root = self._container;

      var overlay = document.createElement("div");
      overlay.className = "fc-dialog-overlay";

      var dialog = document.createElement("div");
      dialog.className = "fc-dialog";
      dialog.style.maxWidth = "720px";
      dialog.style.padding = "22px";

      var title = document.createElement("h3");
      title.textContent = "Configure " + cardName;
      title.style.margin = "0 0 4px 0";
      dialog.appendChild(title);

      var subtitle = document.createElement("p");
      subtitle.textContent = "Type: " + cardType + "  \u00b7  Pick an entity, set a title, and click Add Card.";
      subtitle.style.margin = "0 0 16px 0";
      dialog.appendChild(subtitle);

      var form = document.createElement("div");
      form.className = "fc-configurator";
      dialog.appendChild(form);

      var rawMode = false;
      var rawToggle = document.createElement("label");
      rawToggle.className = "fc-raw-toggle";
      rawToggle.innerHTML = '<input type="checkbox" style="margin:0;"> <span>Edit raw JSON</span>';
      rawToggle.querySelector("input").onchange = function () {
        rawMode = this.checked;
        self._renderConfiguratorFields(form, config, cardType, previewBox, rawMode, rawToggle);
      };
      dialog.appendChild(rawToggle);

      var previewLabel = document.createElement("div");
      previewLabel.className = "fc-section-title";
      previewLabel.textContent = "Preview";
      dialog.appendChild(previewLabel);

      var previewBox = document.createElement("div");
      previewBox.className = "fc-preview-box";
      dialog.appendChild(previewBox);

      var errorBox = document.createElement("div");
      errorBox.style.cssText = "color:var(--error-color,#db4437);font-size:13px;margin-top:8px;min-height:20px;";
      dialog.appendChild(errorBox);

      var configBox = document.createElement("details");
      configBox.style.cssText = "margin-top:12px;font-size:12px;color:var(--secondary-text-color,#888);";
      configBox.innerHTML = '<summary>View generated JSON</summary><pre style="background:var(--secondary-background-color,#111);padding:8px;border-radius:6px;overflow:auto;max-height:160px;white-space:pre-wrap;"></pre>';
      var configPre = configBox.querySelector("pre");
      dialog.appendChild(configBox);

      var buttons = document.createElement("div");
      buttons.className = "fc-dialog-buttons";
      var cancelBtn = document.createElement("button");
      cancelBtn.className = "fc-secondary";
      cancelBtn.textContent = "Cancel";
      cancelBtn.onclick = function () { overlay.remove(); };
      var okBtn = document.createElement("button");
      okBtn.textContent = "Add Card";
      okBtn.onclick = function () {
        errorBox.textContent = "";
        try {
          if (rawMode) {
            config = JSON.parse(form.querySelector("textarea").value);
          }
          if (!config || !config.type) throw new Error("Missing card type");
          // Warn if entity required but missing
          var bareType = (config.type || "").replace(/^custom:/, "");
          var required = (config.entity === undefined) ? false : self._entityDomainsForCardType(config.type);
          if (required && !config.entity) {
            errorBox.textContent = "Warning: no entity selected. The card may show an error or blank state.";
            return;
          }
          self._addItem(config);
          overlay.remove();
        } catch (e) {
          errorBox.textContent = "Error: " + e.message;
        }
      };
      buttons.appendChild(cancelBtn);
      buttons.appendChild(okBtn);
      dialog.appendChild(buttons);

      overlay.appendChild(dialog);
      root.appendChild(overlay);

      self._renderConfiguratorFields(form, config, cardType, previewBox, rawMode, rawToggle);
    }

    _renderConfiguratorFields(form, config, cardType, previewBox, rawMode, rawToggle) {
      var self = this;
      form.innerHTML = "";

      if (rawMode) {
        var ta = document.createElement("textarea");
        ta.value = JSON.stringify(config, null, 2);
        ta.spellcheck = false;
        ta.style.height = "260px";
        ta.oninput = function () {
          try {
            config = JSON.parse(this.value);
            self._updatePreview(previewBox, config);
          } catch (e) { /* ignore while typing */ }
        };
        form.appendChild(ta);
        return;
      }

      var bareType = (cardType || "").replace(/^custom:/, "");
      var entityDomains = this._entityDomainsForCardType(cardType);
      var entities = this._getEntities(entityDomains);
      var hasFields = false;

      // Title field for most cards
      if (["entities", "glance", "history-graph", "statistics-graph", "logbook", "markdown", "iframe", "picture", "picture-entity", "picture-glance", "picture-elements", "map", "grid", "horizontal-stack", "vertical-stack"].indexOf(cardType) !== -1) {
        var titleWrap = document.createElement("div");
        titleWrap.className = "fc-field";
        titleWrap.innerHTML = '<label>Title</label><input type="text" placeholder="Optional title">';
        var titleInput = titleWrap.querySelector("input");
        titleInput.value = config.title || "";
        titleInput.oninput = function () {
          if (this.value) config.title = this.value; else delete config.title;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(titleWrap);
        hasFields = true;
      }

      // Single entity picker for built-in and custom cards
      var singleEntityTypes = ["sensor", "gauge", "tile", "light", "climate", "cover", "fan", "lock", "vacuum", "humidifier", "water-heater", "thermostat", "alarm-panel", "media-control", "button", "picture-entity"];
      var isMushroomSingle = bareType.indexOf("mushroom-") === 0 &&
        bareType.indexOf("-chips-card") === -1 &&
        bareType.indexOf("-title-card") === -1 &&
        bareType.indexOf("-empty-card") === -1 &&
        bareType.indexOf("-template-card") === -1;
      var needsEntity = entityDomains && (singleEntityTypes.indexOf(bareType) !== -1 ||
        (config.entity !== undefined) || isMushroomSingle);

      if (needsEntity) {
        var wrap = document.createElement("div");
        wrap.className = "fc-field";
        var label = entityDomains.length === 1 ? "Entity (" + entityDomains[0] + ")" : "Entity";
        wrap.innerHTML = '<label>' + label + '</label><select><option value="">-- select entity --</option></select>';
        var select = wrap.querySelector("select");
        entities.forEach(function (e) {
          var opt = document.createElement("option");
          opt.value = e.id;
          opt.textContent = e.name + "  (" + e.id + ")";
          if (e.id === config.entity) opt.selected = true;
          select.appendChild(opt);
        });
        if (entities.length === 0) {
          var empty = document.createElement("div");
          empty.className = "fc-no-entity";
          empty.textContent = "No " + (entityDomains.join(", ")) + " entities found.";
          wrap.appendChild(empty);
        }
        select.onchange = function () {
          config.entity = this.value;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(wrap);
        hasFields = true;
      }

      // Multi-entity picker for list-based cards
      if (["entities", "glance", "history-graph", "statistics-graph", "logbook", "picture-glance"].indexOf(cardType) !== -1) {
        var multiWrap = document.createElement("div");
        multiWrap.className = "fc-field";
        var multiLabel = cardType === "history-graph" || cardType === "statistics-graph" ? "Entities to graph" : "Entities";
        multiWrap.innerHTML = '<label>' + multiLabel + '</label><select multiple style="min-height:120px;"></select><div class="fc-no-entity">Hold Ctrl/Cmd to select multiple</div>';
        var multiSelect = multiWrap.querySelector("select");
        var arr = config.entities || [];
        entities.forEach(function (e) {
          var opt = document.createElement("option");
          opt.value = e.id;
          opt.textContent = e.name + "  (" + e.id + ")";
          if (arr.indexOf(e.id) !== -1) opt.selected = true;
          multiSelect.appendChild(opt);
        });
        multiSelect.onchange = function () {
          var selected = Array.from(this.selectedOptions).map(function (o) { return o.value; });
          if (selected.length) config.entities = selected; else delete config.entities;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(multiWrap);
        hasFields = true;
      }

      // Markdown content
      if (cardType === "markdown") {
        var mdWrap = document.createElement("div");
        mdWrap.className = "fc-field";
        mdWrap.innerHTML = '<label>Content</label><textarea rows="6"></textarea>';
        var mdTa = mdWrap.querySelector("textarea");
        mdTa.value = config.content || "";
        mdTa.oninput = function () {
          config.content = this.value;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(mdWrap);
        hasFields = true;
      }

      // iFrame URL
      if (cardType === "iframe") {
        var urlWrap = document.createElement("div");
        urlWrap.className = "fc-field";
        urlWrap.innerHTML = '<label>URL</label><input type="text">';
        var urlInput = urlWrap.querySelector("input");
        urlInput.value = config.url || "";
        urlInput.oninput = function () {
          config.url = this.value;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(urlWrap);
        hasFields = true;
      }

      // Picture URL / aspect ratio
      if (["picture", "picture-entity", "picture-glance"].indexOf(cardType) !== -1) {
        var imgWrap = document.createElement("div");
        imgWrap.className = "fc-field";
        imgWrap.innerHTML = '<label>Image URL</label><input type="text">';
        var imgInput = imgWrap.querySelector("input");
        imgInput.value = config.image || "";
        imgInput.oninput = function () {
          if (this.value) config.image = this.value; else delete config.image;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(imgWrap);
        hasFields = true;
      }

      // Hours to show for graphs/logbook
      if (["history-graph", "logbook"].indexOf(cardType) !== -1) {
        var hoursWrap = document.createElement("div");
        hoursWrap.className = "fc-field";
        hoursWrap.innerHTML = '<label>Hours to show</label><input type="number" min="1" max="168">';
        var hoursInput = hoursWrap.querySelector("input");
        hoursInput.value = config.hours_to_show || 24;
        hoursInput.oninput = function () {
          config.hours_to_show = parseInt(this.value, 10) || 24;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(hoursWrap);
        hasFields = true;
      }

      // Statistics period/chart type
      if (cardType === "statistics-graph") {
        var statWrap1 = document.createElement("div");
        statWrap1.className = "fc-field";
        statWrap1.innerHTML = '<label>Chart type</label><select><option value="line">Line</option><option value="bar">Bar</option></select>';
        statWrap1.querySelector("select").value = config.chart_type || "line";
        statWrap1.querySelector("select").onchange = function () {
          config.chart_type = this.value;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(statWrap1);

        var statWrap2 = document.createElement("div");
        statWrap2.className = "fc-field";
        statWrap2.innerHTML = '<label>Period</label><select><option value="5minute">5 minute</option><option value="hour">Hour</option><option value="day">Day</option><option value="month">Month</option></select>';
        statWrap2.querySelector("select").value = config.period || "hour";
        statWrap2.querySelector("select").onchange = function () {
          config.period = this.value;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(statWrap2);
        hasFields = true;
      }

      // Heading text
      if (cardType === "heading") {
        var headWrap1 = document.createElement("div");
        headWrap1.className = "fc-field";
        headWrap1.innerHTML = '<label>Heading</label><input type="text">';
        var headInput = headWrap1.querySelector("input");
        headInput.value = config.heading || "";
        headInput.oninput = function () {
          config.heading = this.value;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(headWrap1);

        var headWrap2 = document.createElement("div");
        headWrap2.className = "fc-field";
        headWrap2.innerHTML = '<label>Icon (MDI)</label><input type="text">';
        var subInput = headWrap2.querySelector("input");
        subInput.value = config.icon || "";
        subInput.oninput = function () {
          config.icon = this.value;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(headWrap2);
        hasFields = true;
      }

      // Map entities (person/device_tracker)
      if (cardType === "map") {
        var mapWrap = document.createElement("div");
        mapWrap.className = "fc-field";
        mapWrap.innerHTML = '<label>Track entities</label><select multiple style="min-height:100px;"></select><div class="fc-no-entity">Hold Ctrl/Cmd to select multiple</div>';
        var mapSelect = mapWrap.querySelector("select");
        var persons = this._getEntities(["person", "device_tracker"]);
        var mapArr = config.entities || [];
        persons.forEach(function (e) {
          var opt = document.createElement("option");
          opt.value = e.id;
          opt.textContent = e.name + "  (" + e.id + ")";
          if (mapArr.indexOf(e.id) !== -1) opt.selected = true;
          mapSelect.appendChild(opt);
        });
        mapSelect.onchange = function () {
          var selected = Array.from(this.selectedOptions).map(function (o) { return o.value; });
          if (selected.length) config.entities = selected; else delete config.entities;
          self._updatePreview(previewBox, config);
        };
        form.appendChild(mapWrap);
        hasFields = true;
      }

      // Mushroom title
      if (bareType === "mushroom-title-card") {
        var tWrap1 = document.createElement("div");
        tWrap1.className = "fc-field";
        tWrap1.innerHTML = '<label>Title</label><input type="text">';
        tWrap1.querySelector("input").value = config.title || "";
        tWrap1.querySelector("input").oninput = function () { config.title = this.value; self._updatePreview(previewBox, config); };
        form.appendChild(tWrap1);
        var tWrap2 = document.createElement("div");
        tWrap2.className = "fc-field";
        tWrap2.innerHTML = '<label>Subtitle</label><input type="text">';
        tWrap2.querySelector("input").value = config.subtitle || "";
        tWrap2.querySelector("input").oninput = function () { config.subtitle = this.value; self._updatePreview(previewBox, config); };
        form.appendChild(tWrap2);
        hasFields = true;
      }

      // Mushroom template
      if (bareType === "mushroom-template-card") {
        var tpl1 = document.createElement("div");
        tpl1.className = "fc-field";
        tpl1.innerHTML = '<label>Primary</label><input type="text">';
        tpl1.querySelector("input").value = config.primary || "";
        tpl1.querySelector("input").oninput = function () { config.primary = this.value; self._updatePreview(previewBox, config); };
        form.appendChild(tpl1);
        var tpl2 = document.createElement("div");
        tpl2.className = "fc-field";
        tpl2.innerHTML = '<label>Secondary</label><input type="text">';
        tpl2.querySelector("input").value = config.secondary || "";
        tpl2.querySelector("input").oninput = function () { config.secondary = this.value; self._updatePreview(previewBox, config); };
        form.appendChild(tpl2);
        var tpl3 = document.createElement("div");
        tpl3.className = "fc-field";
        tpl3.innerHTML = '<label>Icon (MDI)</label><input type="text">';
        tpl3.querySelector("input").value = config.icon || "";
        tpl3.querySelector("input").oninput = function () { config.icon = this.value; self._updatePreview(previewBox, config); };
        form.appendChild(tpl3);
        hasFields = true;
      }

      // Fallback message for cards with no quick options
      if (!hasFields) {
        var msg = document.createElement("div");
        msg.className = "fc-no-entity";
        msg.style.margin = "12px 0";
        msg.innerHTML = 'No quick options for this card type. Switch on <b>Edit raw JSON</b> to configure it manually.';
        form.appendChild(msg);
      }

      this._updatePreview(previewBox, config);
    }

    _updatePreview(previewBox, config) {
      var self = this;
      previewBox.innerHTML = "";
      self._createCardElement(config).then(function (el) {
        el.style.maxWidth = "100%";
        el.style.maxHeight = "260px";
        previewBox.appendChild(el);
      }).catch(function (e) {
        previewBox.innerHTML = '<div class="fc-no-entity">Preview unavailable: ' + (e.message || e) + '</div>';
      });
    }

    // ---- Add / Edit / Delete ----

    _openAddDialog() {
      this._openHACardPicker();
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