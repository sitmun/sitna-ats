## About this backport

**Type:** Note

This scenario **backports** `getProjectionData` and `projectionDataCache` from **api-sitna version 4.8.0** into the current codebase (api-sitna 4.1.0).

### Details

The backported implementation uses a **different data source** compared to the current version:

- **Backported version (4.8.0)**: Uses local project assets
- **Current version (4.1.0)**: Uses epsg.io API

The backport was necessary to restore functionality that uses the older URL format for fetching projection data from local JSON files organized by the last 3 digits of the EPSG code.

**Example:**

- EPSG:4326 → `/resources/data/crs/035.json`
- EPSG:25830 → `/resources/data/crs/830.json`

### Solution

The backported code is located in `src/app/utils/projection-data-backport.ts` and is patched into the `TC` namespace at runtime using monkey-patching utilities.

**Asset Locations:**

- **Source**: `src/assets/resources/data/crs/`
- **Build output**: `js/api-sitna/resources/data/crs/` (via webpack configuration)

**Changes from Original Code:**

1. **Uses proj4 string instead of WKT** in the `def` field for async mode
   - Reason: Avoids proj4js parsing errors with "up" axis direction

2. **Wraps async results in EPSG API format**
   - Format: `{ status: 'ok', number_result: 1, results: [...] }`
   - Ensures compatibility with `loadProjections`

3. **Converted to TypeScript**
   - Added interfaces: `ProjectionData`, `GetProjectionDataOptions`, `TCNamespace`
   - Module structure instead of global namespace

4. **Dynamic proj4 import using IIFE**
   - Automatically initializes proj4 definitions when module loads
   - Registers geographic CRS from initial cache (see **Finding 6** for details)

---

## WKT parsing error: "Unknown axis direction: up" - proj4js limitations

**Type:** Issue

**proj4js** (JavaScript library) cannot parse WKT definitions containing **"up" axis direction**, causing runtime errors. proj4js has limited WKT parsing support compared to the PROJ library.

### Details

**Problem:**
When `TC.loadProjDef` receives WKT strings with "up" axis directions in the **response `def` field** from `getProjectionData`, proj4js 2.8.0+ throws errors.

**Context:**
This issue occurs when WKT is used in the **response `def` field** of `getProjectionData`. This is different from **Finding 6**, which addresses WKT registration with `proj4.defs()` where units are not automatically parsed.

**Affected CRS Types:**

- Vertical CRS (e.g., EPSG:5703 - EGM96 height)
- 3D Geographic CRS
- Compound CRS

**Why Most CRS Work:**
Most common 2D CRS codes work fine with WKT because they don't include "up" axis. The error only occurs with specific CRS types that explicitly define an "up" axis.

**Library Differences:**

- **PROJ library (C)**: Supports "up" axis via `+axis` parameter (version 4.8.0+)
- **proj4js 2.8.0+**: Lacks feature parity and cannot parse WKT with "up" axis directions

**See also:** **Finding 6** discusses a related WKT parsing limitation when registering geographic CRS with `proj4.defs()`.

### Code/Error

```text
Error: Unknown axis direction: up
    at transformPROJJSON.js:121:21
    at Array.map (<anonymous>)
    at transformPROJJSON.js:115:14
```

### Solution

**Solution:** Use proj4 string format instead of WKT in the **response `def` field** of `getProjectionData`.

**Implementation:**

```typescript
// Instead of: def: data.wkt
def: data.proj4  // Use proj4 string format
```

**Benefits:**

- ✅ Compatible with proj4js 2.8.0+
- ✅ Works for all CRS types (2D, 3D, Vertical, Compound)
- ✅ More robust solution
- ✅ Maintains functionality

**Note:** This solution addresses WKT in **response `def` fields**. For WKT registration with `proj4.defs()`, see **Finding 6**.

### References

- <https://proj.org/en/stable/usage/projections.html>

---

## Data source difference between API versions

**Type:** Note

