# SITNA API Testing Sandbox

Angular-based project for testing different scenarios of SITNA API usage, including safe monkey patching techniques.

## Setup

### Prerequisites

- Node.js (v18 or higher)
- npm or yarn

### Installation

```bash
npm install
```

## Development

### Angular CLI (Primary)

```bash
npm start
```

Runs the app at `http://localhost:4200/`

### Alternative Dev Servers

**Parcel:**
```bash
npm run serve:parcel
```

**Vite:**
```bash
npm run serve:vite
```

**HTTP Server (after build):**
```bash
npm run build
npm run serve:http
```

## Testing

### Unit Tests (Jest)

```bash
npm test
npm run test:watch
npm run test:coverage
```

### E2E Tests (Cypress - Optional)

```bash
npm run e2e
```

## Project Structure

- `src/app/services/` - Angular services for SITNA configuration
- `src/app/components/` - Base components (SitnaMap, ScenarioSelector)
- `src/app/scenarios/` - Scenario components demonstrating different testing patterns
- `src/app/utils/` - Monkey patching and sandboxing utilities
- `src/types/` - TypeScript type definitions
- `src/environments/` - Configuration files
- `src/assets/config/` - Custom SITNA configuration files (e.g., predefined-layers.json)
- `tests/scenarios/` - Jest test files

## Scenarios

Each scenario is an Angular component accessible via routing:

1. **Basic Map Initialization** - Standard SITNA map initialization without patching

## SITNA Script Loading

The project uses the **npm package version** of API SITNA from `node_modules/api-sitna`:

- **Package**: Installed via `npm install api-sitna` (see `package.json`)
- **Import**: The library is imported in `src/main.ts` using `import('api-sitna')`
- **Base URL**: Set to `/js/api-sitna/` in `main.ts` and `webpack.config.js`
- **Webpack**: Automatically copies required SITNA assets (css, layout, lib, resources, wmts) from `node_modules/api-sitna` to `dist/js/api-sitna/` during build
- **Configuration**: All config files reference local paths (e.g., `js/api-sitna/layout/responsive`)

## Configuration

SITNA configuration is loaded from `src/environments/sitna-config.json` via `SitnaConfigLoaderService`.

## Monkey Patching

Two patching strategies are available:

1. **Manual Patching** (`src/app/utils/monkey-patch.ts`) - Direct function/property patching
2. **Meld Patching** (`src/app/utils/sitna-meld-patch.ts`) - Using meld library for AOP-style patching

## References

- [SITNA Documentation](https://sitna.navarra.es)
- [Reference Project](https://github.com/sitmun/sitna-npm-test)
- [meld Library](https://github.com/cujojs/meld)

