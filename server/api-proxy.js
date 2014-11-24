var api = require(API_CORE),
		raml = require( 'raml-parser' );

// Class: ApiProxy
// Loads GH api data and creates request rules based on it
//
var ApiProxy = exports.ApiProxy = function( router ) {
	this.apiSchema = {};
	this.uriParamRegex = /\/\{[^\}]+\}$/;
}

ApiProxy.prototype.init = function ( callback ) {
	var scope = this;
	raml.loadFile( 'github.raml' ).then( function( data ) {
		scope.apiSchema = data;
		scope.generateURIValidation();
		callback();
	}, function( error ) {
		console.log( "Error while loading github.raml...exiting" );
		process.exit(1);
	});
};

// Post-order traverse of Resource tree
ApiProxy.prototype.traverseResTree = function( res, fn ) {
	fn( res );
	if (!res.resources) return;

	for ( var i = 0; i < res.resources.length; i++ ) {
		this.traverseResTree( res.resources[i], fn );
	}
};

function validateResource( res ) {
	if ( ! res.relativeUri ) return;

		// Extract uriParameters so we can make validation rules for them
	var uriTest = uriParamRegex.exec( res.relativeUri );
	if ( uriTest !== null ) {
		var uriParamName = uriTest[0].substr( uriTest.index, uriTest[0].length - 2 );
		console.log(uriParamName);
	}
}

ApiProxy.prototype.generateURIValidation = function() {
	console.log('in generate');
	// Uses router middleware to generate validation scheme
	// for URI parameters

	// TODO/PITFALL: This relies on a REST API not to define
	// multiple URI Parameters with the same name, but different type

	// TODO: fix support for Base URI Parameters

	this.traverseResTree( this.apiSchema, validateResource )

};