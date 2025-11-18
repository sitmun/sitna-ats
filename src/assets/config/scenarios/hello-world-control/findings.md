## About this scenario

**Type:** Tutorial

This scenario demonstrates how to create a custom SITNA control in **api-sitna version 4.1.0** (the npm package version), adapting the official SITNA 4.8.0 tutorial documentation to work with the limitations of the 4.1.0 build.

---

## Key Findings

### 1. Version Mismatch: Documentation vs. Runtime

**Issue:** The official SITNA tutorial documentation (`tutorial-2-controls.html`) targets **SITNA 4.8.0**, but this project uses **SITNA 4.1.0** from npm.

**Impact:**
- Tutorial examples reference APIs that don't exist in 4.1.0
- `SITNA.control.Control` namespace is missing
- `<sitna-button>`, `<sitna-toggle>`, `<sitna-tab>` web components are unavailable
- Layout slot naming differs from tutorial examples

**Resolution:**
- Wait for `map.loaded()` before loading control scripts
- Alias `TC.Control` into `window.SITNA.control.Control` to maintain compatibility
- Use native HTML elements (`<button>`) instead of SITNA web components
- Create custom layout slots or use existing `tc-slot-*` IDs

### 2. Control Bootstrap Timing

**Issue:** Attempting to `require('./src/HelloWorldControl.js')` before SITNA finishes initializing causes `TypeError: Cannot read properties of undefined (reading 'Control')`.

**Impact:**
- Control script fails to load
- Custom element registration fails
- Control never appears in the map

**Resolution:**
- Initialize map first
- Wait for `map.loaded()` promise to resolve
- Check for `TC.Control` availability with retry logic
- Only then load and register the control script

### 3. Layout Slot Availability

**Issue:** Tutorial references `layout/ctl-container` with generic slots (`slot1`, `slot2`), but the default `responsive` layout uses specific slot IDs (`tc-slot-search`, `tc-slot-bms`, etc.).

**Impact:**
- Control cannot be injected into non-existent slots
- Layout must be customized or slots must be added

**Resolution:**
- Use existing layout that exposes a generic/custom slot
- Add custom slot (`tc-slot-hello-world`) to target layout
- Configure scenario to use custom layout path
- Update webpack to copy custom layout to build output

### 4. Missing UI Components

**Issue:** SITNA 4.1.0 does not include the web component UI library (`<sitna-button>`, `<sitna-toggle>`, `<sitna-tab>`).

**Impact:**
- Tutorial examples using `<sitna-button>` render as unstyled elements
- Control appears as red oval with no visible label
- No consistent styling with SITNA theme

**Resolution:**
- Replace `<sitna-button>` with native `<button>` element
- Add custom CSS in scenario layout stylesheet
- Match SITNA color scheme using CSS variables (`--tc-color-primary`)
- Scope styles with control-specific class names

### 5. Control Instance DOM Access

**Issue:** `SITNA.control.Control` instances are not DOM elements themselves; the actual DOM node is in `this.div`.

**Impact:**
- `this.querySelector()` throws `TypeError: this.querySelector is not a function`
- Event listeners cannot be attached
- Control functionality breaks

**Resolution:**
- Use `this.div.querySelector()` instead of `this.querySelector()`
- Access DOM through the `div` property, not the control instance directly

### 6. Layout CSS Duplication vs. Imports

**Issue:** Custom layout folders must include their own `style.css`. Cloning `layout/responsive/style.css` copied ~3,000 lines even though only ~30 lines were scenario-specific.

**Impact:**
- Keeping the full file bloats the repository and makes future updates error-prone.
- Removing everything except the custom rules causes the responsive layout to lose all base styling.

**Resolution:**
- Keep `style.css` tiny and `@import url('../responsive/style.css');` to pull in the stock layout styles.
- Append only the control-specific selectors (e.g., `.tc-ctl-hello-world__*`).
- Document this pattern so future scenarios avoid unnecessary duplication.

### 7. Auto-Instantiation via TC.control Registration

**Key Insight:** Controls registered in the `TC.control` namespace can be auto-instantiated by SITNA from the standard `"controls"` configuration.

**How Auto-Instantiation Works:**

1. **Registration**: Control must be registered as `TC.control.ControlName` (e.g., `TC.control.HelloWorld`)
2. **Config Format**: Use standard SITNA controls format: `"controls": { "controlName": {...} }`
3. **Load Timing**: Control script must be loaded before map initialization (`loadBeforeMap: true`)
4. **SITNA Mapping**: SITNA maps config key `"helloWorld"` → `TC.control.HelloWorld` during map initialization

