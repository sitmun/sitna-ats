// Ensure these are global variables - attach directly to window for webpack compatibility
if (typeof window !== 'undefined') {
  window.treeLayers = window.treeLayers || undefined;
  window.initLayers = window.initLayers || [];
  window.ret = window.ret || false;
}

var treeLayers = window.treeLayers;
var initLayers = window.initLayers;
var ret = window.ret;

// Funció recursiva que recorre tot l'arbre
// Define directly on window to ensure global availability in webpack bundles
window.cercaNode = function cercaNode(rama, layerUid) {
  if (rama != null) {
    if (rama.children.length > 0) {
      for (const m in rama.children) {
        if (m.uid === layerUid) {
          window.ret = true;
          ret = true;
          break;
        } else if (m.children.length < 0) {
          // Do nothing...
        } else if (m.children.length > 0) {
          cercaNode(m, layerUid);
        }
      }
    }
  } else {
    const err = '';
  }
}

// Funció recursiva que recorre tot l'arbre
window.cercaNodePerNom = function cercaNodePerNom(rama, layerName) {
  if (rama.children.length > 0) {
    for (const m in rama.children) {
      if (m.name === layerName) {
        window.ret = true;
        ret = true;
        break;
      } else if (m.children.length < 0) {
        // Do nothing...
      } else if (m.children.length > 0) {
        cercaNodePerNom(m, layerName);
      }
    }
    return null;
  }
}

// TODO: Documentar
window.isEmpty = function isEmpty(obj) {
  for (const key in obj) {
    if (obj.hasOwnProperty(key)) return false;
  }
  return true;
}

// TODO: Documentar
window.cercaLayers = function cercaLayers(layers, uid) {
  if (layers.tree) {
    if (layers.tree.children) {
      for (var i = 0; i < layers.tree.children.length; i++) {
        if (layers.tree.children[i].uid == uid) {
          // trobat
          return layers.tree.children[i];
        } else {
          var tmpLayer = cercaLayers(layers.tree.children[i], uid);
          if (tmpLayer != null) return tmpLayer;
        }
      }
    }
  } else if (layers.children) {
    for (var i = 0; i < layers.children.length; i++) {
      if (layers.children[i].uid == uid) {
        // trobat
        return layers.children[i];
      } else {
        var tmpLayer = cercaLayers(layers.children[i], uid);
        if (tmpLayer != null) return tmpLayer;
      }
    }
  } else if (layers.length) {
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].uid == uid) {
        // trobat
        return layers[i];
      } else {
        var tmpLayer = cercaLayers(layers[i], uid);
        if (tmpLayer != null) return tmpLayer;
      }
    }
  } else {
    //no trobat
    return null;
  }
}


// TODO: Documentar
window.cercaLayersPerLayerName = function cercaLayersPerLayerName(layers, layerName) {
  if (layers.tree) {
    if (layers.tree.children) {
      for (var i = 0; i < layers.tree.children.length; i++) {
        if (layers.tree.children[i].name == layerName) {
          //trobat
          return layers.tree.children[i];
        } else {
          var tmpLayer = cercaLayersPerLayerName(
            layers.tree.children[i],
            layerName
          );
          if (tmpLayer != null) return tmpLayer;
        }
      }
    }
  } else if (layers.children) {
    for (var i = 0; i < layers.children.length; i++) {
      if (layers.children[i].name == layerName) {
        //trobat
        return layers.children[i];
      } else {
        var tmpLayer = cercaLayersPerLayerName(layers.children[i], layerName);
        if (tmpLayer != null) return tmpLayer;
      }
    }
  } else if (layers.length) {
    for (var i = 0; i < layers.length; i++) {
      if (layers[i].name == layerName) {
        //trobat
        return layers[i];
      } else {
        var tmpLayer = cercaLayersPerLayerName(layers[i], layerName);
        if (tmpLayer != null) return tmpLayer;
      }
    }
  } else {
    //no trobat
    return null;
  }
}


// TODO: Documentar
window.setLayerUid = function setLayerUid(layer) {
  for (const treeLayer in window.treeLayers) {
    let titol = '';
    if (layer.tree == null) {
      titol = layer.title;
    } else {
      titol = layer.tree.title;
    }

    if (treeLayer.title === titol) {
      try {
        for (const j = 0; j < treeLayer.tree.children.length; j++) {
          if (layer.uid != null) break;
          try {
            if (treeLayer.tree.children[j].children.length > 0) {
              for (
                const k = 0;
                k < treeLayer.tree.children[j].children.length;
                k++
              ) {
                if (layer.uid != null) break;

                try {
                  if (
                    treeLayer.tree.children[j].children[k].children.length > 0
                  ) {
                    try {
                      for (
                        const n = 0;
                        n <
                        treeLayer.tree.children[j].children[k].children.length;
                        k++
                      ) {
                        if (
                          treeLayer.tree.children[j].children[k].children[n]
                            .name === layer.names[0]
                        ) {
                          layer.uid =
                            treeLayer.tree.children[j].children[k].children[
                              n
                            ].uid;
                          break;
                        }
                      }
                    } catch (err) {}
                  } else {
                    if (
                      treeLayer.tree.children[j].children[k].name ===
                      layer.names[0]
                    ) {
                      layer.uid = treeLayer.tree.children[j].children[k].uid;
                      break;
                    }
                  }
                } catch (err) {}
              }
            } else {
              if (treeLayer.tree.children[j].name === layer.names[0]) {
                layer.uid = treeLayer.tree.children[j].uid;
                break;
              }
            }
          } catch (err) {}
        }
      } catch (err) {}
    }
  }

  return layer.uid;
};

// Create global aliases for functions so they can be called without window. prefix
// This is needed because webpack wraps code in modules, breaking global scope access
// Use Function constructor to create functions in the global scope
if (typeof window !== 'undefined') {
  try {
    // Try to get the global object (works in both browser and Node.js)
    var globalObj = (function() {
      if (typeof globalThis !== 'undefined') return globalThis;
      if (typeof window !== 'undefined') return window;
      if (typeof global !== 'undefined') return global;
      if (typeof self !== 'undefined') return self;
      return this;
    })();

    // Create global variables that reference the window functions
    globalObj.cercaNode = window.cercaNode;
    globalObj.cercaNodePerNom = window.cercaNodePerNom;
    globalObj.isEmpty = window.isEmpty;
    globalObj.cercaLayers = window.cercaLayers;
    globalObj.cercaLayersPerLayerName = window.cercaLayersPerLayerName;
    globalObj.setLayerUid = window.setLayerUid;
    globalObj.ret = window.ret;

    // For treeLayers and initLayers, assign directly if globalObj is window
    // Otherwise use getters/setters to keep them in sync
    if (globalObj === window) {
      // If globalObj is window, just assign directly (they're already the same)
      globalObj.treeLayers = window.treeLayers;
      globalObj.initLayers = window.initLayers;
    } else {
      // For other global objects (like globalThis in some contexts), use getters/setters
      // Store actual values in a closure to avoid recursion
      var _treeLayers = window.treeLayers;
      var _initLayers = window.initLayers;

      Object.defineProperty(globalObj, 'treeLayers', {
        get: function() { return _treeLayers; },
        set: function(val) {
          _treeLayers = val;
          window.treeLayers = val;
        },
        configurable: true
      });
      Object.defineProperty(globalObj, 'initLayers', {
        get: function() { return _initLayers; },
        set: function(val) {
          _initLayers = val;
          window.initLayers = val;
        },
        configurable: true
      });
    }
  } catch (e) {
    // Fallback: just use window properties
    console.warn('Could not create global aliases for SilmeTree functions', e);
  }
}

