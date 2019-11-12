///////////////////////////////////////////////////////////////////////////////
// Highlight Extension
// by Adrian Albisser, September 2019
//
///////////////////////////////////////////////////////////////////////////////

class HighlightFace extends Autodesk.Viewing.Extension {
  constructor(viewer, options) {
    super(viewer, options);
    this.viewer = viewer;

    this.hitPoint = null;
    this.HighlightFace = null;
    this.currentIbs = [];
    this.currentFragId = null;

    this.buttonHighlightFace = new Autodesk.Viewing.UI.Button(
      'button-highlight-face'
    );
  }

  load() {
    console.log('HighlightFace is loaded!');

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
    console.log('HighlightFace is now unloaded!');

    this.viewer.removeEventListener(
      Autodesk.Viewing.SELECTION_CHANGED_EVENT,
      this.onItemSelected
    );

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
    if (this.buttonHighlightFace.getState()) {
      let screenPoint = {
        x: event.clientX,
        y: event.clientY
      };

      this.hitPoint = this.viewer.impl.hitTest(screenPoint.x, screenPoint.y);

      if (this.hitPoint) this.drawFaces(this.hitPoint);
    }
    return false;
  }

  drawFaces(hitPoint) {
    if (this.HighlightFace != null) {
      // remove the last triangle face
      this.resetFace();
    }

    this.currentFragId = hitPoint.fragId;

    // render proxy
    let renderProxy = this.viewer.impl.getRenderProxy(
      this.viewer.model,
      this.currentFragId
    );

    // Transformation from fragment space to WCS
    let matrix = renderProxy.matrixWorld;
    // Index array of the vertices
    let indices = renderProxy.geometry.ib;
    // Position array of the fragment
    let positions = renderProxy.geometry.vb;
    // Unit range of the  vertices in the position array
    let stride = renderProxy.geometry.vbstride;
    // Normal of this facet
    if (!hitPoint.face) return;
    let normal = hitPoint.face.normal;

    this.HighlightFace = new THREE.Group();

    for (let i = 0; i < indices.length; i += 3) {
      let vA = new THREE.Vector3();
      let vB = new THREE.Vector3();
      let vC = new THREE.Vector3();

      let iA = indices[i];
      let iB = indices[i + 1];
      let iC = indices[i + 2];

      vA.fromArray(positions, iA * stride);
      vB.fromArray(positions, iB * stride);
      vC.fromArray(positions, iC * stride);

      vA.applyMatrix4(matrix);
      vB.applyMatrix4(matrix);
      vC.applyMatrix4(matrix);

      // build THREE.js face
      let geomface = new THREE.Geometry();

      // Offset the temporary triangle above the native face
      let offset = 5;
      vA.x += normal.x * offset;
      vA.y += normal.y * offset;
      vA.z += normal.z * offset;
      vB.x += normal.x * offset;
      vB.y += normal.y * offset;
      vB.z += normal.z * offset;
      vC.x += normal.x * offset;
      vC.y += normal.y * offset;
      vC.z += normal.z * offset;

      geomface.vertices.push(
        new THREE.Vector3(vA.x, vA.y, vA.z),
        new THREE.Vector3(vB.x, vB.y, vB.z),
        new THREE.Vector3(vC.x, vC.y, vC.z)
      );

      // Face sequence
      let face = new THREE.Face3(0, 1, 2);
      // Face color
      face.color = new THREE.Color(0xff0000);
      // Add face to THREE.js geometry and compute normal
      geomface.faces.push(face);
      geomface.computeFaceNormals();

      // Create Material
      let localmaterial = new THREE.MeshBasicMaterial({
        vertexColors: THREE.VertexColors,
        transparent: true,
        opacity: 0.3
      });

      // Find faces with the same normal
      if (this.isNormalEqual(normal, geomface.faces[0].normal)) {
        let mesh = new THREE.Mesh(geomface, localmaterial);
        this.HighlightFace.add(mesh);
        this.currentIbs.push(iA, iB, iC);
      }
    }

    this.viewer.impl.scene.add(this.HighlightFace);
    this.viewer.impl.sceneUpdated(true);
  }

  isNormalEqual(hitNormal, faceNormal) {
    if (
      Math.round(hitNormal.x * Math.pow(10, 8)) / Math.pow(10, 8) ==
        Math.round(faceNormal.x * Math.pow(10, 8)) / Math.pow(10, 8) &&
      Math.round(hitNormal.y * Math.pow(10, 8)) / Math.pow(10, 8) ==
        Math.round(faceNormal.y * Math.pow(10, 8)) / Math.pow(10, 8) &&
      Math.round(hitNormal.z * Math.pow(10, 8)) / Math.pow(10, 8) ==
        Math.round(faceNormal.z * Math.pow(10, 8)) / Math.pow(10, 8)
    ) {
      return true;
    } else {
      return false;
    }
  }

  resetFace() {
    this.viewer.impl.scene.remove(this.HighlightFace);
    this.HighlightFace = null;
    this.currentIbs = [];
    this.currentFragId = null;
    this.viewer.impl.sceneUpdated(true);
  }

  createUI() {
    this.buttonHighlightFace.setState(false);

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

    this.buttonHighlightFace.onClick = event => {
      this.buttonHighlightFace.setState(!this.buttonHighlightFace.getState());
      toggleButtonStyle(this.buttonHighlightFace);
      this.resetFace();
    };
    this.buttonHighlightFace.setIcon('icon-face');
    this.buttonHighlightFace.addClass('button-highlight-face');
    this.buttonHighlightFace.setToolTip('Highlight Face');

    this.subToolbar = new Autodesk.Viewing.UI.ControlGroup('highlight-face');

    this.subToolbar.addControl(this.buttonHighlightFace);
    this.viewer.toolbar.addControl(this.subToolbar);
  }
}

Autodesk.Viewing.theExtensionManager.registerExtension(
  'HighlightFace',
  HighlightFace
);
