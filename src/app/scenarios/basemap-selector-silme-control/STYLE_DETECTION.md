# How to Detect Missing Styles

This guide explains methods to identify CSS styles that should be extracted from `sitmun_style.css` but haven't been included yet.

## Method 1: Browser DevTools Inspection

### Step 1: Run the Application
```bash
npm start
```
Navigate to the basemap selector scenario in your browser.

### Step 2: Inspect Rendered Elements
1. Open Browser DevTools (F12 or Right-click → Inspect)
2. Navigate to the **Elements/Inspector** tab
3. Inspect elements rendered by Handlebars templates:
   - `.tc-ctl-bms-node`
   - `.tc-ctl-bms-tree`
   - `.tc-ctl-bms-active-map-miniature`
   - `.tc-ctl-bms-slider`
   - etc.

### Step 3: Check Computed Styles
1. Select an element in DevTools
2. Check the **Computed** tab
3. Look for styles showing as:
   - `user agent stylesheet` (browser defaults)
   - `inherited from...` (inherited styles)
   - Missing expected styles (e.g., no background, no padding, etc.)

### Step 4: Check Applied Styles
1. In the **Styles** panel, see which styles are applied
2. Look for:
   - Styles crossed out (overridden or not matching)
   - Missing styles that should be present
   - Styles from other sources (SITNA base styles)

## Method 2: Compare Template Classes with Extracted Styles

### Step 1: List All Template Classes
Extract all CSS classes from the Handlebars templates:

**From BasemapSelectorSilme.hbs:**
- `tc-ctl-bms-tree`
- `tc-ctl-bms-active-maps`
- `tc-ctl-bms-active-map-miniature`
- `bms-comparable`
- `tc-ctl-bms-slider`
- `tc-ctl-bms-slider-control`
- `tc-ctl-bms-slider-control-button-container`
- `tc-ctl-bms-slider-input-container`
- `tc-ctl-bms-divider`
- `tc-ctl-bms-branch`
- `tc-ctl-bms-more-node`

**From BasemapSelectorNodeSilme.hbs:**
- `tc-ctl-bms-node`
- `tc-disabled`
- `tc-ctl-bms-info`
- `tc-ctl-bms-metadata`
- `tc-loading`

### Step 2: Check SCSS File
Compare with `basemap-selector-silme-control.component.scss`:
- Classes with only comments (no actual styles) = potentially missing
- Classes with styles = already extracted

### Step 3: Search Original CSS File
Search `sitmun_style.css` for each class:
```bash
# If you have the CSS file locally
grep -n "tc-ctl-bms" sitmun_style.css
```

## Method 3: Visual Inspection

### Step 1: Compare with Reference
1. Open the reference application (sitmun-viewer-app)
2. Compare visual appearance:
   - Layout and spacing
   - Colors and borders
   - Hover states
   - Active/selected states
   - Button appearances
   - Slider appearance

### Step 2: Check Interactive States
Test all interactive elements:
- Hover over basemap nodes
- Click on radio buttons
- Use the opacity slider
- Check disabled states
- Verify loading states

### Step 3: Document Differences
Note any visual differences that indicate missing styles.

## Method 4: Browser Console Script

Run this in the browser console to check for unstyled elements:

```javascript
// Check for elements with no computed styles (except defaults)
const checkUnstyledElements = () => {
  const classes = [
    'tc-ctl-bms-tree',
    'tc-ctl-bms-active-maps',
    'tc-ctl-bms-active-map-miniature',
    'tc-ctl-bms-slider',
    'tc-ctl-bms-node',
    'tc-ctl-bms-info',
    'tc-ctl-bms-metadata'
  ];

  classes.forEach(className => {
    const elements = document.querySelectorAll(`.${className}`);
    elements.forEach(el => {
      const styles = window.getComputedStyle(el);
      // Check if element has only default/inherited styles
      const hasCustomStyles =
        styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        styles.padding !== '0px' ||
        styles.margin !== '0px' ||
        styles.border !== '0px none rgb(0, 0, 0)';

      if (!hasCustomStyles) {
        console.warn(`Element with class "${className}" may be missing styles:`, el);
      }
    });
  });
};

checkUnstyledElements();
```

## Method 5: Systematic CSS File Search

### Step 1: Download/Clone the CSS File
```bash
# Download the CSS file
curl -o sitmun_style.css https://raw.githubusercontent.com/sitmun/sitmun-viewer-app/refs/heads/dev/src/assets/map-styles/sitmun-base/sitmun_style.css
```

