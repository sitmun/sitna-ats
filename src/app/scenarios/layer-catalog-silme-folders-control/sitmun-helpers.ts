import {
  SitnaBaseLayer,
  SitnaControls,
  SitnaViews,
  AppCfg,
  AppGroup,
  AppNodeInfo
} from '../../../types/api-sitmun';
import { Injectable } from '@angular/core';

enum SitnaControlsEnum {
  TOC = 'sitna.TOC',
  WorkLayerManager = 'sitna.workLayerManager',
  LayerCatalog = 'sitna.layerCatalog',
  MultiFeatureInfo = 'sitna.multiFeatureInfo',
  ThreeD = 'sitna.threed',
  FeatureInfo = 'sitna.featureInfo',
  //WFSEdit = 'sitna.WFSEdit',
  WFSQuery = 'sitna.WFSQuery'
}

@Injectable()
export class SitnaHelper {
  constructor() {}

  /**
   * TODO - Comment method description
   * apiConfig contains viewer configuration received from server
   * - application
   * - backgrounds
   * - groups
   * - layers
   * - services
   * - tasks
   * - trees
   * returns an array of catalogs: [{title: string, catalog: {div: string, enableSearch: boolean, layerTreeGroups: [], layers: []}}]
   */
  static toLayerCatalogSilme(apiConfig: AppCfg) {
    const catalogs = [];
    const sitnaControlsFilter = apiConfig.tasks.filter(
      (x) => x['ui-control'] != null && x['ui-control'].startsWith('sitna.')
    );
    // if control LayerCatalog is included in config
    if (
      sitnaControlsFilter.some(
        (x) => x['ui-control'] === SitnaControlsEnum.LayerCatalog
      )
    ) {
      const layerCatalog = sitnaControlsFilter.find((obj) => {
        return obj['ui-control'] === SitnaControlsEnum.LayerCatalog;
      });
      // if control LayerCatalog found
      if (layerCatalog) {
        const layers = apiConfig.layers;
        const services = apiConfig.services;

        if (!layers.length || !services.length || !apiConfig.trees.length) {
          return [];
        }

        for (let currentTree of apiConfig.trees) {
          let ltg = [];
          let lays = [];
          const nodes: Map<string, AppNodeInfo> = new Map(
            Object.entries(currentTree.nodes)
          );
          const arrayNodes = Array.from(nodes);
          for (let currentNode of arrayNodes) {
            let parentNode = null;
            for (let i = 0; i < arrayNodes.length; i++) {
              let node = arrayNodes[i];
              // Para cada nodo, si el nodo tiene hijos
              if (node[1].children) {
                for (let j = 0; j < node[1].children.length; j++) {
                  let element = node[1].children[j];
                  // Si el currentNode es un hijo del nodo en el que estamos buscando
                  if (element === currentNode[0]) {
                    // si el nodo padre es el rootNode, establecemos el nodo padre como el mismo currentNode,
                    // es decir, el parentNode del currentNode es el propio currentNode, ya que el rootNode no debe estar presente
                    if (node[0] === currentTree.rootNode)
                      parentNode = currentNode[0];
                    // establecemos el nodo en el que estamos buscando como padre
                    else parentNode = node[0]; // node[0]: nombre del nodo
                    break;
                  }
                }
              }
              if (parentNode) break; // si hemos encontrado padre, salimos del bucle
            }

            // Si el currentNode no es hijo de ningún nodo (no hemos encontrado padre)
            if (!parentNode) {
              //Si el currentNode es el nodo raíz lo establecemos como padre
              if (currentNode[0] == currentTree.rootNode) {
                parentNode = currentNode[0];
              }

              if (!parentNode) {
                let isNodeFound;
                for (const property in currentTree.nodes) {
                  if (property === currentNode[0]) {
                    isNodeFound = true;
                    break;
                  }
                  isNodeFound = false;
                }
                if (isNodeFound) parentNode = currentNode[0];
              }
            }
            // si no tiene hijos y tiene resource (una layer),
            // se trata de una capa
            if (
              currentNode[1].children == null &&
              currentNode[1].resource != null
            ) {
              const layer = layers.find(
                (layer) => layer.id == currentNode[1].resource
              );
              if (layer) {
                const service = services.find(
                  (service) => service.id == layer.service
                );
                if (service) {
                  if (parentNode) {
                    if (layer.layers.length > 0) {
                      lays.push({
                        id: layer.id,
                        order: currentNode[1].order,
                        title: layer.title,
                        hideTitle: false,
                        type: service.type,
                        url: service.url,
                        hideTree: true,
                        format: '',
                        layerNames: layer.layers,
                        parentGroupNode: parentNode.replace('/', '')
                      });
                    } else {
                      lays.push({
                        id: layer.id,
                        order: currentNode[1].order,
                        title: layer.title,
                        hideTitle: false,
                        type: service.type,
                        url: service.url,
                        hideTree: false,
                        format: '',
                        parentGroupNode: parentNode.replace('/', '')
                      });
                    }
                  }
                } else {
                  // error, no se ha encontrado service
                }
              } else {
                // error, no se ha encontrado layer
              }
            } else {
              if (parentNode) {
                ltg.push({
                  id: currentNode[0].replace('/', ''),
                  order: currentNode[1].order,
                  title: currentNode[1].title,
                  parentNode: parentNode.replace('/', ''),
                  // TODO
                  carpeta: ![
                    'node12103',
                    'node12102',
                    'node12336',
                    'node12243',
                    'node12130'
                  ].includes(currentNode[0].replace('/', ''))
                  // Afegir-ho a Altres serveis?
                });
              }
            }
          }
          ltg.push({ id: 'node99', title: 'Altres serveis' });
          if (lays.length > 0) {
            catalogs.push({
              title: currentTree.title,
              catalog: {
                div: 'catalog',
                enableSearch: true,
                layerTreeGroups: ltg,
                layers: lays
              }
            });
          }
        }
      }
    }
    return catalogs;
  }

