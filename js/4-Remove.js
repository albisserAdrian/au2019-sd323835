///////////////////////////////////////////////////////////////////////////////
// Remove Extension
// by Adrian Albisser, September 2019
//
///////////////////////////////////////////////////////////////////////////////

class RemoveElement extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.viewer = viewer;

    this.hitPoint = null;
    this.colorPresets = [0x73ceff, 0x92cf00, 0xfff365, 0xffa923, 0xff1600];
    this.dbIds = null;

    this.buttonAddGeometry = new Autodesk.Viewing.UI.Button('button-add-box');
    this.buttonAddObject = new Autodesk.Viewing.UI.Button('button-add-object');
    this.buttonRemoveElement = new Autodesk.Viewing.UI.Button(
      'button-remove-element'
    );
  }

  load() {
    console.log('RemoveElement is loaded!');

    // Initiate Toolbar
    if (this.viewer.toolbar) {
      this.createUI();
    } else {
      this.viewer.addEventListener(
        Autodesk.Viewing.TOOLBAR_CREATED_EVENT,
        this.waitForToolbarCreation
      );
    }

    // Get all dbIds
    this.viewer.addEventListener(
      Autodesk.Viewing.OBJECT_TREE_CREATED_EVENT,
      () => {
        this.dbIds = this.getAllDbIds();
      }
    );

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
    console.log('RemoveElement is now unloaded!');

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
    if (this.buttonAddGeometry.getState() || this.buttonAddObject.getState()) {
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
    if (this.buttonAddGeometry.getState()) {
      this.addMesh();
      return true;
    }

    if (this.buttonAddObject.getState()) {
      this.addObject();
      return true;
    }

    if (this.buttonRemoveElement.getState()) {
      const pointer = event.pointer ? event.pointers[0] : event;

      const rayCaster = this.pointerToRaycaster(
        this.viewer.impl.canvas,
        this.viewer.impl.camera,
        pointer
      );

      const intersectResults = rayCaster.intersectObjects(
        this.viewer.impl.scene.children,
        true
      );

      const hitTest = this.viewer.model.rayIntersect(
        rayCaster,
        true,
        this.dbIds
      );

      const selections = intersectResults.filter(
        res => !hitTest || hitTest.distance > res.distance
      );

      this.RemoveElement(selections);

      return true;
    }

    return false;
  }

  getAllDbIds() {
    let viewer = this.viewer;
    const { instanceTree } = viewer.model.getData();

    const { dbIdToIndex } = instanceTree.nodeAccess;

    return Object.keys(dbIdToIndex).map(dbId => {
      return parseInt(dbId);
    });
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

  pointerToRaycaster(domElement, camera, pointer) {
    const pointerVector = new THREE.Vector3();
    const pointerDir = new THREE.Vector3();
    const ray = new THREE.Raycaster();

    const rect = domElement.getBoundingClientRect();

    const x = ((pointer.clientX - rect.left) / rect.width) * 2 - 1;
    const y = -((pointer.clientY - rect.top) / rect.height) * 2 + 1;

    if (camera.isPerspective) {
      pointerVector.set(x, y, 0.5);

      pointerVector.unproject(camera);

      ray.set(camera.position, pointerVector.sub(camera.position).normalize());
    } else {
      pointerVector.set(x, y, -1);

      pointerVector.unproject(camera);

      pointerDir.set(0, 0, -1);

      ray.set(pointerVector, pointerDir.transformDirection(camera.matrixWorld));
    }

    return ray;
  }

  addMesh() {
    const geometry = new THREE.BoxGeometry(25, 25, 14);
    const color = Math.floor(Math.random() * 5 + 1);
    const material = this.createColorMaterial(this.colorPresets[color - 1]);

    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.x = this.hitPoint.x;
    mesh.position.y = this.hitPoint.y;
    mesh.position.z = this.hitPoint.z + 7;

    const materials = this.viewer.impl.getMaterials();
    materials.addMaterial('Material Name', material, true);
    this.viewer.impl.scene.add(mesh);

    this.viewer.impl.sceneUpdated(true);
  }

  addObject() {
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
            child.material.side = THREE.DoubleSide;
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
  }

  RemoveElement(selections) {
    if (selections.length) {
      // Find root parent
      function findScene(object) {
        if (object.parent.type !== 'Scene') {
          return findScene(object.parent);
        } else {
          return object;
        }
      }

      viewer.impl.scene.remove(findScene(selections[0].object));
      viewer.impl.sceneUpdated(true);
    }
  }

  createUI() {
    this.buttonAddGeometry.setState(false);
    this.buttonAddObject.setState(false);
    this.buttonRemoveElement.setState(false);

    let toggleButtonStyle = button => {
      if (button.getState()) {
        button.removeClass('inactive');
        button.addClass('active');

        for (let i = 0; i < this.subToolbar.getNumberOfControls(); i++) {
          const controlId = this.subToolbar.getControlId(i);
          const control = this.subToolbar.getControl(controlId);
          if (button._id !== controlId) {
            control.setState(false);
            control.removeClass('active');
            control.addClass('inactive');
          }
        }
      } else {
        button.removeClass('active');
        button.addClass('inactive');
      }
    };

    // Add Geometry Button
    this.buttonAddGeometry.onClick = event => {
      this.buttonAddGeometry.setState(!this.buttonAddGeometry.getState());
      toggleButtonStyle(this.buttonAddGeometry);
    };

    this.buttonAddGeometry.setIcon('icon-box');
    this.buttonAddGeometry.addClass('button-add-box');
    this.buttonAddGeometry.setToolTip('Add Box');

    // Add Object Button
    this.buttonAddObject.onClick = event => {
      this.buttonAddObject.setState(!this.buttonAddObject.getState());
      toggleButtonStyle(this.buttonAddObject);
    };

    this.buttonAddObject.setIcon('icon-tree');
    this.buttonAddObject.addClass('button-add-object');
    this.buttonAddObject.setToolTip('Add Tree');

    // Remove Element Button
    this.buttonRemoveElement.onClick = event => {
      this.buttonRemoveElement.setState(!this.buttonRemoveElement.getState());
      toggleButtonStyle(this.buttonRemoveElement);
    };

    this.buttonRemoveElement.setIcon('icon-delete');
    this.buttonRemoveElement.addClass('button-remove-element');
    this.buttonRemoveElement.setToolTip('Remove');

    // SubToolbar
    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup(
      'edit-shape-toolbar'
    );

    this.subToolbar.addControl(this.buttonAddGeometry);
    this.subToolbar.addControl(this.buttonAddObject);
    this.subToolbar.addControl(this.buttonRemoveElement);
    this.viewer.toolbar.addControl(this.subToolbar);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  'RemoveElement',
  RemoveElement
);