**Example - HelloWorldControl:**

```javascript
// Register in TC.control namespace
TC.control.HelloWorld = HelloWorldControl;
```

```json
// sitna-config.json
{
  "controls": {
    "helloWorld": {
      "div": "tc-slot-hello-world"
    }
  }
}
```

```typescript
// Component - no manual addControl() needed!
this.initializeMapWithControl({
  checkLoaded: () => this.isTCControlRegistered('HelloWorld'),
  loadBeforeMap: true, // Required for auto-instantiation
  addControl: (map) => {
    // Control is auto-instantiated by SITNA from config
    // No manual map.addControl() needed!
  }
});
```

**Comparison:**

| Aspect | Manual Addition (Old) | Auto-Instantiation (Current) |
|--------|----------------------|------------------------------|
| **Registration** | `window.HelloWorldControl` only | `TC.control.HelloWorld` |
| **Config Format** | Custom property: `"helloWorldControl": {...}` | Standard: `"controls": { "helloWorld": {...} }` |
| **Load Timing** | `loadBeforeMap: false` | `loadBeforeMap: true` |
| **Component Code** | Manual `map.addControl(instance)` | No-op logger (SITNA handles it) |

**Benefits of Auto-Instantiation:**
- ✅ Consistent with standard SITNA control patterns
- ✅ No manual instantiation code needed
- ✅ Control configuration in one place (config file)
- ✅ Works the same way as built-in SITNA controls

---

## Implementation Differences: 4.1 vs 4.8

| Aspect | SITNA 4.1.0 | SITNA 4.8.0 Tutorial |
|--------|-------------|---------------------|
| **Control Base Class** | `TC.Control` (via `TC.control.Control`) | `SITNA.control.Control` |
| **Namespace** | `window.TC` fully populated | `window.SITNA.control.*` available |
| **UI Components** | ❌ No web components | ✅ `<sitna-button>`, `<sitna-toggle>`, `<sitna-tab>` |
| **Layout Slots** | `tc-slot-*` IDs in responsive layout | Generic `slot1`, `slot2` in ctl-container |
| **Template Loading** | Handlebars via `TC.ajax()` | Handlebars via `TC.ajax()` (same) |
| **Control Registration** | `customElements.define()` optional | `customElements.define()` recommended |
| **DOM Access** | `this.div.querySelector()` | `this.querySelector()` (if web component) |

---

## Recommended Workflow for 4.1.0

1. **Wait for Map Initialization**
   ```typescript
   this.map.loaded().then(() => this.onMapLoaded());
   ```

2. **Ensure TC.Control is Available**
   ```typescript
   private async waitForSitnaControl(): Promise<void> {
     // Check for TC.Control with retry logic
     // Alias into SITNA.control.Control if needed
   }
   ```

3. **Load Control Script**
   ```typescript
   await this.waitForSitnaControl();
   require('./src/HelloWorldControl.js');
   ```

4. **Create and Inject Control**
   ```typescript
   const controlInstance = new HelloWorldControl('tc-slot-hello-world');
   map.addControl(controlInstance);
   ```

5. **Use Native HTML + Custom CSS**
   - Replace `<sitna-button>` with `<button>`
   - Style with scenario-specific CSS
   - Use SITNA CSS variables for theming

---

## Troubleshooting

### Control Not Appearing

- ✅ Check that `map.loaded()` has resolved
- ✅ Verify `TC.Control` is available before loading script
- ✅ Ensure slot ID exists in layout markup
- ✅ Confirm control is added via `map.addControl()`

### Script Loading Errors

- ✅ Wait for map initialization before requiring control script
- ✅ Alias `TC.Control` into `SITNA.control.Control` if needed
- ✅ Check browser console for namespace availability

### Styling Issues

- ✅ Use native HTML elements instead of SITNA web components
- ✅ Add custom CSS to scenario layout stylesheet
- ✅ Scope styles with control-specific class names
- ✅ Use SITNA CSS variables for consistent theming

---

## Summary

Creating custom controls in SITNA 4.1.0 requires adapting 4.8.0 tutorial patterns to work with the older API surface. Key adaptations include:

- ✅ Proper bootstrap timing (wait for map + TC namespace)
- ✅ Namespace aliasing (`TC.Control` → `SITNA.control.Control`)
- ✅ Native HTML elements instead of web components
- ✅ Custom layout slots or existing `tc-slot-*` IDs
- ✅ Scenario-specific CSS for styling

The Hello World control demonstrates all these patterns working together in a functional example.

