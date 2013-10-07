function changeControlsIndex() {
    if (lastControlsIndex == controlsIndex) {
      if (index != controlsIndex && controlsIndex > -2) {
        // new object or camera to control
        if (controlsIndex > -2) {
          if (index > -1) objects[index].material.color.setHex(0xefefef);
          index = controlsIndex;
          if (index > -1) objects[index].material.color.setHex(0x0000ff);
        }
      };
    }; 
    lastControlsIndex = controlsIndex;
};

function focusObject(frame) {
    var hl = frame.hands.length;
    var fl = frame.pointables.length;

    if (hl == 1 && fl == 1) {
      var f = frame.pointables[0];
      var cont = $(renderer.domElement);
      var coords = transform(f.tipPosition, cont.width(), cont.height());
      var vpx = (coords[0]/cont.width())*2 - 1;
      var vpy = -(coords[1]/cont.height())*2 + 1;
      var vector = new THREE.Vector3(vpx, vpy, 0.5);
      projector.unprojectVector(vector, camera);
      var raycaster = new THREE.Raycaster(camera.position, vector.sub(camera.position).normalize());
      var intersects = raycaster.intersectObjects(objects);
      if (intersects.length > 0) { 
        var i = 0;
        while(!intersects[i].object.visible) i++;
        var intersected = intersects[i];
        return objects.indexOf(intersected.object);
      } else {
        return -1;
      };
    };

    return -2;
};

function transform(tipPosition, w, h) {
    var width = 150;
    var height = 150;
    var minHeight = 100;

    var ftx = tipPosition[0];
    var fty = tipPosition[1];
    ftx = (ftx > width ? width - 1 : (ftx < -width ? -width + 1 : ftx));
    fty = (fty > 2*height ? 2*height - 1 : (fty < minHeight ? minHeight + 1 : fty));
    var x = THREE.Math.mapLinear(ftx, -width, width, 0, w);
    var y = THREE.Math.mapLinear(fty, 2*height, minHeight, 0, h);
    return [x, y];
};

function showCursor(frame) {
	var hl = frame.hands.length;
	var fl = frame.pointables.length;
	
	if (hl == 1 && fl == 1) {
	  var f = frame.pointables[0];
	  var cont = $(renderer.domElement);
	  var offset = cont.offset();
	  var coords = transform(f.tipPosition, cont.width(), cont.height());
	  $("#cursor").css('left', offset.left + coords[0] - (($("#cursor").width() - 1)/2 + 1));
	  $("#cursor").css('top', offset.top + coords[1] - (($("#cursor").height() - 1)/2 + 1));
	} else {
	  $("#cursor").css('left', -1000);
	  $("#cursor").css('top', -1000);
	};
};   			

