///////////////////////////////////////////////////////////////////////////////
// AddObject Extension
// by Adrian Albisser, September 2019
//
///////////////////////////////////////////////////////////////////////////////

class AddObject extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.viewer = viewer;

    this.hitPoint = null;

    this.toggleAddObject = false;
  }

  load() {
    console.log('AddObject is loaded!');

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
    console.log('AddObject is now unloaded!');

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
    if (this.toggleAddObject) {
      const screenPoint = {
        x: event.clientX,
        y: event.clientY
      };

      const hitTest = this.viewer.impl.hitTest(screenPoint.x, screenPoint.y);

      if (hitTest !== null) this.hitPoint = hitTest.point;
    }

    return false;
  }

  handleSingleClick(event, button) {
    if (this.toggleAddObject) {
      let onProgress = xhr => {
        if (xhr.lengthComputable) {
          var percentComplete = (xhr.loaded / xhr.total) * 100;
          console.log(Math.round(percentComplete, 2) + '% downloaded');
        }
      };

      let onError = xhr => {};

      let loader = new THREE.OBJMTLLoader();
      loader.load(
        'models/tree.obj',
        'models/tree.mtl',
        object => {
          object.traverse(child => {
            if (child.material) {
              const materials = this.viewer.impl.getMaterials();
              materials.addMaterial(child.material.uuid, child.material, true);
            }
          });

          object.scale.set(1, 1, 1);
          object.position.x = this.hitPoint.x;
          object.position.y = this.hitPoint.y;
          object.position.z = this.hitPoint.z;

          this.viewer.impl.scene.add(object);
          this, viewer.impl.sceneUpdated(true);
        },
        onProgress,
        onError
      );

      return true;
    }

    return false;
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
    let buttonAddObject = new Autodesk.Viewing.UI.Button('button-add-object');
    buttonAddObject.setState(false);

    buttonAddObject.onClick = event => {
      this.toggleAddObject = !this.toggleAddObject;
      this.toggleButtonStyle(buttonAddObject);
    };

    buttonAddObject.setIcon('icon-tree');
    buttonAddObject.addClass('button-add-object');
    buttonAddObject.setToolTip('Add Object');

    // SubToolbar
    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup(
      'edit-shape-toolbar'
    );

    this.subToolbar.addControl(buttonAddObject);
    this.viewer.toolbar.addControl(this.subToolbar);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension('AddObject', AddObject);
