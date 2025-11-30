var silmeMap;
var silmeLayerCatalog;
var silmeSearch;
var pendingLayer;

function setExtent(extent) {
  silmeMap.map.getView().fit(extent, { maxZoom: 14 });
}

function silmeAddLayer(layerName) {
  //SILME
  //Busquem la capa en cas que no la trobi:
  var layer

  if (!layer) {
    for (var k = 0; k < (window.treeLayers || treeLayers).length; k++) {
      var rama = (window.treeLayers || treeLayers)[k].tree;
      (window.cercaNodePerNom || cercaNodePerNom)(rama, layerName);
      if (window.ret || ret) {
        layer = (window.treeLayers || treeLayers)[k];
        if (window.ret !== undefined) window.ret = false;
        if (typeof ret !== 'undefined') ret = false;
        break;
      }
    }
  }

  var leaf = (window.cercaLayersPerLayerName || cercaLayersPerLayerName)(layer, layerName);
  layer.uid = leaf.uid;


  if (layer && layerName) {
    var redrawTime = 1;

    if (/iPad/i.test(navigator.userAgent))
      redrawTime = 10;
    else if (TC.Util.detectFirefox())
      redrawTime = 250;

    if (!layer.title) {
      layer.title = layer.getTree().title;
    }

    //$li.addClass(TC.Consts.classes.LOADING).find('span').attr(TOOLTIP_DATA_ATTR, '');

    var reDraw = function ($element) {
      var deferred = new $.Deferred();
      setTimeout(function () {
        $element[0].offsetHeight = $element[0].offsetHeight;
        $element[0].offsetWidth = $element[0].offsetWidth;

        deferred.resolve();
      }, redrawTime);
      return deferred.promise();
    };

    //reDraw($li).then(function () {
    var laCapaExisteix = false;
    for (var i = 0; i < silmeMap.map.getLayers().array_.length; i++)
    {
      if (silmeMap.map.getLayers().array_[i].values_.source.params_ != undefined)
      {
        if (silmeMap.map.getLayers().array_[i].values_.source.params_.LAYERS == layerName) {
          laCapaExisteix = true;
        }
      }
    }
    if (!laCapaExisteix)
      silmeLayerCatalog.addLayerToMap(layer, layerName);
    //});
    //}
  }
}

// Attach to window to ensure global availability in webpack bundles
if (typeof window !== 'undefined') {
  window.silmeMap = silmeMap;
  window.silmeLayerCatalog = silmeLayerCatalog;
  window.silmeSearch = silmeSearch;
  window.pendingLayer = pendingLayer;
  window.setExtent = setExtent;
  window.silmeAddLayer = silmeAddLayer;

  // Create global aliases
  var globalObj = (function() {
    if (typeof globalThis !== 'undefined') return globalThis;
    if (typeof window !== 'undefined') return window;
    if (typeof global !== 'undefined') return global;
    if (typeof self !== 'undefined') return self;
    return this;
  })();

  if (globalObj !== window) {
    globalObj.silmeMap = silmeMap;
    globalObj.silmeLayerCatalog = silmeLayerCatalog;
    globalObj.silmeSearch = silmeSearch;
    globalObj.pendingLayer = pendingLayer;
    globalObj.setExtent = setExtent;
    globalObj.silmeAddLayer = silmeAddLayer;
  }
}

