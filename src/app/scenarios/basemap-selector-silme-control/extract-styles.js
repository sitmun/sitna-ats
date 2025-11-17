#!/usr/bin/env node

/**
 * Script to extract basemap selector styles from sitmun_style.css
 *
 * Usage:
 *   1. Download sitmun_style.css:
 *      curl -o sitmun_style.css https://raw.githubusercontent.com/sitmun/sitmun-viewer-app/refs/heads/dev/src/assets/map-styles/sitmun-base/sitmun_style.css
 *
 *   2. Run this script:
 *      node extract-styles.js sitmun_style.css
 */

const fs = require('fs');
const path = require('path');

// Template classes to search for
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

// Related selectors to search for
const relatedSelectors = [
  'input\\[type=range\\]',
  'input\\[type=radio\\]',
  'tc-ctl-edit-mode',
  'tc-ctl-edit'
];

function extractStyles(cssFilePath) {
  if (!fs.existsSync(cssFilePath)) {
    console.error(`Error: CSS file not found: ${cssFilePath}`);
    console.log('\nTo download the CSS file, run:');
    console.log('curl -o sitmun_style.css https://raw.githubusercontent.com/sitmun/sitmun-viewer-app/refs/heads/dev/src/assets/map-styles/sitmun-base/sitmun_style.css');
    process.exit(1);
  }

  const cssContent = fs.readFileSync(cssFilePath, 'utf8');
  const lines = cssContent.split('\n');

  const foundStyles = new Map();
  const currentSelector = { value: null, startLine: null, endLine: null };
  let inRule = false;
  let braceCount = 0;
  let currentRule = [];

  // Search for all template classes
  templateClasses.forEach(className => {
    foundStyles.set(className, []);
  });

  // Search for related selectors
  relatedSelectors.forEach(selector => {
    foundStyles.set(selector, []);
  });

  // Parse CSS to extract rules
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check if line contains any of our target classes
    templateClasses.forEach(className => {
      if (line.includes(className)) {
        // Check if it's a selector line
        if (trimmedLine.startsWith('.') || trimmedLine.startsWith('#') ||
            trimmedLine.match(/^[a-zA-Z-]+/)) {
          const match = line.match(new RegExp(`\\.${className.replace(/-/g, '\\-')}[\\s,{:]`, 'g'));
          if (match) {
            foundStyles.get(className).push({
              line: i + 1,
              content: line
            });
          }
        }
      }
    });

    // Check for related selectors
    relatedSelectors.forEach(selector => {
      const regex = new RegExp(selector.replace(/\\/g, ''), 'g');
      if (regex.test(line)) {
        foundStyles.get(selector).push({
          line: i + 1,
          content: line
        });
      }
    });
  }

  // Output results
  console.log('='.repeat(80));
  console.log('BASEMAP SELECTOR STYLE EXTRACTION RESULTS');
  console.log('='.repeat(80));
  console.log(`\nCSS File: ${cssFilePath}`);
  console.log(`Total Lines: ${lines.length}\n`);

  let totalFound = 0;
  let totalMissing = 0;

  console.log('TEMPLATE CLASSES:');
  console.log('-'.repeat(80));

  templateClasses.forEach(className => {
    const matches = foundStyles.get(className);
    if (matches.length > 0) {
      totalFound++;
      console.log(`\n✅ ${className} (${matches.length} match(es)):`);
      matches.forEach(match => {
        console.log(`   Line ${match.line}: ${match.content.trim()}`);
      });
    } else {
      totalMissing++;
      console.log(`\n❌ ${className}: NOT FOUND`);
    }
  });

  console.log('\n\nRELATED SELECTORS:');
  console.log('-'.repeat(80));

  relatedSelectors.forEach(selector => {
    const matches = foundStyles.get(selector);
    if (matches.length > 0) {
      totalFound++;
      console.log(`\n✅ ${selector} (${matches.length} match(es)):`);
      matches.forEach(match => {
        console.log(`   Line ${match.line}: ${match.content.trim()}`);
      });
    } else {
      console.log(`\n⚠️  ${selector}: NOT FOUND (may be defined elsewhere)`);
    }
  });

  console.log('\n\nSUMMARY:');
  console.log('-'.repeat(80));
  console.log(`Found: ${totalFound} classes`);
  console.log(`Missing: ${totalMissing} classes`);
  console.log(`\nNext steps:`);
  console.log(`1. Review the found styles above`);
  console.log(`2. Extract complete CSS rules (including nested rules)`);
  console.log(`3. Add to basemap-selector-silme-control.component.scss`);
  console.log(`4. Test in browser to verify styles are applied correctly`);
}

// Main execution
const cssFile = process.argv[2] || 'sitmun_style.css';
extractStyles(cssFile);