The **backported version (4.8.0)** uses **local project assets** while the **current version (4.1.0)** uses **epsg.io API**.

### Details

**Backported Version (4.8.0):**

- **Data source**: Local project assets
- **URL pattern**: `/resources/data/crs/{last3digits}.json`
- **Example**: `/resources/data/crs/035.json` for EPSG:4326
- **Organization**: Files grouped by last 3 digits of EPSG code

**Current Version (4.1.0):**

- **Data source**: epsg.io API (external service)
- **URL pattern**: `?format=json&q={code}`
- **Example**: `?format=json&q=4326` for EPSG:4326
- **Organization**: Direct API query by full EPSG code

**Implications:**

- Backported version requires CRS JSON files in the expected directory structure
- Files must be provided and copied during build process
- No external API dependency

### Solution

**Implementation Steps:**

1. **Copied CRS data files** to `src/assets/resources/data/crs/`
   - Files organized by last 3 digits (e.g., `035.json`, `830.json`)

2. **Configured webpack** to copy assets during build
   - Source: `src/assets/resources/data/crs/`
   - Destination: `js/api-sitna/resources/data/crs/`
   - Ensures files are available at runtime

3. **File structure matches expected format**
   - Each JSON file contains multiple CRS definitions
   - Keyed by full EPSG code (e.g., `"4326"`, `"25830"`)

---

## proj4 units initialization workaround for geographic CRS

**Type:** Issue

**Geographic CRS** require manual units assignment after registration - a workaround for proj4js 2.8.0+ WKT parsing limitation.

### Details

**The Problem:**
When registering geographic CRS with WKT using `proj4.defs('EPSG:code', wkt)`, proj4js 2.8.0+ does **not automatically parse and set the units** from the WKT's ANGLEUNIT information. This requires a manual workaround.

**Related Issue:**
This is a different WKT parsing limitation than the one described in **Finding 1** (which deals with "up" axis direction errors in response `def` fields). This finding addresses WKT registration with `proj4.defs()` where units are not automatically extracted.

**Why It's a Hack:**

1. **Not a documented API**: The `units` property on the definition object returned by `proj4.defs()` is not part of the official proj4js API
   - TypeScript casting `(def as { units?: string })` confirms it's not in official types

2. **WKT contains units but isn't parsed**: WKT definitions include `ANGLEUNIT["degree",...]` for geographic CRS, but proj4js doesn't extract this automatically

3. **Register-then-modify pattern**: The code pattern suggests a workaround:
   - Register: `proj4.defs('EPSG:code', wkt)`
   - Retrieve: `const def = proj4.defs('EPSG:code')`
   - Manually set: `def.units = 'degrees'`

4. **Standard approach would be different**: The proper way would be to include `+units=degrees` in a proj4 string, but the code uses WKT instead

**What Gets Initialized:**

- Only projections with `+proj=longlat` in their proj4 string (geographic CRS)
- Only projections in the **initial cache** (pre-loaded data)
- **Not** projections loaded dynamically later

**Why It's Needed:**
Geographic CRS use angular units (degrees) instead of linear units (meters). Without explicitly setting units, proj4js may not handle coordinate transformations correctly for geographic CRS.

### Solution

**Workaround Implementation:**

```typescript
// Runs automatically when module loads (IIFE)
(function initializeProj4FromCache() {
  import('proj4').then((proj4Module) => {
    const proj4 = proj4Module.default || proj4Module;

    for (const code of Object.keys(projectionDataCache)) {
      const obj = projectionDataCache[code];
      if (obj.proj4 && obj.proj4.includes('+proj=longlat')) {
        // Register with WKT
        proj4.defs('EPSG:' + code, obj.wkt);

        // Workaround: Manually set units (not parsed from WKT)
        const def = proj4.defs('EPSG:' + code);
        if (def) {
          (def as { units?: string }).units = 'degrees'; // TypeScript cast needed - not in official API
        }
      }
    }
  });
})();
```

