## About this patch

**Type:** Note

This scenario **patches** the current `TC.getProjectionData` implementation in **api-sitna version 4.1.0** with code from [SITMUN](https://raw.githubusercontent.com/sitmun/sitmun-viewer-app/refs/heads/main/src/assets/js/patch/TCProjectionDataPatch.js). This document analyzes the current patch implementation compared to both the original 4.1.0 code it replaces and the backported version from api-sitna 4.8.0.

### Overview

The patch (`TCProjectionDataPatch.js`) replaces `TC.getProjectionData` to use epsg.io API endpoints and return proj4 strings instead of WKT in the `def` field, fixing compatibility issues with proj4js 2.8.0+.

---

## Comparison: Current Patch vs Original 4.1.0

### What Was Replaced

The original api-sitna 4.1.0 `getProjectionData` implementation (lines 390-438 in `TC.js`) used epsg.io API with a query-based URL pattern (`?format=json&q={code}`) and returned the raw epsg.io API response, which includes WKT definitions in the `def` field. This caused parsing errors with proj4js 2.8.0+ when `TC.loadProjDef` tried to use the WKT.

### Data Source

| Aspect | Original 4.1.0 | Current Patch |
|--------|----------------|---------------|
| **Source** | epsg.io API (external service) | epsg.io API (external service) |
| **URL Pattern** | `Consts.url.EPSG + '?format=json&q=' + code` | `TC.Consts.url.EPSG + code + '.proj4'` and `.json` |
| **Files per Request** | 1 file (JSON with query parameter) | 2 files (JSON + proj4) |
| **Example** | `epsg.io?format=json&q=4326` | `epsg.io/4326.proj4` + `epsg.io/4326.json` |
| **API Method** | Query parameter (`?format=json&q=`) | Direct file access (`.json` and `.proj4` endpoints) |

### Response Format

| Aspect | Original 4.1.0 | Current Patch |
|--------|----------------|---------------|
| **Sync Mode** | Returns parsed JSON directly (raw epsg.io API response) | EPSG API format: `{ status, number_result, results: [...] }` |
| **Async Mode** | Returns raw epsg.io API response (via `proxificationTool.fetchJSON`) | EPSG API format: `{ status, number_result, results: [...] }` |
| **`def` Field Content** | ❌ WKT from epsg.io (causes proj4js parsing errors) | ✅ Proj4 string (compatible with proj4js) |
| **Response Structure** | Full epsg.io API response with all fields | Limited: `authority`, `code`, `name`, `proj4` |

**Original 4.1.0 Response Structure (from epsg.io API):**
```javascript
// Raw epsg.io API response - returned as-is
{
  "status": "ok",
  "number_result": 1,
  "results": [{
    "code": "4326",
    "name": "WGS 84",
    "def": "GEOGCRS[...]",  // WKT format - causes "Unknown axis direction: up" errors
    "proj4": "+proj=longlat +datum=WGS84 +no_defs +type=crs",
    "unit": "degree",
    "bbox": [90, -180, -90, 180],
    "kind": "CRS-GEOGCRS",
    // ... other fields from epsg.io
  }]
}
```

**Current Patch Response Structure:**
```javascript
{
  "status": "ok",
  "number_result": 1,
  "results": [{
    "authority": "EPSG",
    "code": "4326",
    "name": "WGS 84",
    "proj4": "+proj=longlat +datum=WGS84 +no_defs +type=crs"
    // Note: No 'def' field, missing WKT, bbox, kind, unit, accuracy
  }]
}
```

### Implementation Details

| Aspect | Original 4.1.0 | Current Patch |
|--------|----------------|---------------|
| **Function Signature** | `async function` (but sync mode doesn't use await) | Regular `function` |
| **Sync Mode Implementation** | Synchronous XMLHttpRequest, returns parsed JSON | Synchronous XMLHttpRequest for both files, returns custom format |
| **Async Mode Implementation** | Uses `TC.tool.Proxification.fetchJSON()` (async) | Uses `TC.tool.Proxification.fetchJSON()` for JSON, sync XHR for proj4 |
| **Caching** | ✅ Caches in both sync and async modes | ❌ Only caches in async mode |
| **Regex Pattern** | `/\d{4,5}$/g` (4-5 digits) | `/\d{4,5}$/g` (4-5 digits) - **Same limitation** |
| **Cache Variable** | Local `var projectionDataCache = {}` | Local `var projectionDataCache = {}` |

### Key Differences from Original 4.1.0

1. **✅ Fixed WKT Parsing Issue**
   - Original: Returns raw epsg.io response with WKT in `def` field → causes "Unknown axis direction: up" errors
   - Patch: Constructs custom response with proj4 string → compatible with proj4js 2.8.0+

2. **Changed URL Pattern**
   - Original: Query-based `?format=json&q={code}` (single request)
   - Patch: Direct file access `{code}.json` and `{code}.proj4` (two requests)

3. **Response Construction**
   - Original: Returns epsg.io API response as-is (all fields preserved)
   - Patch: Constructs custom response with limited fields (authority, code, name, proj4)

4. **Missing Metadata Fields**
   - Original: Full epsg.io response includes WKT, bbox, kind, unit, accuracy, and more
   - Patch: Only includes authority, code, name, proj4 (missing WKT, bbox, kind, unit, accuracy)

5. **Caching Behavior**
   - Original: Caches in both sync and async modes (line 436: `projectionDataCache[code] = data;`)
   - Patch: Only caches in async mode (line 98), sync mode doesn't cache

6. **Cache Exposure**
   - Original: Local variable `var projectionDataCache = {}` (not exposed)
   - Patch: Exposed on `TC.projectionDataCache` for analysis

7. **Sync Mode Return Value**
   - Original: Returns parsed JSON directly (could be `false` on error, or epsg.io response object)
   - Patch: Returns `null` on error, or custom EPSG API format object

### Advantages Over Original 4.1.0

1. **✅ Fixes WKT parsing errors** - Main goal achieved by using proj4 string instead of WKT
2. **✅ Compatible with proj4js 2.8.0+** - No "Unknown axis direction: up" errors
3. **✅ Cache exposed for analysis** - `TC.projectionDataCache` is accessible
4. **✅ Direct file access** - Simpler URL structure (no query parameters)

### Disadvantages Compared to Original 4.1.0

1. **❌ Less efficient** - Two HTTP requests instead of one (JSON + proj4 files)
2. **❌ Missing metadata** - No WKT, bbox, kind, accuracy, unit fields (lost from original response)
3. **❌ No caching in sync mode** - Original cached in both modes, patch only in async
4. **❌ Different URL pattern** - May break if epsg.io changes API structure or removes file endpoints
5. **❌ Blocking in async mode** - Uses synchronous XHR for proj4 fetch even in async path
6. **❌ Inconsistent response format** - Original returned raw API response, patch constructs custom format
7. **❌ Same regex limitation** - Both use `/\d{4,5}$/g`, missing 6-digit codes

---

## Comparison: Current Patch vs 4.8.0 Backport

### Data Source

| Aspect | Current Patch | 4.8.0 Backport |
|--------|---------------|----------------|
| **Source** | epsg.io API (external service) | Local project assets |
| **URL Pattern** | `TC.Consts.url.EPSG + code + '.proj4'` and `.json` | `${TC.apiLocation}resources/data/crs/${last3digits}.json` |
| **Files per Request** | 2 files (JSON + proj4) | 1 file (JSON with all data) |
| **Example** | `epsg.io/4326.proj4` + `epsg.io/4326.json` | `/resources/data/crs/035.json` |
| **Dependencies** | Requires internet connection | No external dependencies |
| **Offline Support** | ❌ No | ✅ Yes |

### Response Format

| Aspect | Current Patch | 4.8.0 Backport |
|--------|---------------|----------------|
| **Sync Mode** | EPSG API format: `{ status, number_result, results: [...] }` | Direct `ProjectionData` object |
| **Async Mode** | EPSG API format: `{ status, number_result, results: [...] }` | EPSG API format: `{ status, number_result, results: [...] }` |
| **Response Fields** | `authority`, `code`, `name`, `proj4` | `code`, `kind`, `name`, `wkt`, `proj4`, `bbox`, `unit`, `accuracy` |

**Current Patch Response Structure:**
```javascript
{
  "status": "ok",
  "number_result": 1,
  "results": [{
    "authority": "EPSG",
    "code": "4326",
    "name": "WGS 84",
    "proj4": "+proj=longlat +datum=WGS84 +no_defs +type=crs"
  }]
}
```

**4.8.0 Backport Response Structure (async):**
```javascript
{
  "status": "ok",
  "number_result": 1,
  "results": [{
    "code": "4326",
    "name": "WGS 84",
    "def": "+proj=longlat +datum=WGS84 +no_defs +type=crs",  // proj4 string
    "proj4": "+proj=longlat +datum=WGS84 +no_defs +type=crs",
    "unit": "degree"
  }]
}
```

### Caching Behavior

| Aspect | Current Patch | 4.8.0 Backport |
|--------|---------------|----------------|
| **Pre-loaded Cache** | ❌ None (empty cache) | ✅ 21 common EPSG codes |
| **Sync Mode Caching** | ❌ No caching | ✅ Caches after fetch |
| **Async Mode Caching** | ✅ Caches after fetch | ✅ Caches after fetch |
| **Cache Exposure** | ✅ Exposed on `TC.projectionDataCache` | ✅ Exposed on `TC.projectionDataCache` |
| **Cache Structure** | Stores EPSG API format response | Stores full `ProjectionData` object |

### Code Extraction (Regex)

| Aspect | Current Patch | 4.8.0 Backport |
|--------|---------------|----------------|
| **Pattern** | `/\d{4,5}$/g` | `/\d{4,6}$/g` |
| **Supported Codes** | 4-5 digit EPSG codes | 4-6 digit EPSG codes |
| **Limitation** | ❌ Cannot handle 6-digit codes (e.g., EPSG:326001) | ✅ Supports all standard EPSG code lengths |

**Example:**

- Current patch: `EPSG:326001` → extracts `26001` (5 digits) ❌
- Backport: `EPSG:326001` → extracts `326001` (6 digits) ✅

### Missing Data Fields

**Current Patch Missing Fields:**

- ❌ `wkt` - Well-Known Text definition
- ❌ `bbox` - Bounding box coordinates
- ❌ `kind` - CRS type (e.g., "CRS-GEOGCRS", "CRS-PROJCRS")
- ❌ `unit` - Unit of measurement (only in results array, not in cache)
- ❌ `accuracy` - Accuracy information

**Impact:**

- Cannot access WKT definitions for advanced projection operations
- No bounding box information for spatial extent validation
- No CRS type classification
- Limited metadata for projection analysis

### Implementation Details

#### Async Mode Implementation

**Current Patch:**

- Uses `TC.tool.Proxification` for JSON fetch (async)
- Uses synchronous `XMLHttpRequest` for proj4 fetch (blocking, even in async mode)
- Mixed async/sync approach creates potential blocking behavior

**4.8.0 Backport:**

- Uses `fetch()` API for async requests (fully async)
- Single request for complete data
- Non-blocking implementation

#### Error Handling

**Current Patch:**

- Sync mode: Returns `null` on failure
- Async mode: Rejects promise with error
- No distinction between 404 and other errors in sync mode

**4.8.0 Backport:**

- Sync mode: Returns `ProjectionData` or `undefined`
- Async mode: Returns `false` on failure (resolved, not rejected)
- More consistent error handling

### Advantages of Current Patch

1. **✅ Uses proj4 string in `def` field** - Fixes WKT parsing errors with proj4js
2. **✅ Access to all EPSG codes** - No limitation to pre-loaded codes
3. **✅ Always up-to-date data** - Fetches from authoritative epsg.io source
4. **✅ Simpler URL structure** - Direct code-based URLs
5. **✅ No build-time asset management** - No need to bundle CRS JSON files

### Disadvantages of Current Patch

1. **❌ No offline support** - Requires internet connection
2. **❌ Two HTTP requests per fetch** - Less efficient (JSON + proj4 files)
3. **❌ Blocking proj4 fetch in async mode** - Uses synchronous XHR even in async path
4. **❌ Limited to 4-5 digit codes** - Regex pattern limitation
5. **❌ Missing metadata fields** - No WKT, bbox, kind, accuracy, unit
6. **❌ No pre-loaded cache** - Slower initial loads for common codes
7. **❌ No caching in sync mode** - Repeated sync calls fetch from network
8. **❌ Inconsistent response format** - Always returns EPSG API format, even in sync mode

### Bugs and Issues

#### Bug 1: Regex Pattern Limitation

**Issue:** The regex `/\d{4,5}$/g` only matches 4-5 digit codes, missing 6-digit EPSG codes.

**Impact:**

- Codes like `EPSG:326001` (UTM zone 1N) will extract as `26001` instead of `326001`
- May cause incorrect API requests or cache key mismatches

**Fix:** Change to `/\d{4,6}$/g` to match backport behavior.

#### Bug 2: Synchronous XHR in Async Mode

**Issue:** Line 83 uses synchronous `fetchEPSGInfo(urlProj4)` even when called from async Promise handler.

**Impact:**

- Blocks the main thread during async operations
- Defeats the purpose of async mode
- Can cause UI freezing for slow network connections

**Fix:** Make proj4 fetch async using `fetch()` or async XHR.

#### Bug 3: Missing Error Handling for Proj4 Fetch

**Issue:** If `resultProj4` is `false` (fetch failed), the function returns `null` without rejecting the promise.

**Impact:**

- Async mode silently fails without proper error indication
- Caller cannot distinguish between "not found" and "fetch error"

**Fix:** Reject promise or return consistent error format.

#### Bug 4: No Caching in Sync Mode

**Issue:** Sync mode fetches data but doesn't cache it (line 56-76).

**Impact:**

- Repeated sync calls for the same code make redundant network requests
- Inefficient and slower performance
- Inconsistent with async mode behavior

**Fix:** Cache results in sync mode like async mode does.

#### Bug 5: Incomplete Response Structure

**Issue:** Response only includes `authority`, `code`, `name`, `proj4` - missing WKT, bbox, kind, unit, accuracy.

**Impact:**

- Applications expecting full `ProjectionData` structure will fail
- Cannot perform operations requiring WKT or bbox
- Limited compatibility with code expecting 4.8.0 format

**Fix:** Include all fields from epsg.io API response or merge with additional data.

### Different Behaviors

#### Behavior 1: Sync Mode Response Format

**Current Patch:** Always returns EPSG API format `{ status, number_result, results: [...] }`

**4.8.0 Backport:** Returns direct `ProjectionData` object

**Impact:** Code expecting direct `ProjectionData` in sync mode will need to extract from `results[0]`.

#### Behavior 2: Cache Initialization

**Current Patch:** Starts with empty cache

**4.8.0 Backport:** Starts with 21 pre-loaded common EPSG codes

**Impact:** First requests for common codes (4326, 3857, 25830, etc.) are slower in current patch.

#### Behavior 3: Error Return Values

**Current Patch:**

- Sync: Returns `null`
- Async: Rejects promise

**4.8.0 Backport:**

- Sync: Returns `undefined` or `ProjectionData`
- Async: Returns `false` (resolved)

**Impact:** Different error handling patterns require different code paths.

### Compatibility Issues

#### Issue 1: Missing `def` Field in Response

**Current Patch:** Response includes `proj4` but not `def` field in results array.

**4.8.0 Backport:** Response includes both `proj4` and `def` (proj4 string) fields.

**Impact:** Code expecting `def` field may fail. However, this is actually correct for the WKT fix - `def` should contain proj4 string, not WKT.

#### Issue 2: No WKT Available

**Current Patch:** Does not provide WKT definitions.

**4.8.0 Backport:** Provides full WKT in `ProjectionData.wkt` field.

**Impact:** Applications requiring WKT for advanced operations cannot use current patch.

#### Issue 3: Different Cache Structure

**Current Patch:** Cache stores EPSG API format: `{ status, number_result, results: [...] }`

**4.8.0 Backport:** Cache stores `ProjectionData` objects directly.

**Impact:** Cache inspection and manipulation code will need different handling.

### Recommendations

1. **Fix regex pattern** to support 6-digit codes: `/\d{4,6}$/g`
2. **Make proj4 fetch async** in async mode to avoid blocking
3. **Cache in sync mode** for consistency and performance
4. **Include missing fields** (WKT, bbox, kind, unit, accuracy) if available from API
5. **Add pre-loaded cache** for common EPSG codes to improve initial performance
6. **Standardize error handling** between sync and async modes
7. **Consider adding `def` field** to results array for compatibility (even if same as proj4)

### Summary

The current patch successfully fixes the WKT compatibility issue by using proj4 strings, but has several limitations compared to the 4.8.0 backport:

- ✅ **Fixes WKT parsing errors** (main goal)
- ✅ **Access to all EPSG codes** via API
- ❌ **Limited code support** (4-5 digits only)
- ❌ **Missing metadata fields** (WKT, bbox, kind, etc.)
- ❌ **No offline support**
- ❌ **Inefficient** (2 requests, blocking in async)
- ❌ **No sync mode caching**

The patch is functional for its primary purpose (fixing WKT issues) but lacks the robustness and completeness of the 4.8.0 implementation.
