TC.control = TC.control || {};

if (!TC.control.BasemapSelector) {
  TC.syncLoadJS(TC.apiLocation + 'TC/control/BasemapSelector');
}

// =============================================================================
// Constructor
// =============================================================================

TC.control.BasemapSelectorSilme = function() {
  const _ctl = this;
  TC.control.BasemapSelector.apply(_ctl, arguments);
};

TC.inherit(TC.control.BasemapSelectorSilme, TC.control.BasemapSelector);

// =============================================================================
// Definición de métodos para esta clase
// =============================================================================

(function() {
  const ctlProto = TC.control.BasemapSelectorSilme.prototype;

  const BASEMAP_1_ID = 'bms_active_map_1';
  const BASEMAP_2_ID = 'bms_active_map_2';

  const BMS_MINIMAP_CLASS = '-active-map-miniature';
  const BMS_COMPARABLE_CLASS = 'bms-comparable';

  const URL_DEFAULT_BACKGROUND = 'url("https://ide.cime.es/test/thumbnails/dummy_map_thumbnail.jpg")';

  // Atributos
  ctlProto.CLASS = 'tc-ctl-bms';

  ctlProto._baseMap1Idx = null;
  ctlProto._baseMap1Layer = null;
  ctlProto._baseMap1NodeFromGallery = null;


  ctlProto._baseMap2Idx = null;
  ctlProto._baseMap2Layer = null;
  ctlProto._baseMap2NodeFromGallery = null;

  ctlProto._selectedBaseMapMiniatureId = null;
  ctlProto._isComparatorEnabled = false;

  // ===========================================================================
  // Función de renderizado
  // ===========================================================================

  ctlProto.render = async function(callback) {
    const _this = this;
    const result = await TC.control.BasemapSelector.prototype.render.call(_this, function() {}, _this.options);

    _this.getRenderedHtml(_this.CLASS + '-dialog', null, function(html) {
      _this._dialogDiv.innerHTML = html;

      if (_this.options.dialogMore) {
        const dialog = _this._dialogDiv.querySelector('.' + _this.CLASS + '-more-dialog');

        dialog.addEventListener('change', TC.EventTarget.listenerBySelector('input[type=radio]', function(e) {
          changeInputRadioBaseMap.call(_this, e, function(close) {
            if (close) {
              TC.Util.closeModal();
            }
          });

          e.stopPropagation();
        }));
      }
    });

    return result;
  };


  ctlProto.loadTemplates = async function() {
    const _this = this;
    await TC.control.BasemapSelector.prototype.loadTemplates.call(_this);

    _this.template[_this.CLASS] = 'assets/js/patch/templates/basemap-selector-silme-control/BasemapSelectorSilme.hbs';
    _this.template[_this.CLASS + '-node'] = 'assets/js/patch/templates/basemap-selector-silme-control/BasemapSelectorNodeSilme.hbs';
  };

  // ===========================================================================
  // Función de registro del componente
  // ===========================================================================

  ctlProto.register = async function(map) {
    const _this = this;
    const result = await TC.control.MapContents.prototype.register.call(_this, map);

    if (_this.options.dialogMore) {
      map.on(TC.Consts.event.VIEWCHANGE, function() {
        _this._getMoreBaseLayers();
      });
    }

    map.on(TC.Consts.event.BASELAYERCHANGE + ' ' + TC.Consts.event.PROJECTIONCHANGE + ' ' + TC.Consts.event.VIEWCHANGE, function(e) {
      _this.update(_this.div, e.layer);
    });

    // Esperar a que el mapa principal se cargue del todo (controles y capas).
    await _this.map.loaded();

    // Obtener la información del mapa base activo por defecto desde el mapa.
    _this._baseMap1Layer = _this.map.baseLayer;
    _this._baseMap1Idx = _this.map.baseLayers.indexOf(_this._baseMap1Layer);

    // Añadir el div contenedor para el mapa secundario.
    const secondaryMapDiv = document.createElement('div');
    secondaryMapDiv.id = 'mapa-secundario';
    secondaryMapDiv.classList.add(BMS_COMPARABLE_CLASS);

    // Apply inline styles to ensure absolute positioning works
    // (Angular ViewEncapsulation prevents CSS from reaching dynamically created elements)
    secondaryMapDiv.style.position = 'absolute';
    secondaryMapDiv.style.top = '0';
    secondaryMapDiv.style.left = '0';
    secondaryMapDiv.style.right = '0';
    secondaryMapDiv.style.bottom = '0';
    secondaryMapDiv.style.width = '100%';
    secondaryMapDiv.style.height = '100%';
    secondaryMapDiv.style.zIndex = '1000';
    secondaryMapDiv.style.pointerEvents = 'none';
    secondaryMapDiv.style.backgroundColor = 'transparent';

    document.querySelector('.map-container').appendChild(secondaryMapDiv);

    // Cargar mapa secundario como un mapa de sitna con todos los controles desactivados.
    // No hace falta especificar capas base, eso se hará después de hacer la vinculación.
    _this.secondaryMap = new SITNA.Map('mapa-secundario', {
      crs: _this.map.crs,
      initialExtent: _this.map.initialExtent,
      maxExtent: _this.map.maxExtent,
      baseLayers: _this.map.baseLayers,
      controls: {
        loadingIndicator: false,
        navBar: false,
        scaleBar: false,
        scale: false,
        scaleSelector: false,
        overviewMap: false,
        basemapSelector: false,
        attribution: false,
        TOC: false,
        workLayerManager: false,
        layerCatalog: false,
        coordinates: false,
        legend: false,
        popup: false,
        search: false,
        measure: false,
        streetView: false,
        click: false,
        printMap: false,
        featureInfo: false,
        featureTools: false
      },
      layout: null
    });

    await _this.secondaryMap.loaded(() => {
      // Ensure the OpenLayers viewport and canvases have transparent backgrounds
      const viewport = secondaryMapDiv.querySelector('.ol-viewport');
      if (viewport) {
        viewport.style.backgroundColor = 'transparent';
        console.log('Set viewport background to transparent');
      }

      // Also ensure all canvas elements are transparent
      const canvases = secondaryMapDiv.querySelectorAll('canvas');
      canvases.forEach(canvas => {
        canvas.style.backgroundColor = 'transparent';
      });
      console.log('Set', canvases.length, 'canvas backgrounds to transparent');

      // Check the layergroup elements
      const layerElements = secondaryMapDiv.querySelectorAll('.ol-layer');
      layerElements.forEach(layer => {
        layer.style.backgroundColor = 'transparent';
      });
      console.log('Set', layerElements.length, 'layer backgrounds to transparent');
    });

    // Vincular las acciones del mapa secundario a las del mapa principal.
    _this.secondaryMap.linkTo(map);

    // Callback para la función de renderizado
    _this.renderPromise().then(function() {
      _this.callback();
    });

    return result;
  };

  // ===========================================================================
  // Funciones públicas sobreescritas
  // ===========================================================================

  /**
   * Dado un elemento y un string con un tipo de nodo, devuelve el padre con ese
   * tipo de nodo que tiene el elemento.
   * @param {HTMLElement} elm Elemento de referencia.
   * @param {string} selector Tipo del elemento padre a buscar.
   * @returns {*} El padre más cercano con ese tipo de elemento.
   */
  const getClosestParent = function(elm, selector) {
    while (elm && !elm.matches(selector)) {
      elm = elm.parentElement;
    }
    return elm;
  };


  /**
   * Gestiona el evento de hacer click en un nodo para cambiar la capa base, del
   * mapa principal o del mapa secundario.
   * @param {Event} e Evento con el click en el nodo.
   * @param {Function} callback Función de callback.
   */
  const changeInputRadioBaseMap = function(e, callback) {
    const _this = this;
    let flagToCallback = true;

    // Obtener la capa que se establecerá como mapa base.
    let layer = _this.getLayer(getClosestParent(e.target, 'li').dataset.layerId);

    // Revisar si el mapa se ha cargado desde el dialogo de 'más capas base'.
    if (_this.options.dialogMore && getClosestParent(e.target, '.' + _this.CLASS + '-more-dialog')) {
      const radios = _this.div.querySelectorAll('input[type=radio]');
      for (let i = 0, len = radios.length; i < len; i++) {
        const bmsLayer = _this.getLayer(getClosestParent(radios[i], 'li').dataset.layerId);
        if (bmsLayer) {
          switch (true) {
            case bmsLayer.id === layer.id:
              layer = bmsLayer;
              break;
          }
        }
      }
    }

    // Si es la misma que ya está cargada, se ignora. Para esto, hay que mirar que capa
    // se está intentando cambiar, la principal (1) o la secundaria (2).
    if (_this._selectedBaseMapMiniatureId === BASEMAP_1_ID && _this._baseMap1Layer === layer) return;
    if (_this._selectedBaseMapMiniatureId === BASEMAP_2_ID && _this._baseMap2Layer === layer) return;

    if (layer.mustReproject) {

      if (_this.map.on3DView) {
        if (!layer.getFallbackLayer()) {
          _this._currentSelection.checked = true;
          e.stopPropagation();
          return;
        } else if (layer.getFallbackLayer()) {
          const fallbackLayer = layer.getFallbackLayer();
          if (fallbackLayer) {
            fallbackLayer._capabilitiesPromise.then(function() {
              if (fallbackLayer.isCompatible(_this.map.getCRS())) {
                _this.map.setBaseLayer(layer);
              }
            });
          }

          flagToCallback = true;
        }
      } else {
        if (_this._currentSelection) {
          _this._currentSelection.checked = true;
        }

        // Buscamos alternativa
        const dialogOptions = {
          layer: layer
        };

        const fallbackLayer = layer.getFallbackLayer();
        if (fallbackLayer) {
          fallbackLayer._capabilitiesPromise.then(function() {
            if (fallbackLayer.isCompatible(_this.map.getCRS())) {
              dialogOptions.fallbackLayer = fallbackLayer;
            }
            _this.showProjectionChangeDialog(dialogOptions);
          });
        } else {

          // --- Start Silme
          // Canvi de capa de fons automàtic si només hi ha un SRS disponible.

          _this.map.loadProjections({
            crsList: _this.map.getCompatibleCRS({
              layers: _this.map.workLayers.concat(dialogOptions.layer),
              includeFallbacks: true
            }),
            orderBy: 'name'
          }).then(function(projList) {
            if (projList.length == 1) {
              layer = dialogOptions.layer;
              if (layer) {
                if (projList[0].code) {
                  TC.loadProjDef({
                    crs: projList[0].code,
                    callback: function() {
                      _this.map.setProjection({
                        crs: projList[0].code,
                        baseLayer: layer
                      });
                    }
                  });
                } else {
                  const fallbackLayer = _this.getFallbackLayer(btn.dataset.fallbackLayerId);
                  if (fallbackLayer) {
                    _this.map.setBaseLayer(fallbackLayer);
                  }
                }
              }
            } else {
              _this.showProjectionChangeDialog(dialogOptions);
            }
          });
          // --- End Silme
        }
        flagToCallback = false;
      }

    } else {

      if (layer.type === TC.Consts.layerType.WMS || layer.type === TC.Consts.layerType.WMTS && layer.getProjection() !== _this.map.crs) {
        layer.setProjection({ crs: _this.map.crs });
      }

      _this.map.setBaseLayer(layer);
    }

    // Actualizar la capa base correspondiente.
    _updateBaseLayer.call(_this, layer);

    // Actualizar el radio button de la selección interna.
    if (this._currentSelection) {
      this._currentSelection.checked = true;
    }

    // Llamada al callback.
    if (callback) {
      callback(flagToCallback);
    }

  };

  // ===========================================================================
  // Silme - Comparador de mapas
  // ===========================================================================

  ctlProto.callback = function() {
    const _this = this;

    // Check if map and baseLayers are available
    if (!_this.map || !_this.map.baseLayers || !Array.isArray(_this.map.baseLayers)) {
      return;
    }

    // Añadir la miniatura a todos los mapas de la galería.
    const bmsNodes = _this.div.querySelectorAll('.' + _this.CLASS + '-node');
    for (let i = 0; i < bmsNodes.length; i++) {
      const node = bmsNodes[i];
      const layerId = node.dataset.layerId;

      if (!layerId) {
        // Skip nodes without layer ID (e.g., loading state)
        continue;
      }

      // Filter out undefined/null values and find the layer
      const layer = _this.map.baseLayers.filter(e => e != null).find(e => e.id === layerId);

      if (!layer) {
        // Layer not found, use default
        node.style.backgroundImage = URL_DEFAULT_BACKGROUND;
        continue;
      }

      // Set background-image with proper CSS properties
      if (layer.thumbnail) {
        node.style.backgroundImage = 'url("' + layer.thumbnail + '")';
      } else if (layer.legend && layer.legend.length > 0 && layer.legend[0].src) {
        node.style.backgroundImage = 'url("' + layer.legend[0].src + '")';
      } else {
        node.style.backgroundImage = URL_DEFAULT_BACKGROUND;
      }

      // Ensure background-image is visible with proper CSS properties
      node.style.backgroundSize = 'cover';
      node.style.backgroundPosition = 'center';
      node.style.backgroundRepeat = 'no-repeat';
    }

    // Marca la miniatura principal como la seleccionada.
    _selectMiniature.call(_this, BASEMAP_1_ID);
    if (_this.map && _this.map.baseLayer) {
      _updateBaseLayer.call(_this, _this.map.baseLayer);
    }

    // Ocultar los elementos del comparador.
    _this._isComparatorEnabled = false;
    const comparableElements = document.querySelectorAll('.' + BMS_COMPARABLE_CLASS);
    comparableElements.forEach(element => element.hidden = !_this._isComparatorEnabled);
  };


  ctlProto.addUIEventListeners = function() {
    const _this = this;

    // Listener para el evento de hacer click sobre un nodo de la galería.
    _this.div.addEventListener('click', TC.EventTarget.listenerBySelector('.' + _this.CLASS + '-node', function(e) {

      // --- Start Silme
      const toolsPanel = document.querySelector('#tools-panel');
      if (toolsPanel && toolsPanel.classList.contains('right-collapsed')) {
        const silmePanel = document.querySelector('#silme-panel');
        const navHome = document.querySelector('.tc-ctl-nav-home');
        const svBtn = document.querySelector('.tc-ctl-sv-btn');
        if (silmePanel) silmePanel.classList.remove('left-opacity');
        if (navHome) {
          navHome.classList.remove('left-opacity');
          navHome.classList.remove('tc-hidden');
        }
        if (svBtn) {
          svBtn.classList.remove('left-opacity');
          svBtn.classList.remove('tc-hidden');
        }
      }
      // --- End Silme

      if (e.target.value === 'moreLayers') {
        _this.showMoreLayersDialog();
      } else {
        changeInputRadioBaseMap.call(_this, e);
      }

      e.stopPropagation();
    }));

    // Listeners para el evento de hacer click sobre una miniatura.
    _this.div.addEventListener('click', TC.EventTarget.listenerBySelector('.' + _this.CLASS + BMS_MINIMAP_CLASS, function(e) {
      _selectMiniature.call(_this, e.target.id);

    }));

    // Mostrar el botón de desmarcar mapa base cuando se hace hover sobre el mini-mapa (solo cuando el comparador está activo).
    _this.div.addEventListener('mouseover', TC.EventTarget.listenerBySelector('.' + _this.CLASS + BMS_MINIMAP_CLASS, function(e) {
      if (!_this._isComparatorEnabled) return;
      const target = getClosestParent(e.target, 'div');
      if (!target || !target.children || target.children.length < 2) return;
      const button = target.children[1];
      if (button && button.style) {
        button.style.display = 'block';
      }
    }));

    // Ocultar el botón de desmarcar mapa base cuando se hace hover sobre el mini-mapa.
    _this.div.addEventListener('mouseout', TC.EventTarget.listenerBySelector('.' + _this.CLASS + BMS_MINIMAP_CLASS, function(e) {
      const target = getClosestParent(e.target, 'div');
      if (!target || !target.children || target.children.length < 2) return;
      const button = target.children[1];
      if (button && button.style) {
        button.style.display = 'none';
      }
    }));

    // Mostrar el botón de desmarcar mapa base cuando se hace hover sobre el mini-mapa (solo cuando el comparador está activo).
    _this.div.addEventListener('mouseover', TC.EventTarget.listenerBySelector('.' + _this.CLASS + '-node', function(e) {
      if (_this._isComparatorEnabled) return;
      const target = getClosestParent(e.target, 'li');
      if (!target || !target.children || target.children.length < 2) return;
      const button = target.children[1];
      if (button && button.style) {
        button.style.display = 'block';
      }
    }));

    // Ocultar el botón de desmarcar mapa base cuando se hace hover sobre el mini-mapa.
    _this.div.addEventListener('mouseout', TC.EventTarget.listenerBySelector('.' + _this.CLASS + '-node', function(e) {
      const target = getClosestParent(e.target, 'li');
      if (!target || !target.children || target.children.length < 2) return;
      const button = target.children[1];
      if (button && button.style) {
        button.style.display = 'none';
      }
    }));

    // Listener para el evento de hacer click en el botón de desmarcar un mapa base.
    _this.div.addEventListener('click', TC.EventTarget.listenerBySelector('.' + _this.CLASS + BMS_MINIMAP_CLASS + ' button[name="removeBaseLayer"]', function(e) {
      const miniature = getClosestParent(e.target, 'div');
      _removeBaseLayer.call(_this, miniature.id);
    }));

    // Listener para el evento de hacer click en el botón de añadir una capa base al comparador.
    _this.div.addEventListener('click', TC.EventTarget.listenerBySelector('.' + _this.CLASS + '-node' + ' button[name="addBaseLayer"]', function(e) {
      const nodeFromGallery = getClosestParent(e.target, 'li');
      const layer = _this.secondaryMap.getLayer(nodeFromGallery.dataset.layerId);
      _addBaseLayer.call(_this, layer);
    }));

    // Listener para el evento de hacer click en el botón de reducir la opacidad del mapa base.
    _this.div.addEventListener('click', TC.EventTarget.listenerBySelector('.' + _this.CLASS + '-slider-control-button-container > button[name="lessOpacity"]', function(e) {
      const sliderInput = _this.div.querySelector('.' + _this.CLASS + '-slider-input-container > input');
      if (!sliderInput) return;

      const currentValue = parseInt(sliderInput.value) || 50;
      const newValue = Math.max(0, currentValue - 2);
      sliderInput.value = newValue;
      _updateOpacityLabelPosition.call(_this, sliderInput);
      _updateBasemapOpacity.call(_this, sliderInput);
    }));

    // Listener para el evento de hacer click en el botón de aumentar la opacidad del mapa base.
    _this.div.addEventListener('click', TC.EventTarget.listenerBySelector('.' + _this.CLASS + '-slider-control-button-container > button[name="moreOpacity"]', function(e) {
      const sliderInput = _this.div.querySelector('.' + _this.CLASS + '-slider-input-container > input');
      if (!sliderInput) return;

      const currentValue = parseInt(sliderInput.value) || 50;
      const newValue = Math.min(100, currentValue + 2);
      sliderInput.value = newValue;
      _updateOpacityLabelPosition.call(_this, sliderInput);
      _updateBasemapOpacity.call(_this, sliderInput);
    }));

    // Listener para detectar movimientos del slider
    _this.div.addEventListener('input', TC.EventTarget.listenerBySelector('.' + _this.CLASS + '-slider-input-container > input', function(e) {
      if (!e.target) return;
      _updateOpacityLabelPosition.call(_this, e.target);
      _updateBasemapOpacity.call(_this, e.target);
    }));
  };

  // ===========================================================================
  // Silme - Funciones utilitarias para el comparador de mapas
  // ===========================================================================

  /**
   * Gestiona el cambio de estilo en las miniaturas de los mapas base seleccionados.
   * @param {string} selectedBaseLayerId Id de la miniatura que se quiere seleccionar.
   * @private
   */
  const _selectMiniature = function(selectedBaseLayerId) {
    const _this = this;
    if (_this._selectedBaseMapMiniatureId && _this._selectedBaseMapMiniatureId === selectedBaseLayerId) return;
    const noSelectedBaseLayerId = selectedBaseLayerId === BASEMAP_1_ID ? BASEMAP_2_ID : BASEMAP_1_ID;
    const selectedMiniature = document.getElementById(selectedBaseLayerId);
    selectedMiniature.classList.add(TC.Consts.classes.CHECKED);
    const noSelectedMiniature = document.getElementById(noSelectedBaseLayerId);
    noSelectedMiniature.classList.remove(TC.Consts.classes.CHECKED);
    _this._selectedBaseMapMiniatureId = selectedBaseLayerId;
  };


  /**
   * Añade una nueva capa base en la miniatura de la derecha y habilita los elementos
   * del comparador, como el slider.
   * @param {layer} newBaseLayer Capa base para añadir al comparador.
   * @private
   */
  const _addBaseLayer = function(newBaseLayer) {
    const _this = this;

    const inputControl = _this.div.querySelector('.' + _this.CLASS + '-slider-input-container > input');
    inputControl.value = 50.0;

    // Mostrar el comparador.
    _this._isComparatorEnabled = true;
    const comparableElements = document.querySelectorAll('.' + BMS_COMPARABLE_CLASS);
    comparableElements.forEach(element => {
      element.hidden = !_this._isComparatorEnabled;
      // Enable pointer events when visible
      if (!element.hidden) {
        element.style.pointerEvents = 'auto';
      }
    });
    _updateOpacityLabelPosition.call(_this, inputControl);
    _selectMiniature.call(_this, BASEMAP_2_ID);
    _updateBaseLayer.call(_this, newBaseLayer);
  };


  /**
   * Actualiza una capa base. Si la primera miniatura está seleccionada, se actualiza la capa
   * base del mapa principal. Si está seleccionada la segunda, se actualiza la capa base del
   * mapa secundario.
   * @param {layer} newBaseLayer Nueva capa para actualizar.
   * @private
   */
  const _updateBaseLayer = function(newBaseLayer) {
    const _this = this;

    const nodeFromGallery = _this.div.querySelector('.' + _this.CLASS + '-node[data-layer-id="' + newBaseLayer.id + '"]');

    if (_this._selectedBaseMapMiniatureId === BASEMAP_1_ID) {
      _this._baseMap1Layer = newBaseLayer;
      _this._baseMap1Idx = _this.map.baseLayers.indexOf(newBaseLayer);
      if (_this._baseMap1NodeFromGallery) _this._baseMap1NodeFromGallery.hidden = false;
      _this._baseMap1NodeFromGallery = nodeFromGallery;
      _this._baseMap1NodeFromGallery.hidden = true;

      // Actualizar el CRS.
      if ((newBaseLayer.type === TC.Consts.layerType.WMTS && newBaseLayer.getProjection() !== _this.map.crs) || (newBaseLayer.type === TC.Consts.layerType.WMS)) {
        newBaseLayer.setProjection({ crs: _this.map.crs });
      }
      _this.map.setBaseLayer(newBaseLayer).then(() => {
        _this.map.baseLayer.setOpacity(1.0, true);
      });

    } else {
      _this._baseMap2Layer = newBaseLayer;
      _this._baseMap2Idx = _this.secondaryMap.baseLayers.indexOf(newBaseLayer);
      if (_this._baseMap2NodeFromGallery) _this._baseMap2NodeFromGallery.hidden = false;
      _this._baseMap2NodeFromGallery = nodeFromGallery;
      _this._baseMap2NodeFromGallery.hidden = true;

      // Actualizar el CRS.
      if ((newBaseLayer.type === TC.Consts.layerType.WMTS && newBaseLayer.getProjection() !== _this.map.crs) || (newBaseLayer.type === TC.Consts.layerType.WMS)) {
        newBaseLayer.setProjection({ crs: _this.map.crs });
      }

      // Obtener el valor de opacidad.
      const inputControl = _this.div.querySelector('.' + _this.CLASS + '-slider-input-container > input');
      _this.secondaryMap.setBaseLayer(newBaseLayer).then(() => {
        _updateBasemapOpacity.call(_this, inputControl);
      });
    }

    // Actualizar las propiedades de la miniatura.
    const miniatureElement = document.getElementById(_this._selectedBaseMapMiniatureId);
    const miniatureLabelElement = miniatureElement.querySelector('span');
    miniatureElement.style.backgroundImage = nodeFromGallery.style.backgroundImage;
    miniatureElement.title = newBaseLayer.title;
    miniatureLabelElement.innerHTML = newBaseLayer.title;
  };


  /**
   * Elimina una capa base del comparador. Si es la primera, se pone como principal la
   * segunda. Si se elimina la segunda, se deja la primera como está. Tras este cambio,
   * se oculta el comparador.
   * @param {string} selectedBaseLayerId Id de la miniatura en la que se cargará la capa.
   * @private
   */
  const _removeBaseLayer = function(selectedBaseLayerId) {
    const _this = this;

    // Ocultar el comparador.
    _this._isComparatorEnabled = false;
    const comparableElements = document.querySelectorAll('.' + BMS_COMPARABLE_CLASS);
    comparableElements.forEach(element => {
      element.hidden = !_this._isComparatorEnabled;
      // Disable pointer events when hidden
      if (element.hidden) {
        element.style.pointerEvents = 'none';
      }
    });

    // Marcar la primera miniatura.
    _selectMiniature.call(_this, BASEMAP_1_ID);
    if (selectedBaseLayerId === BASEMAP_1_ID) {
      const oldIdx = _this._baseMap2Idx;
      const newBaseLayer = _this.map.baseLayers[oldIdx];
      const nodeFromGallery = _this.div.querySelector('.' + _this.CLASS + '-node[data-layer-id="' + newBaseLayer.id + '"]');

      _this._baseMap2Layer = null;
      _this._baseMap2Idx = null;
      if (_this._baseMap2NodeFromGallery) _this._baseMap2NodeFromGallery.hidden = false;
      _this._baseMap2NodeFromGallery = null;

      _this._baseMap1Layer = newBaseLayer;
      _this._baseMap1Idx = oldIdx;
      if (_this._baseMap1NodeFromGallery) _this._baseMap1NodeFromGallery.hidden = false;
      _this._baseMap1NodeFromGallery = nodeFromGallery;
      _this._baseMap1NodeFromGallery.hidden = true;

      // Actualizar las propiedades de la miniatura.
      const miniatureElement = document.getElementById(selectedBaseLayerId);
      const miniatureLabelElement = miniatureElement.querySelector('span');
      miniatureElement.style.backgroundImage = _this._baseMap1NodeFromGallery.style.backgroundImage;
      miniatureElement.title = newBaseLayer.title;
      miniatureLabelElement.innerHTML = newBaseLayer.title;

      // Re-proyectar si es preciso y actualizar el mapa base.
      if ((newBaseLayer.type === TC.Consts.layerType.WMTS && newBaseLayer.getProjection() !== _this.map.crs) || (newBaseLayer.type === TC.Consts.layerType.WMS)) {
        newBaseLayer.setProjection({ crs: _this.map.crs });
      }
      _this.map.setBaseLayer(newBaseLayer).then(() => {
        _this.map.baseLayer.setOpacity(1.0, true);
      });

    } else {
      _this._baseMap2Layer = null;
      _this._baseMap2Idx = null;
      _this._baseMap2NodeFromGallery.hidden = false;
      _this._baseMap2NodeFromGallery = null;
    }
  };


  /**
   * Ajusta el label con el porcentaje de opacidad del slider.
   * @param {HTMLElement} sliderInputControl Input del slider.
   */
  const _updateOpacityLabelPosition = function(sliderInputControl) {
    const _this = this;
    const label = _this.div.querySelector('.' + _this.CLASS + '-slider-input-container > span');

    const sliderWidth = sliderInputControl.offsetWidth;
    const labelWidth = label.offsetWidth;

    const min = parseInt(sliderInputControl.min);
    const max = parseInt(sliderInputControl.max);
    const val = parseInt(sliderInputControl.value);

    const thumbSize = 14;
    const percent = (val - min) / (max - min);
    const x = percent * (sliderWidth - thumbSize) + thumbSize / 2;

    // Ajustar para centrar el label horizontalmente sobre el thumb
    label.style.left = `${x - labelWidth / 2}px`;
    label.textContent = val + '%';
  };


  /**
   * Actualiza la opacidad del mapa secundario.
   * @param {HTMLElement} sliderInputControl Input del slider.
   * @private
   */
  const _updateBasemapOpacity = function(sliderInputControl) {
    const _this = this;

    console.log('=== _updateBasemapOpacity called ===');
    console.log('secondaryMap:', _this.secondaryMap);
    console.log('secondaryMap.baseLayer:', _this.secondaryMap?.baseLayer);

    // Check if secondary map and baseLayer are available
    if (!_this.secondaryMap) {
      console.log('ERROR: No secondaryMap, returning');
      return;
    }

    if (!_this.secondaryMap.baseLayer) {
      console.log('ERROR: No secondaryMap.baseLayer, returning');
      return;
    }

    const value = parseInt(sliderInputControl.value) / 100.0;

    // Ensure value is between 0 and 1
    const opacityValue = Math.max(0, Math.min(1, value));

    console.log('Slider value:', sliderInputControl.value);
    console.log('Calculated opacity (0-1):', opacityValue);

    // Set opacity using SITNA's setOpacity method (returns Promise)
    console.log('Calling setOpacity with value:', opacityValue);
    _this.secondaryMap.baseLayer.setOpacity(opacityValue, true).then(function() {
      console.log('setOpacity Promise resolved');
      // After opacity is set, try to access OpenLayers layer directly to force update
      const layer = _this.secondaryMap.baseLayer;

      console.log('Layer object:', layer);
      console.log('layer.wrap:', layer.wrap);
      console.log('layer.wrap.layer:', layer.wrap?.layer);
      console.log('layer.olLayer:', layer.olLayer);
      console.log('layer.getOLayer:', typeof layer.getOLayer);
      console.log('layer._olLayer:', layer._olLayer);

      // Try to access OpenLayers layer if available
      if (layer.wrap && layer.wrap.layer) {
        console.log('Using layer.wrap.layer (OpenLayers TileLayer)');
        const olLayer = layer.wrap.layer;
        console.log('OpenLayers layer:', olLayer);
        console.log('Current opacity:', olLayer.getOpacity ? olLayer.getOpacity() : 'getOpacity not available');
        olLayer.setOpacity(opacityValue);
        console.log('After setOpacity:', olLayer.getOpacity ? olLayer.getOpacity() : 'getOpacity not available');
      } else if (layer.olLayer) {
        console.log('Using layer.olLayer');
        console.log('Current opacity:', layer.olLayer.getOpacity ? layer.olLayer.getOpacity() : 'getOpacity not available');
        layer.olLayer.setOpacity(opacityValue);
        console.log('After setOpacity:', layer.olLayer.getOpacity ? layer.olLayer.getOpacity() : 'getOpacity not available');
      } else if (layer.getOLayer) {
        console.log('Using layer.getOLayer()');
        const olLayer = layer.getOLayer();
        console.log('olLayer from getOLayer:', olLayer);
        if (olLayer) {
          console.log('Current opacity:', olLayer.getOpacity ? olLayer.getOpacity() : 'getOpacity not available');
          olLayer.setOpacity(opacityValue);
          console.log('After setOpacity:', olLayer.getOpacity ? olLayer.getOpacity() : 'getOpacity not available');
        }
      } else if (layer._olLayer) {
        console.log('Using layer._olLayer');
        console.log('Current opacity:', layer._olLayer.getOpacity ? layer._olLayer.getOpacity() : 'getOpacity not available');
        layer._olLayer.setOpacity(opacityValue);
        console.log('After setOpacity:', layer._olLayer.getOpacity ? layer._olLayer.getOpacity() : 'getOpacity not available');
      } else {
        console.log('WARNING: No OpenLayers layer found to set opacity on!');
      }

      // Force map redraw if available
      if (_this.secondaryMap.getMap) {
        const olMap = _this.secondaryMap.getMap();
        console.log('Got OpenLayers map:', olMap);
        if (olMap && olMap.render) {
          console.log('Calling olMap.render()');
          olMap.render();
        }
      }
      console.log('=== _updateBasemapOpacity complete ===');
    }).catch(function(error) {
      console.error('setOpacity Promise REJECTED:', error);
      // If setOpacity fails, try direct OpenLayers access
      const layer = _this.secondaryMap.baseLayer;
      console.log('Trying fallback direct OpenLayers access');
      if (layer.wrap && layer.wrap.layer) {
        console.log('Fallback: Using layer.wrap.layer');
        layer.wrap.layer.setOpacity(opacityValue);
      } else if (layer.olLayer) {
        console.log('Fallback: Using layer.olLayer');
        layer.olLayer.setOpacity(opacityValue);
      } else if (layer.getOLayer) {
        console.log('Fallback: Using layer.getOLayer()');
        const olLayer = layer.getOLayer();
        if (olLayer) {
          olLayer.setOpacity(opacityValue);
        }
      } else if (layer._olLayer) {
        console.log('Fallback: Using layer._olLayer');
        layer._olLayer.setOpacity(opacityValue);
      }
    });
  };

})();
