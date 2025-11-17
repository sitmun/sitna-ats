// Webpack config for SITNA API and Node.js polyfills
// Based on: https://sitna.navarra.es/api/doc/#como-configurar-webpack
const webpack = require('webpack');
const path = require('path');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const apiSitnaSource = path.join(__dirname, 'node_modules/api-sitna');

module.exports = {
  resolve: {
    // Para evitar errores "Module not found" durante el empaquetamiento
    fallback: {
      assert: false,
      util: require.resolve("util/")
    }
  },
  plugins: [
    // Define la ruta base de la API SITNA para la carga de recursos
    new webpack.DefinePlugin({
      SITNA_BASE_URL: JSON.stringify('/js/api-sitna/')
    }),
    // Copia los recursos necesarios a la carpeta de publicación
    new CopyWebpackPlugin({
      patterns: [
        {
          from: path.join(apiSitnaSource, 'config'),
          to: 'js/api-sitna/config',
          globOptions: {
            ignore: ['**/predefined-layers.json']
          }
        },
        // Copy custom predefined-layers.json to override npm library version
        // This must be done via webpack to ensure it runs after other copies
        {
          from: path.join(__dirname, 'src/assets/config/predefined-layers.json'),
          to: 'js/api-sitna/config/predefined-layers.json',
          force: true // Overwrite if file exists
        },
        {
          from: path.join(__dirname, 'src/assets/config/scenarios'),
          to: 'assets/scenarios',
          force: true // Overwrite if file exists
        },
        { from: path.join(apiSitnaSource, 'css'), to: 'js/api-sitna/css' },
        { from: path.join(apiSitnaSource, 'layout'), to: 'js/api-sitna/layout' },
        { from: path.join(apiSitnaSource, 'lib'), to: 'js/api-sitna/lib' },
        { from: path.join(apiSitnaSource, 'resources'), to: 'js/api-sitna/resources' },
        // Copy CRS data files for backported getProjectionData (version 4.8.0 format)
        {
          from: path.join(__dirname, 'src/assets/resources/data/crs'),
          to: 'js/api-sitna/resources/data/crs',
          noErrorOnMissing: true
        },
        { from: path.join(apiSitnaSource, 'wmts'), to: 'js/api-sitna/wmts' },
        // Copy Handlebars templates from scenario folders to assets/js/patch/templates/{scenario-name}/
        {
          from: '**/*.hbs',
          context: path.join(__dirname, 'src/app/scenarios'),
          to({ context, absoluteFilename }) {
            // Extract scenario name and template filename from the absolute path
            // Example: .../src/app/scenarios/basemap-selector-silme-control/src/templates/BasemapSelectorSilme.hbs
            const relativePath = path.relative(context, absoluteFilename);
            const match = relativePath.match(/^([^/]+)\/src\/templates\/(.+)$/);
            if (match) {
              const [, scenarioName, templateName] = match;
              return path.join('assets/js/patch/templates', scenarioName, templateName).replace(/\\/g, '/');
            }
            // Fallback: preserve structure but move to assets/js/patch/templates
            return path.join('assets/js/patch/templates', relativePath).replace(/\\/g, '/');
          },
          globOptions: {
            ignore: ['**/node_modules/**']
          }
        },
        {
          from: path.join(
            __dirname,
            'src/app/scenarios/hello-world-control/layout'
          ),
          to: 'js/api-sitna/layout/hello-world-control'
        }
      ]
    })
  ]
};
