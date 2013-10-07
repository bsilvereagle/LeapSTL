//Based on http://buildaweso.me/project/2013/2/25/converting-threejs-objects-to-stl-files

function stringifyVector(vec){
  return ""+vec.x+" "+vec.y+" "+vec.z;
}

function stringifyVertex(vec){
  return "vertex "+stringifyVector(vec)+" \n";
}

function exportObjects(){
	//Generate the ASCII STL file
	console.log('Exporting '+objects.length+' objects');
	var stl = 'solid LeapSTL\n';
	for(var i=0;i<objects.length;i++){
		var vertices = objects[i].geometry.vertices;
		var tris = objects[i].geometry.faces;
		for(var j=0;j<tris.length;j++){
			stl += ("facet normal "+stringifyVector( tris[j].normal )+" \n");
		    stl += ("outer loop \n");
		    stl += stringifyVertex( vertices[ tris[j].a ]);
		    stl += stringifyVertex( vertices[ tris[j].b ]);
		    stl += stringifyVertex( vertices[ tris[j].c ]);
		    stl += ("endloop \n");
		    stl += ("endfacet \n");
		}
	}
	stl += ("endsolid");
	
	var blob = new Blob([stl],{type: "text/plain"});
	
	saveAs(blob, 'LeapSTL.stl');   			
}
