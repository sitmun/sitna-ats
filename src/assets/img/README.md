# Basemap Selector Images

This directory should contain the following image files used by the basemap selector control:

## Required Images

1. **mapaMenosN.png** - Header icon for expanded state (minus icon)
2. **mapaFonsN.png** - Header icon for basemap selector (normal state)
3. **mapaMasG.png** - Header icon for collapsed state (plus icon, gray)
4. **mapaFonsG.png** - Header icon for basemap selector (gray state)

## Where to Get These Images

These images are part of the SITMUN viewer app. You can obtain them from:

1. **SITMUN Viewer App Repository**: 
   - Repository: https://github.com/sitmun/sitmun-viewer-app
   - Path: `src/assets/map-styles/sitmun-base/img/`
   - Branch: `dev` (or the branch that matches your sitmun_style.css source)

2. **Direct Download**:
   - Clone or download the SITMUN viewer app repository
   - Navigate to `src/assets/map-styles/sitmun-base/img/`
   - Copy the four PNG files listed above to this directory

## Image Usage

These images are used in the basemap selector control header (`#bms > h2`) to indicate:
- Expanded/collapsed state
- Active/inactive state
- Visual feedback for user interactions

The CSS paths have been updated to reference `/assets/img/` which is the standard Angular assets location.