**Alternative (if using proj4 strings):**
If using proj4 strings instead of WKT, units can be specified directly:

```typescript
proj4.defs('EPSG:4326', '+proj=longlat +ellps=WGS84 +datum=WGS84 +units=degrees');
```

**If using proj4 strings, is the hack harmless?**
Yes! If you register with a proj4 string that already includes `+units=degrees`, then manually setting `def.units = 'degrees'` afterwards is **harmless but redundant**:

- The units are already specified in the proj4 string
- Setting `def.units` afterwards won't cause conflicts or errors
- It's just unnecessary since the units are already in the definition
- The hack would only be needed if using WKT (which doesn't parse units automatically)

**Note:** This workaround only applies to the initial cached data. Projections loaded dynamically later may need similar handling if they're geographic CRS registered with WKT.

**See also:** **Finding 1** discusses a related but different WKT limitation (parsing "up" axis direction in response `def` fields).

---

## Differences between code cache and resource file definitions

**Type:** Note

**Minor semantic differences** exist between the hardcoded `projectionDataCache` and the resource file definitions, but they are **functionally equivalent**.

### Details

**Comparison Results:**

All 21 EPSG codes in the backported `projectionDataCache` are present in the resource files. However, there are minor differences in how some fields are represented:

**1. Unit Field Differences (Geographic CRS only):**

- **Code**: Uses simplified `"degree"`
- **Resource files**: Use official EPSG wording `"degree (supplier to define representation)"`

**Example:**

- EPSG:4326 (WGS 84): Code has `unit: "degree"`, resource has `unit: "degree (supplier to define representation)"`
- EPSG:4258 (ETRS89): Same difference

**Meaning:**

- `"degree (supplier to define representation)"` is EPSG unit code 9122, indicating the format is determined by the data provider
- In practice, both are treated as **decimal degrees** (e.g., 34.4483444°)
- This is a **semantic/documentation difference**, not a functional one

**Note:** These geographic CRS are the same ones that require the units initialization workaround described in **Finding 6**.

**2. Proj4 String Differences (Some geographic CRS):**

- **Code**: Some geographic CRS are missing `+axis=neu` parameter
- **Resource files**: Include `+axis=neu` for geographic CRS

**Example:**

- EPSG:4326: Code has `+proj=longlat +datum=WGS84 +no_defs +type=crs`
- Resource has: `+proj=longlat +datum=WGS84 +no_defs +type=crs +axis=neu`
- EPSG:4258: Both include `+axis=neu` (matches)

**Note:** The `+axis=neu` parameter specifies axis order (North, East, Up) for geographic CRS. While the resource files include it, the code version without it still works correctly as proj4js 2.8.0+ handles axis order appropriately.

**3. Projected CRS Match Perfectly:**

All projected CRS (UTM zones, etc.) in the cache match the resource files exactly:

- EPSG:25830 (ETRS89 / UTM zone 30N): All fields match perfectly
- Other UTM zones: Same - perfect matches

**Conclusion:**

These differences are **documentation/semantic variations** from the original backported code (api-sitna 4.8.0). The simplified unit labels and optional axis parameters do not affect functionality, as:

1. Both unit representations are treated as decimal degrees in practice
2. proj4js 2.8.0+ handles axis order correctly even without explicit `+axis=neu` in some cases
3. All projected CRS match exactly, ensuring accuracy for the most commonly used projections

**See also:** **Finding 6** discusses the units initialization workaround needed for these geographic CRS when registering with WKT.

### Solution

**No action required** - These are intentional simplifications from the original backported code that maintain functional equivalence while using simpler notation.

**If exact matching is desired:**

The resource files contain the official EPSG definitions. If you need exact matches, you could:

1. Update unit fields from `"degree"` to `"degree (supplier to define representation)"` for geographic CRS
2. Add `+axis=neu` to proj4 strings for geographic CRS that are missing it

However, this is **not necessary** for functionality, as the current definitions work correctly.
