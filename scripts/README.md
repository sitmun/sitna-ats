# GitHub File Sync Scripts

This directory contains scripts for synchronizing files from external GitHub repositories to local scenario directories.

## Usage

### Sync Basemap Selector Silme Control

Sync files from the `dev` branch (default):

```bash
npm run sync:basemap-selector-silme-control
```

Or explicitly specify the `dev` branch:

```bash
npm run sync:basemap-selector-silme-control:dev
```

Sync files from the `main` branch:

```bash
npm run sync:basemap-selector-silme-control:main
```

### Direct Script Usage

You can also run the script directly:

```bash
node scripts/sync-github-files.js <scenario-name> [branch]
```

**Parameters:**

- `scenario-name`: Name of the scenario to sync (e.g., `basemap-selector-silme-control`)
- `branch`: GitHub branch name (default: `dev`)

**Example:**

```bash
node scripts/sync-github-files.js basemap-selector-silme-control dev
```

## How It Works

The sync script:

1. Fetches files from `https://github.com/sitmun/sitmun-viewer-app` repository
2. Downloads files from the specified branch's `src/assets/js/patch` directory
3. Copies them to the corresponding local scenario directory
4. Preserves directory structure (e.g., `controls/`, `templates/`)

## Adding New Scenarios

To add synchronization for a new scenario, edit `scripts/sync-github-files.js` and add an entry to the `SCENARIO_CONFIG` object:

```javascript
const SCENARIO_CONFIG = {
  'your-scenario-name': {
    githubPath: 'src/assets/js/patch',
    localPath: path.join(__dirname, '..', 'src', 'app', 'scenarios', 'your-scenario-name', 'src'),
    files: [
      'file1.js',
      'subdir/file2.js',
      'templates/template.hbs'
    ]
  }
};
```

Then add corresponding npm scripts to `package.json`:

```json
"sync:your-scenario": "node scripts/sync-github-files.js your-scenario-name dev"
```

## Source Repository

Files are synced from:

- **Repository**: [sitmun/sitmun-viewer-app](https://github.com/sitmun/sitmun-viewer-app)
- **Default Branch**: `dev`
- **Source Path**: `src/assets/js/patch`

## Notes

- The script overwrites existing files without backup
- Always review changes after syncing
- Consider committing changes before syncing to preserve local modifications
- The script uses GitHub's raw content API (no authentication required for public repos)
