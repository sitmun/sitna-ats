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

## Architecture

### Design Principles

**Scenario-Based Testing**: The application uses a scenario registry pattern where each test case is an independent Angular component with its own configuration and behavior.

**Service Layer**: Core functionality is organized into focused services:
- `SitnaConfigService` - Map configuration management
- `MapLifecycleService` - Map initialization with reactive state (signals)
- `LoggingService` - Application-wide logging with test environment detection
- `ErrorHandlingService` - Centralized error handling

**Type Safety**: Comprehensive TypeScript definitions for SITNA API in `src/types/api-sitna/` provide type-safe development experience.

**Monkey Patching Utilities**: Reusable utilities with automatic cleanup/restore mechanisms to safely modify SITNA behavior for testing without side effects.

### Key Architectural Decisions

**Why Monkey Patching?** The sandbox uses monkey patching to test SITNA API behavior without modifying the library source code. This approach allows:
- Testing different API scenarios safely
- Debugging API calls and responses
- Backporting functionality from newer SITNA versions
- Intercepting and logging internal behavior

**Meld vs Manual Patching**:
- **Meld** (AOP library) provides cleaner syntax and automatic method wrapping
- **Manual patching** offers more control for edge cases and property patching
- Both support automatic restoration to prevent test pollution

**Scenario Registry**: Dynamic route generation from scenario metadata enables:
- Easy addition of new test scenarios
- Metadata-driven UI (tags, descriptions)
- Consistent scenario structure

### Component Architecture

```
AppComponent
├── ScenarioSelectorComponent (home page)
└── Scenario Components (lazy-loaded via routes)
    ├── BasicMapInitializationComponent
    ├── ProxificationLoggingComponent
    └── ProjectionDataBackportComponent
```

## Deployment

### Production Build

```bash
npm run build
```

Outputs to `dist/sitna-sandbox/` directory.

### Build Configuration

- **Angular Builder**: Uses custom webpack builder (`@angular-builders/custom-webpack`)
- **Asset Copying**: Webpack copies SITNA assets from `node_modules/api-sitna` to `dist/js/api-sitna/`
- **Hash Routing**: Uses hash-based routing (`/#/route`) to prevent conflicts with static asset serving
- **Output Path**: `dist/sitna-sandbox/`

### Deployment Options

**Static Hosting (Recommended)**: Deploy the `dist/sitna-sandbox/` folder to any static file server:

```bash
# Using http-server
npm run serve:http

# Using nginx (example config)
server {
  listen 80;
  server_name sitna-sandbox.example.com;
  root /path/to/dist/sitna-sandbox;
  index index.html;

  location / {
    try_files $uri $uri/ /index.html;
  }
}
```

**Docker**: Example Dockerfile:

```dockerfile
FROM nginx:alpine
COPY dist/sitna-sandbox /usr/share/nginx/html
EXPOSE 80
```

### Environment Configuration

Configuration files in `src/environments/`:
- `sitna-config-default.json` - Default SITNA map options
- `sitna-config-example.json` - Example configuration template

Scenario-specific configs in each scenario folder (e.g., `scenarios/basic-map-initialization/sitna-config.json`).

### Browser Compatibility

- Modern browsers (Chrome, Firefox, Safari, Edge)
- ES2020 target
- No IE11 support (SITNA API requirement)

## References

- [SITNA Documentation](https://sitna.navarra.es)
- [Reference Project](https://github.com/sitmun/sitna-npm-test)
- [meld Library](https://github.com/cujojs/meld)