### Step 2: Search for All Basemap Selector Styles
```bash
# Search for all tc-ctl-bms related styles
grep -n "tc-ctl-bms" sitmun_style.css > bms-styles.txt

# Search for input[type=range] styles
grep -n "input\[type=range\]" sitmun_style.css >> bms-styles.txt

# Search for radio button styles
grep -n "input\[type=radio\]" sitmun_style.css >> bms-styles.txt

# Search for related utility classes
grep -n "tc-ctl-edit\|tc-loading\|tc-disabled" sitmun_style.css >> bms-styles.txt
```

### Step 3: Compare with Extracted Styles
Compare `bms-styles.txt` with what's in the SCSS file to identify missing styles.

## Method 6: Check for Pseudo-classes and States

Look for missing pseudo-class styles:
- `:hover`
- `:active`
- `:focus`
- `:checked`
- `:disabled`
- `::before`
- `::after`

Example check:
```javascript
// In browser console
const element = document.querySelector('.tc-ctl-bms-node');
const hoverStyles = window.getComputedStyle(element, ':hover');
console.log('Hover styles:', hoverStyles);
```

## Method 7: Network Tab - Check Loaded Stylesheets

1. Open DevTools → **Network** tab
2. Filter by **CSS**
3. Check which stylesheets are loaded
4. Verify if `sitmun_style.css` or similar is loaded
5. If not loaded, styles must be in component SCSS

## Method 8: Create a Style Comparison Checklist

Create a checklist for each template class:

```markdown
## Style Extraction Checklist

### .tc-ctl-bms-tree
- [ ] Layout/display properties
- [ ] Spacing (padding/margin)
- [ ] Background/border
- [ ] Position properties

### .tc-ctl-bms-node
- [ ] Layout/display
- [ ] Spacing
- [ ] Background (thumbnail)
- [ ] Hover states
- [ ] Active/selected states

### .tc-ctl-bms-active-map-miniature
- [ ] Size/dimensions
- [ ] Border/outline
- [ ] Position
- [ ] Hover states

### input[type=range] (slider)
- [ ] Width/height
- [ ] Appearance
- [ ] Track styles
- [ ] Thumb styles
- [ ] Focus states

... (continue for each class)
```

## Quick Detection Script

Save this as `detect-missing-styles.js` and run it:

```javascript
// detect-missing-styles.js
// Run in browser console on the scenario page

function detectMissingStyles() {
  const templateClasses = [
    'tc-ctl-bms-tree',
    'tc-ctl-bms-active-maps',
    'tc-ctl-bms-active-map-miniature',
    'bms-comparable',
    'tc-ctl-bms-slider',
    'tc-ctl-bms-slider-control',
    'tc-ctl-bms-slider-control-button-container',
    'tc-ctl-bms-slider-input-container',
    'tc-ctl-bms-divider',
    'tc-ctl-bms-branch',
    'tc-ctl-bms-more-node',
    'tc-ctl-bms-node',
    'tc-ctl-bms-info',
    'tc-ctl-bms-metadata',
    'tc-loading',
    'tc-disabled'
  ];

  const results = {
    missing: [],
    found: [],
    needsReview: []
  };

  templateClasses.forEach(className => {
    const elements = document.querySelectorAll(`.${className}`);
    if (elements.length === 0) {
      results.missing.push({
        class: className,
        reason: 'Element not found in DOM'
      });
      return;
    }

    elements.forEach((el, index) => {
      const styles = window.getComputedStyle(el);
      const hasCustomStyles =
        styles.backgroundColor !== 'rgba(0, 0, 0, 0)' ||
        styles.padding !== '0px' ||
        styles.margin !== '0px' ||
        styles.width !== 'auto' ||
        styles.height !== 'auto' ||
        styles.border !== '0px none rgb(0, 0, 0)';

      if (hasCustomStyles) {
        results.found.push({
          class: className,
          element: el,
          styles: {
            backgroundColor: styles.backgroundColor,
            padding: styles.padding,
            margin: styles.margin,
            width: styles.width,
            height: styles.height
          }
        });
      } else {
        results.needsReview.push({
          class: className,
          element: el,
          reason: 'Only default/inherited styles detected'
        });
      }
    });
  });

  console.group('Style Detection Results');
  console.log('✅ Found styles:', results.found);
  console.warn('⚠️ Needs review:', results.needsReview);
  console.error('❌ Missing:', results.missing);
  console.groupEnd();

  return results;
}

// Run the detection
detectMissingStyles();
```

## Next Steps After Detection

1. **For missing styles:**
   - Search `sitmun_style.css` for the class
   - Extract and add to component SCSS
   - Test in browser

2. **For needs review:**
   - Check if styles are inherited from parent
   - Verify if styles come from SITNA base CSS
   - Add explicit styles if needed

3. **For found styles:**
   - Verify they match the reference design
   - Check if all states are covered (hover, active, etc.)

