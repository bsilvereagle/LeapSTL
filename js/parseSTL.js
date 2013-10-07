var objectControls = [];
var objects = [];

function parseSTL(file) {
	//Determine the file's type with the 'typeReader' then parse
	//	as binary or ASCII accordingly
	var typeReader = new FileReader();
	

	//Closure to capture the file information.
	typeReader.onload = (function(theFile) {
		return function(e) {
			// Render thumbnail.
			console.log('Loaded first 80 bytes of '+theFile.name);
			if(e.target.result === 'solid') {
				console.log('File is ASCII');
				readAsASCII(theFile);
			} else {
				console.log('File is binary');
				readAsBinary(theFile);
			}
		};
	})(file);
		
	// Read in the STL file as binary data for the first 5 bytes.
	//	in ASCII the first portion should be the string 'solid'
	var blob = file.slice(0,5);
	typeReader.readAsBinaryString(blob);
}

function readAsASCII(file) {
	console.log(file);
	var reader = new FileReader();
	
	reader.onload = (function(theFile) {
		return function(e){
			parseStlASCII(e.target.result);
		};
	})(file);
	
	reader.readAsText(file);		  		
}

function readAsBinary(file) {
	console.log(file);
	var reader = new FileReader();
	
	reader.onload=(function(theFile) {
		return function(e){
			parseStlBinary(e.target.result);
		};
	})(file);
	
	reader.readAsArrayBuffer(file);		  		
}

function trim (str) {
    str = str.replace(/^\s+/, '');
    for (var i = str.length - 1; i >= 0; i--) {
        if (/\S/.test(str.charAt(i))) {
            str = str.substring(0, i + 1);
            break;
        }
    }
    return str;
}   

// Notes:
// - STL file format: http://en.wikipedia.org/wiki/STL_(file_format)
// - 80 byte unused header
// - All binary STLs are assumed to be little endian, as per wiki doc
var parseStlBinary = function(stl) {
    var geo = new THREE.Geometry();
    var dv = new DataView(stl, 80); // 80 == unused header
    var isLittleEndian = true;
    var triangles = dv.getUint32(0, isLittleEndian); 

    // console.log('arraybuffer length:  ' + stl.byteLength);
    // console.log('number of triangles: ' + triangles);
    
    var offset = 4;
    for (var i = 0; i < triangles; i++) {
        // Get the normal for this triangle
        try {
            var normal = new THREE.Vector3(
                dv.getFloat32(offset, isLittleEndian),
                dv.getFloat32(offset+4, isLittleEndian),
                dv.getFloat32(offset+8, isLittleEndian)
            );
            offset += 12;

            // Get all 3 vertices for this triangle
            for (var j = 0; j < 3; j++) {
                geo.vertices.push(
                    new THREE.Vector3(
                        dv.getFloat32(offset, isLittleEndian),
                        dv.getFloat32(offset+4, isLittleEndian),
                        dv.getFloat32(offset+8, isLittleEndian)
                    )
                );
                offset += 12
            }

            // there's also a Uint16 "attribute byte count" that we
            // don't need, it should always be zero.
            offset += 2;   
		} catch(err) {};
        // Create a new face for from the vertices and the normal             
        geo.faces.push(new THREE.Face3(i*3, i*3+1, i*3+2, normal));
    }

    // The binary STL I'm testing with seems to have all
    // zeroes for the normals, unlike its ASCII counterpart.
    // We can use three.js to compute the normals for us, though,
    // once we've assembled our geometry. This is a relatively 
    // expensive operation, but only needs to be done once.
    geo.computeFaceNormals();
	
    mesh = new THREE.Mesh( 
        geo,
        // new THREE.MeshNormalMaterial({
        //     overdraw:true
        // }
        new THREE.MeshLambertMaterial({
            overdraw:true,
            color: 0xa00000,
            shading: THREE.FlatShading
        }
    ));
    
    addControls(mesh);

    scene.add(mesh);

    stl = null;
};  

