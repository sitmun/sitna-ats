# FeatureInfo Silme Control

This scenario demonstrates how to use a custom FeatureInfo control (`FeatureInfoSilme`) that extends the standard `TC.control.FeatureInfo` with a custom Handlebars template.

## Important Configuration Requirement

**⚠️ CRITICAL: The standard FeatureInfo control MUST be disabled when using FeatureInfoSilme.**

### Why?

Both controls use the same CSS class (`tc-ctl-finfo`) and would conflict if both are enabled simultaneously. SITNA will try to instantiate both controls, causing rendering conflicts and unpredictable behavior.

### Required Configuration

In your `sitna-config.json`, you **must** set:

```json
{
  "controls": {
    "featureInfo": false,
    "featureInfoSilme": true
  }
}
```

### What Happens If You Don't Disable FeatureInfo?

- Both controls will be instantiated
- They will compete for the same DOM elements
- Rendering conflicts will occur
- The custom template may not be used
- Unpredictable UI behavior

## Implementation Details

### Control Registration

The control is registered in the `TC.control` namespace:

```javascript
TC.control.FeatureInfoSilme = function () {
  TC.control.FeatureInfo.apply(this, arguments);
};
TC.inherit(TC.control.FeatureInfoSilme, TC.control.FeatureInfo);
```

### Template Override

The control overrides the `loadTemplates()` method to use a custom template:

```javascript
ctlProto.loadTemplates = async function () {
  await TC.control.FeatureInfo.prototype.loadTemplates.call(this);
  this.template[this.CLASS] = "assets/js/patch/templates/feature-info-silme-control/FeatureInfoSilme.hbs";
};
```

### Auto-Instantiation

Since `FeatureInfoSilme` is registered in `TC.control`, it is auto-instantiated by SITNA from the configuration:

```json
{
  "controls": {
    "featureInfoSilme": true
  }
}
```

No manual `map.addControl()` is needed.

## Visual Validation

The custom template includes visual cues to verify it's being used:

1. **CSS Badge**: A green "✓ SILME" badge appears at the top-right of the coordinates section
2. **Template Comment**: HTML comment in the template source
3. **Console Logging**: Template path is logged when `loadTemplates()` is called

## Files

- `src/FeatureInfoSilme.js` - Control implementation
- `src/templates/FeatureInfoSilme.hbs` - Custom Handlebars template
- `sitna-config.json` - Map configuration (must disable `featureInfo`)
- `feature-info-silme-control.component.ts` - Angular component

## See Also

- [Hello World Control](../hello-world-control/README.md) - Example of a completely custom control
- [Base Scenario Component](../base-scenario.component.ts) - Base class with helper methods

