(function () {
  // Ensure TC.control namespace exists
  TC.control = TC.control || {};

  // Check if already registered
  if (TC.control.HelloWorld) {
    return;
  }

  class HelloWorldControl extends SITNA.control.Control {
    constructor() {
      super(...arguments);
      this.title = 'Hello World';
      this.message =
        'This control is registered from Angular and rendered via a Handlebars template.';
      this.buttonLabel = 'Say hello';
      this._helloButton = null;
      this._handleButtonClick = this._handleButtonClick.bind(this);
    }

    async loadTemplates() {
      if (this.template && this.template[this.CLASS]) {
        return;
      }

      this.template = this.template || {};
      this.template[this.CLASS] =
        'assets/js/patch/templates/hello-world-control/HelloWorld.hbs';
    }

    async render(callback) {
      const data = {
        title: this.title,
        message: this.message,
        buttonLabel: this.buttonLabel,
      };

      return this._set1stRenderPromise(
        this.renderData(data, () => {
          this.addUIEventListeners();
          if (typeof callback === 'function') {
            callback();
          }
        })
      );
    }

    addUIEventListeners() {
      const rootElement = this.div || this;
      if (this._helloButton) {
        this._helloButton.removeEventListener('click', this._handleButtonClick);
      }
      this._helloButton = rootElement
        ? rootElement.querySelector('.tc-ctl-hello-world__button')
        : null;

      if (this._helloButton) {
        this._helloButton.addEventListener('click', this._handleButtonClick);
      }
    }

    _handleButtonClick() {
      const mapTitle =
        (this.map &&
          this.map.baseLayer &&
          (this.map.baseLayer.title || this.map.baseLayer.id)) ||
        'the active basemap';
      window.alert(`Hello from SITNA! You are viewing ${mapTitle}.`);
    }
  }

  // Register in TC.control namespace for SITNA auto-instantiation
  TC.control.HelloWorld = HelloWorldControl;

  // Also register on window for backward compatibility
  window.HelloWorldControl = HelloWorldControl;

  // Register as custom element (optional, for web component usage)
  if (!customElements.get('hello-world-control')) {
    customElements.define('hello-world-control', HelloWorldControl);
  }
})();


