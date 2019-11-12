///////////////////////////////////////////////////////////////////////////////
// Geometry Extension
// by Adrian Albisser, September 2019
//
///////////////////////////////////////////////////////////////////////////////

class AddGeometry extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.viewer = viewer;
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

    return true;
  }

  createUI() {
    let buttonAddBox = new Autodesk.Viewing.UI.Button('button-add-box');

    buttonAddBox.onClick = event => {
      // Create Three.js primitive
      const geometry = new THREE.BoxGeometry(4, 4, 4);
      const material = new THREE.MeshBasicMaterial({ color: 0xff0000 });

      const mesh = new THREE.Mesh(geometry, material);

      // Add materials to the viewer
      const materials = this.viewer.impl.getMaterials();
      materials.addMaterial('Unique Material Name', material, true);

      // Add mesh to the scene
      this.viewer.impl.scene.add(mesh);
      // Update the scene
      this.viewer.impl.sceneUpdated(true);
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