  static buildCatalogSilme(apiConfig: AppCfg) {
    const layerCatalogsSilme = SitnaHelper.toLayerCatalogSilme(apiConfig);
    layerCatalogsSilme.forEach((tree: any) => {
      const layersAux = tree.catalog.layers;
      const groupAux = tree.catalog.layerTreeGroups;
      tree.catalog.layers = this.orderLayers(layersAux, groupAux);
    });
    return layerCatalogsSilme;
  }

  static orderLayers(layers: any[], groups: any[]): any[] {
    const groupsMap = new Map<string, any>();
    groups.forEach((group) => groupsMap.set(group.id, group));

    // Build the path to the root for each layer
    function buildPathToRoot(layer: any): number[] {
      let path: number[] = [layer.order];
      let currentGroup = groupsMap.get(layer.parentGroupNode);

      while (currentGroup) {
        path.unshift(currentGroup.order); // Add the group order to the start of the path
        currentGroup = (currentGroup.parentNode && currentGroup.parentNode !== currentGroup.id) ? groupsMap.get(currentGroup.parentNode) : null;
      }

      return path;
    }

    // Assign each layer its "order path"
    const layersWithPaths = layers.map((layer) => ({
      layer,
      path: buildPathToRoot(layer),
    }));

    // Sort the layers based on their "order paths"
    layersWithPaths.sort((a, b) => {
      const minLength = Math.min(a.path.length, b.path.length);
      for (let i = 0; i < minLength; i++) {
        if (a.path[i] !== b.path[i]) {
          return a.path[i] - b.path[i];
        }
      }

      // In case of a tie, the shorter path wins
      return a.path.length - b.path.length;
    });

    // Returns the sorted list of layers
    return layersWithPaths.map((item) => item.layer);
  }
}

