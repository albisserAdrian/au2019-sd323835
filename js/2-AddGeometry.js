///////////////////////////////////////////////////////////////////////////////
// AddGeometry Extension
// by Adrian Albisser, September 2019
//
///////////////////////////////////////////////////////////////////////////////

class AddGeometry extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.viewer = viewer;

    this.colorPresets = [0x73ceff, 0x92cf00, 0xfff365, 0xffa923, 0xff1600];

    this.hitPoint = null;

    this.toggleAddBox = false;
  }

  load() {
    console.log('AddGeometry is loaded!');

    // Initiate Toolbar
    if (this.viewer.toolbar) {
      this.createUI();
    } else {
      this.viewer.addEventListener(
        Autodesk.Viewing.TOOLBAR_CREATED_EVENT,
        this.waitForToolbarCreation
      );
    }

    // Register Tool
    this.viewer.toolController.registerTool(this);
    this.viewer.toolController.activateTool('DemoTool');

    return true;
  }

  waitForToolbarCreation() {
    this.viewer.removeEventListener(
      Autodesk.Viewing.TOOLBAR_CREATED_EVENT,
      this.waitForToolbarCreation
    );
    this.createUI();
  }

  unload() {
    console.log('AddGeometry is now unloaded!');

    this.viewer.toolbar.removeControl(this.subToolbar);

    this.viewer.toolController.deactivateTool('DemoTool');
    this.viewer.toolController.unregisterTool(this);

    return true;
  }

  /**
   * Tool interface
   */
  getNames() {
    return ['DemoTool'];
  }

  getPriority = function() {
    return 100;
  };

  handleMouseMove(event) {
    if (this.toggleAddBox) {
      const screenPoint = {
        x: event.clientX,
        y: event.clientY
      };

      const hitTest = this.viewer.impl.hitTest(screenPoint.x, screenPoint.y);

      console.log('hitTest', hitTest);

      if (hitTest !== null) this.hitPoint = hitTest.point;
    }

    return false;
  }

  handleSingleClick(event, button) {
    if (this.toggleAddBox) {
      const geometry = new THREE.BoxGeometry(4, 4, 4);
      const color = Math.floor(Math.random() * 5 + 1);
      const material = this.createColorMaterial(this.colorPresets[color - 1]);

      const mesh = new THREE.Mesh(geometry, material);

      mesh.position.x = this.hitPoint.x;
      mesh.position.y = this.hitPoint.y;
      mesh.position.z = this.hitPoint.z + 2;

      const materials = this.viewer.impl.getMaterials();
      materials.addMaterial('Material Name', material, true);
      this.viewer.impl.scene.add(mesh);

      this.viewer.impl.sceneUpdated(true);

      return true;
    }

    return false;
  }

  createColorMaterial(randColor) {
    let viewer = this.viewer;
    const material = new THREE.MeshBasicMaterial({
      color: randColor
    });

    const materials = viewer.impl.getMaterials();

    materials.addMaterial(randColor.toString(16), material, true);

    return material;
  }

  toggleButtonStyle(button) {
    button.setState(!button.getState());
    if (button.getState()) {
      button.removeClass('inactive');
      button.addClass('active');
    } else {
      button.removeClass('active');
      button.addClass('inactive');
    }
  }

  createUI() {
    let buttonAddBox = new Autodesk.Viewing.UI.Button('button-add-box');
    buttonAddBox.setState(false);

    buttonAddBox.onClick = event => {
      this.toggleAddBox = !this.toggleAddBox;
      this.toggleButtonStyle(buttonAddBox);
    };

    buttonAddBox.setIcon('icon-box');
    buttonAddBox.addClass('button-add-box');
    buttonAddBox.setToolTip('Add Box');

    // SubToolbar
    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup(
      'edit-shape-toolbar'
    );

    this.subToolbar.addControl(buttonAddBox);
    this.viewer.toolbar.addControl(this.subToolbar);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  'AddGeometry',
  AddGeometry
);
