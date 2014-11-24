// TEMPORARY test to view the structure output of raml-parser module
var raml = require( 'raml-parser' );

raml.loadFile( 'github.raml' ).then( function( data ) {
	// console.log( data );
	data.resources.forEach( function( resource ) {
		if ( resource.resources ) console.log(resource.resources);
	});
}, function( error ) {
	console.log( 'Error parsing: ' + error );
});