var parseStlASCII = function(stl) {
    var state = '';
    var lines = stl.split('\n');
    var geo = new THREE.Geometry();
    var name, parts, line, normal, done, vertices = [];
    var vCount = 0;
    stl = null;

    for (var len = lines.length, i = 0; i < len; i++) {
        if (done) {
            break;
        }
        line = trim(lines[i]);
        parts = line.split(' ');
        switch (state) {
            case '':
                if (parts[0] !== 'solid') {
                    console.error(line);
                    console.error('Invalid state "' + parts[0] + '", should be "solid"');
                    return;
                } else {
                    name = parts[1];
                    state = 'solid';
                }
                break;
            case 'solid':
                if (parts[0] !== 'facet' || parts[1] !== 'normal') {
                    console.error(line);
                    console.error('Invalid state "' + parts[0] + '", should be "facet normal"');
                    return;
                } else {
                    normal = [
                        parseFloat(parts[2]), 
                        parseFloat(parts[3]), 
                        parseFloat(parts[4])
                    ];
                    state = 'facet normal';
                }
                break;
            case 'facet normal':
                if (parts[0] !== 'outer' || parts[1] !== 'loop') {
                    console.error(line);
                    console.error('Invalid state "' + parts[0] + '", should be "outer loop"');
                    return;
                } else {
                    state = 'vertex';
                }
                break;
            case 'vertex': 
                if (parts[0] === 'vertex') {
                    geo.vertices.push(new THREE.Vector3(
                        parseFloat(parts[1]),
                        parseFloat(parts[2]),
                        parseFloat(parts[3])
                    ));
                } else if (parts[0] === 'endloop') {
                    geo.faces.push( new THREE.Face3( vCount*3, vCount*3+1, vCount*3+2, new THREE.Vector3(normal[0], normal[1], normal[2]) ) );
                    vCount++;
                    state = 'endloop';
                } else {
                    console.error(line);
                    console.error('Invalid state "' + parts[0] + '", should be "vertex" or "endloop"');
                    return;
                }
                break;
            case 'endloop':
                if (parts[0] !== 'endfacet') {
                    console.error(line);
                    console.error('Invalid state "' + parts[0] + '", should be "endfacet"');
                    return;
                } else {
                    state = 'endfacet';
                }
                break;
            case 'endfacet':
                if (parts[0] === 'endsolid') {
                    //mesh = new THREE.Mesh( geo, new THREE.MeshNormalMaterial({overdraw:true}));
                    mesh = new THREE.Mesh( 
                        geo, 
                        new THREE.MeshLambertMaterial({
                            overdraw:true,
                            color: 0x00aa00,
                            shading: THREE.FlatShading
                        }
                    ));
                    scene.add(mesh);
                    done = true;
                } else if (parts[0] === 'facet' && parts[1] === 'normal') {
                    normal = [
                        parseFloat(parts[2]), 
                        parseFloat(parts[3]), 
                        parseFloat(parts[4])
                    ];
                    if (vCount % 1000 === 0) {
                        //console.log(normal);
                    }
                    state = 'facet normal';
                } else {
                    console.error(line);
                    console.error('Invalid state "' + parts[0] + '", should be "endsolid" or "facet normal"');
                    return;
                }
                break;
            default:
                console.error('Invalid state "' + state + '"');
                break;
        }
    }
    addControls(mesh);
};

function addControls(mesh) {
	objectControl = new THREE.LeapObjectControls(camera, mesh);
	objectControl.rotateEnabled  = true;
	objectControl.rotateSpeed    = 3;
	objectControl.rotateHands    = 1;
	objectControl.rotateFingers  = [2, 3];
	
	objectControl.scaleEnabled   = true;
	objectControl.scaleSpeed     = 3;
	objectControl.scaleHands     = 1;
	objectControl.scaleFingers   = [4, 5];
	
	objectControl.panEnabled     = true;
	objectControl.panSpeed       = 3;
	objectControl.panHands       = 2;
	objectControl.panFingers     = [6, 12];
	objectControl.panRightHanded = false; // for left-handed person

	objects.push(mesh);
	objectControls.push(objectControl);


}
