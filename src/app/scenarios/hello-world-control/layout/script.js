document.querySelectorAll('.tc-map').forEach(function (elm) {
    const map = TC.Map.get(elm);

    if (map && !map._layoutDone) {
        map.ready(function () {
            const rcollapsedClass = TC.Consts.classes.COLLAPSED_RIGHT || 'right-collapsed';
            const toolsPanel = map.div.querySelector('.tc-tools-panel');

            if (toolsPanel) {
                // Toggle panel collapse on h1 click
                const panelTab = toolsPanel.querySelector('h1');
                if (panelTab) {
                    panelTab.addEventListener(SITNA.Consts.event.CLICK, function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        toolsPanel.classList.toggle(rcollapsedClass);
                    });
                }
            }
        });
    }
    map._layoutDone = true;
});

