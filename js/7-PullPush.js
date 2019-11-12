///////////////////////////////////////////////////////////////////////////////
// PullPush Extension
// by Adrian Albisser, September 2019
//
///////////////////////////////////////////////////////////////////////////////

class PullPushFace extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.viewer = viewer;

    this.isDragging = false;
    this.screenPoint = null;
    this.hitPoint = null;
    this.coPlanarV = [];
    this.positions = [];
    this.stride = null;
    this.faceNormal = null;
    this.renderProxy = null;

    this.buttonPullFace = new Autodesk.Viewing.UI.Button('button-pull-face');
    this.buttonPushFace = new Autodesk.Viewing.UI.Button('button-push-face');
  }

  load() {
    console.log('PullPushFace is loaded!');

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

  unload() {
    console.log('PullPushFace is now unloaded!');

    this.viewer.toolbar.removeControl(this.subToolbar);

    return true;
  }

  waitForToolbarCreation() {
    this.viewer.removeEventListener(
      Autodesk.Viewing.TOOLBAR_CREATED_EVENT,
      this.waitForToolbarCreation
    );
    this.createUI();
  }

  normalize(screenPoint) {
    var viewport = this.viewer.navigation.getScreenViewport();

    var n = {
      x: (screenPoint.x - viewport.left) / viewport.width,
      y: (screenPoint.y - viewport.top) / viewport.height
    };

    return n;
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
    this.screenPoint = {
      x: event.clientX,
      y: event.clientY
    };

    if (this.isDragging) {
      let face = this.hitPoint.face;
      let faceNormal = face.normal;
      let fragId = this.hitPoint.fragId;

      let renderProxy = this.viewer.impl.getRenderProxy(
        this.viewer.model,
        fragId
      );

      let positions = renderProxy.geometry.vb;
      const stride = renderProxy.geometry.vbstride;

      for (let i = 0; i < this.coPlanarV.length; i++) {
        if (this.buttonPullFace.getState()) {
          positions[this.coPlanarV[i] * stride] += 0.5 * faceNormal.x;
          positions[this.coPlanarV[i] * stride + 1] += 0.5 * faceNormal.y;
          positions[this.coPlanarV[i] * stride + 2] += 0.5 * faceNormal.z;
        }
        if (this.buttonPushFace.getState()) {
          positions[this.coPlanarV[i] * stride] -= 0.5 * faceNormal.x;
          positions[this.coPlanarV[i] * stride + 1] -= 0.5 * faceNormal.y;
          positions[this.coPlanarV[i] * stride + 2] -= 0.5 * faceNormal.z;
        }
      }

      renderProxy.geometry.vbNeedsUpdate = true;
      this.viewer.impl.invalidate(false, false, true);
      this.viewer.impl.sceneUpdated();
    }

    return false;
  }

  handleButtonDown(event, button) {
    if (this.buttonPullFace.getState() || this.buttonPushFace.getState()) {
      this.isDragging = true;

      this.hitPoint = this.viewer.impl.hitTest(
        this.screenPoint.x,
        this.screenPoint.y
      );

      let face = this.hitPoint.face;
      let fragId = this.hitPoint.fragId;
      let renderProxy = this.viewer.impl.getRenderProxy(
        this.viewer.model,
        fragId
      );

      let indices = renderProxy.geometry.ib;
      let distinctIndices = [...new Set(indices)];

      let stride = renderProxy.geometry.vbstride;
      let positions = renderProxy.geometry.vb;

      let vA = new THREE.Vector3();
      let vB = new THREE.Vector3();
      let vC = new THREE.Vector3();

      let iA = face.a;
      let iB = face.b;
      let iC = face.c;

      vA.fromArray(positions, iA * stride);
      vB.fromArray(positions, iB * stride);
      vC.fromArray(positions, iC * stride);

      for (let i = 0; i < distinctIndices.length; i++) {
        let vD = new THREE.Vector3(
          positions[distinctIndices[i] * stride],
          positions[distinctIndices[i] * stride + 1],
          positions[distinctIndices[i] * stride + 2]
        );

        if (this.isCoPlanar(vA, vB, vC, vD)) {
          this.coPlanarV.push(i);
        }
      }
      return true;
    }
    return false;
  }

  handleButtonUp(event, button) {
    if (this.buttonPullFace.getState() || this.buttonPushFace.getState()) {
      this.isDragging = false;
      this.coPlanarV = [];
      this.hitPoint = null;
      return true;
    }
    return false;
  }

  tripleProduct(a, b, c) {
    return a.clone().dot(new THREE.Vector3().crossVectors(b, c));
  }

  isCoPlanar(a, b, c, d) {
    var ab = b.clone().sub(a);
    var ac = c.clone().sub(a);
    var ad = d.clone().sub(a);
    return this.tripleProduct(ab, ac, ad) === 0;
  }

  createUI() {
    this.buttonPullFace.setState(false);
    this.buttonPushFace.setState(false);

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

    this.buttonPullFace.onClick = event => {
      this.buttonPullFace.setState(!this.buttonPullFace.getState());
      console.log('buttonPullFace state: ', this.buttonPullFace.getState());
      this.viewer.model.unconsolidate();
      toggleButtonStyle(this.buttonPullFace);
    };

    this.buttonPullFace.setIcon('icon-pull');
    this.buttonPullFace.addClass('button-pull');
    this.buttonPullFace.setToolTip('Pull');

    this.buttonPushFace.onClick = event => {
      this.buttonPushFace.setState(!this.buttonPushFace.getState());
      console.log('buttonPullFace state: ', this.buttonPushFace.getState());
      this.viewer.model.unconsolidate();
      toggleButtonStyle(this.buttonPushFace);
    };
    this.buttonPushFace.setIcon('icon-push');
    this.buttonPushFace.addClass('button-push');
    this.buttonPushFace.setToolTip('Push');

    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup('drag-face');

    this.subToolbar.addControl(this.buttonPullFace);
    this.subToolbar.addControl(this.buttonPushFace);
    this.viewer.toolbar.addControl(this.subToolbar);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  'PullPushFace',
  PullPushFace
);
