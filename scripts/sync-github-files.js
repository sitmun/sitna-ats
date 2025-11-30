#!/usr/bin/env node

/**
 * Sync files from GitHub repository to local directory
 *
 * Usage:
 *   node scripts/sync-github-files.js <scenario-name> [branch]
 *
 * Example:
 *   node scripts/sync-github-files.js basemap-selector-silme-control dev
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const GITHUB_REPO = 'sitmun/sitmun-viewer-app';
const GITHUB_BRANCH = process.argv[3] || 'dev';
const SCENARIO_NAME = process.argv[2];

if (!SCENARIO_NAME) {
  console.error('Error: Scenario name is required');
  console.error('Usage: node scripts/sync-github-files.js <scenario-name> [branch]');
  process.exit(1);
}

// Map scenario names to their GitHub paths and local destinations
const SCENARIO_CONFIG = {
  'basemap-selector-silme-control': {
    githubPath: 'src/assets/js/patch',
    localPath: path.join(__dirname, '..', 'src', 'app', 'scenarios', 'basemap-selector-silme-control', 'src'),
    files: [
      'SilmeUtils.js',
      'controls/BasemapSelectorSilme.js',
      'templates/BasemapSelectorSilme.hbs',
      'templates/BasemapSelectorNodeSilme.hbs'
    ]
  },
  'layer-catalog-silme-folders-control': {
    githubPath: 'src/assets/js/patch',
    localPath: path.join(__dirname, '..', 'src', 'app', 'scenarios', 'layer-catalog-silme-folders-control', 'src'),
    files: [
      'SilmeTree.js',
      'SilmeMap.js',
      'controls/LayerCatalogSilmeFolders.js',
      'templates/LayerCatalogSilme.hbs',
      'templates/LayerCatalogNodeSilmeFolders.hbs',
      'templates/LayerCatalogBranchSilmeFolders.hbs',
      'templates/LayerCatalogInfoSilme.hbs',
      'templates/LayerCatalogResultsSilme.hbs',
      'templates/LayerCatalogProjSilme.hbs'
    ]
  }
};

const config = SCENARIO_CONFIG[SCENARIO_NAME];

if (!config) {
  console.error(`Error: Unknown scenario "${SCENARIO_NAME}"`);
  console.error(`Available scenarios: ${Object.keys(SCENARIO_CONFIG).join(', ')}`);
  process.exit(1);
}

/**
 * Fetch a file from GitHub raw content
 */
function fetchFileFromGitHub(filePath, customGithubPath) {
  return new Promise((resolve, reject) => {
    const githubPath = customGithubPath || config.githubPath;
    const url = `https://raw.githubusercontent.com/${GITHUB_REPO}/${GITHUB_BRANCH}/${githubPath}/${filePath}`;

    console.log(`Fetching: ${url}`);

    https.get(url, (res) => {
      if (res.statusCode === 301 || res.statusCode === 302) {
        // Handle redirects
        return fetchFileFromGitHub(filePath, customGithubPath).then(resolve).catch(reject);
      }

      if (res.statusCode !== 200) {
        reject(new Error(`Failed to fetch ${url}: ${res.statusCode} ${res.statusMessage}`));
        return;
      }

      let data = '';
      res.on('data', (chunk) => {
        data += chunk;
      });

      res.on('end', () => {
        resolve(data);
      });
    }).on('error', (err) => {
      reject(err);
    });
  });
}

/**
 * Ensure directory exists
 */
function ensureDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
}

/**
 * Sync a single file
 */
async function syncFile(fileEntry) {
  try {
    let filePath, customGithubPath, localFilePath;

    // Support both string paths and objects with custom paths
    if (typeof fileEntry === 'string') {
      filePath = fileEntry;
      localFilePath = path.join(config.localPath, filePath);
    } else {
      // Object with custom GitHub path and local path
      filePath = fileEntry.filePath;
      customGithubPath = fileEntry.githubPath;
      localFilePath = path.join(config.localPath, fileEntry.localPath);
    }

    const content = await fetchFileFromGitHub(filePath, customGithubPath);
    const localDir = path.dirname(localFilePath);

    ensureDirectory(localDir);

    fs.writeFileSync(localFilePath, content, 'utf8');
    console.log(`✓ Synced: ${filePath} -> ${localFilePath}`);

    return true;
  } catch (error) {
    const filePath = typeof fileEntry === 'string' ? fileEntry : fileEntry.filePath;
    console.error(`✗ Failed to sync ${filePath}:`, error.message);
    return false;
  }
}

/**
 * Main sync function
 */
async function syncFiles() {
  console.log(`Syncing files for scenario: ${SCENARIO_NAME}`);
  console.log(`GitHub branch: ${GITHUB_BRANCH}`);
  console.log(`Local path: ${config.localPath}`);
  console.log('');

  const results = await Promise.all(config.files.map(syncFile));
  const successCount = results.filter(Boolean).length;
  const failCount = results.length - successCount;

  console.log('');
  console.log(`Sync complete: ${successCount} succeeded, ${failCount} failed`);

  if (failCount > 0) {
    process.exit(1);
  }
}

// Run sync
syncFiles().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});

