## SITNA 4.1 Custom Control Implementation Guide

This scenario documents how to build and host a bespoke control when the project is pinned to **SITNA 4.1.0** (the version published on npm) while most tutorials target **SITNA 4.8.0**. Follow these notes whenever you need to replicate the workflow.

---

### 1. Environment Snapshot

- `node_modules/api-sitna/sitna.js` sets `TC.version = '4.1.0'`.
- Only the `TC` namespace is fully populated (`window.TC`, `TC.control.*`, `TC.Control`).
- `window.SITNA` exists but does **not** include the `control` namespace or the 4.8 UI web components.

### 2. 4.1 vs 4.8 Differences That Matter

| Area | 4.1.0 reality | 4.8.0 tutorial assumption |
|------|---------------|---------------------------|
| Namespaces | Controls exposed via `TC.control.*`; `SITNA.control` missing | `SITNA.control.Control`, `SITNA.control.MapControl` available |
| UI components | No `<sitna-button>`, `<sitna-toggle>`, `<sitna-tab>` web components | Tutorials encourage those elements |
| Layout slots | `layout/responsive` uses `tc-slot-*` ids that differ from tutorial `slot1`, `slot2` | `layout/ctl-container` provides numbered slots |
| Patch scripts | `TC.patch.js` not bundled | Examples load extra patch files |

### 3. Bootstrapping & Loading Order

1. Create the map immediately in the Angular component.
2. Wait for `map.loaded()` before touching the control.
3. After the map resolves, call `waitForSitnaControl()`:
   ```ts
   const tc = window.TC as Record<string, unknown> | undefined;
   const controlCtor =
     (window.SITNA?.['control'] as Record<string, unknown> | undefined)?.['Control'] ??
     (tc?.['control'] as Record<string, unknown> | undefined)?.['Control'] ??
     tc?.['Control'];
   ```
4. If the ctor exists, alias it into `window.SITNA.control.Control` so legacy control code executes without modification.
5. Only then `require('./src/HelloWorldControl.js')`.

### 4. Layout & Slot Strategy

- Prefer a layout that already exposes a named slot. `responsive/markup.html` contains `tc-slot-search`, `tc-slot-bms`, etc.
- Add a **custom slot** in that layout (e.g., `<div id="tc-slot-hello-world"></div>`) so Angular can target it without cloning every layout variation.
- Configure `sitna-config.json`:
  ```json
  {
    "layout": "js/api-sitna/layout/hello-world-control",
    "helloWorldControl": { "div": "tc-slot-hello-world" }
  }
  ```
- Copy the modified layout folder during the build (`webpack.config.js` ➜ `CopyWebpackPlugin`) so SITNA can load it at runtime.

### 5. Template & UI Composition

- Keep the control template in `src/templates/HelloWorld.hbs`. Pass a data object from `render()`.
- Because `<sitna-button>` is unavailable, use a native `<button>` plus scenario-specific CSS (`layout/style.css`) to match SITNA styling (`.tc-ctl-hello-world__button`).
- Scope CSS with `tc-ctl-hello-world__*` to avoid leaking styles to other controls.

### 6. Registration & Injection

1. Define the control class in `src/HelloWorldControl.js`, extending `SITNA.control.Control` (after aliasing).
2. Register the element if you want `<hello-world-control>` usage:
   ```js
   if (!customElements.get('hello-world-control')) {
     customElements.define('hello-world-control', HelloWorldControl);
   }
   ```
3. From Angular:
   ```ts
   const controlInstance = new HelloWorldControl(this.controlDiv);
   (this.map as MapWithControls).addControl(controlInstance);
   ```

### 7. Scenario Metadata & UX Copy

- Metadata lives in `hello-world-control.component.ts` (used by the selector grid).
- Update `SCENARIO_METADATA` so the name/description explicitly mention “SITNA 4.1 custom control tutorial” and tag it with `['sitna-4.1', 'controls', 'tutorial']`.
- The selector automatically reflects those changes after rebuilding.

### 8. Common Pitfalls & Fixes

| Symptom | Cause | Resolution |
|---------|-------|------------|
| `SITNA.control.Control not available after retries` | Control script required before TC finished bootstrapping | Wait for `map.loaded()` and alias `TC.Control` |
| `this.querySelector is not a function` | `SITNA.control.Control` instances aren’t DOM nodes | Use `this.div.querySelector()` |
| Missing slot / control not visible | Layout used lacks `tc-slot-hello-world` | Add the slot and update config |
| Red oval button with no label | `<sitna-button>` absent in 4.1 | Replace with native `<button>` and custom CSS |
| Webpack “Cannot resolve ./src/TC.patch.js” | Tutorial references removed patch file | Remove obsolete `require()` or provide replacement script |

Document last updated: 2025-11-17.

