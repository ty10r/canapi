// TEMPORARY test to view the structure output of raml-parser module
var raml = require( 'raml-parser' );
var fs = require( 'fs' );

raml.loadFile( 'github.raml' ).then( function( data ) {
	console.log( data.resources[0].resources[1].methods[0] );
	// fs.writeFile('./github-api.json', data, function( error ) {
	// 	if ( error ) console.log( error );
	// 	else console.log('JSON saved');
	// });
	// data.resources.forEach( function( resource ) {
	// 	if ( resource.resources ) console.log(resource.resources);
	// });
}, function( error ) {
	console.log( 'Error parsing: ' + error );
});