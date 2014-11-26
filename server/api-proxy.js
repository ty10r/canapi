var api = require(API_CORE),
		raml = require( 'raml-parser' );

// Class: ApiProxy
// Loads GH api data and creates request rules based on it
//
var ApiProxy = exports.ApiProxy = function( router ) {
	this.router = router;
	this.apiSchema = {};
	this.INVPATHERROR = "Invalid API path";

	// Store URI validation functions to stop from creating redundant middleware
	this.URIParamTypes = {};
}

ApiProxy.prototype.init = function ( callback ) {
	var scope = this;

	raml.loadFile( 'github.raml' ).then( function( data ) {
		scope.apiSchema = data;
		scope.generateValidation();
		callback();
	}, function( error ) {
		process.exit(1);
	});
};

// Post-order traverse of Resource tree
ApiProxy.prototype.traverseResTree = function( res, fn ) {
	if ( res.resources !== undefined ) {
		for ( var i = 0; i < res.resources.length; i++ ) {
			this.traverseResTree( res.resources[i], fn );
		}
	}
	fn( res );
	return;
};

ApiProxy.prototype.validateResource = function ( res ) {
	if ( ! res.relativeUri ) return;

	if ( res.uriParameters ) {
		for ( key in res.uriParameters ) {
			this.validateURIParam( key, res.uriParameters[key].type );
		}
	}
	return;
}


//******************************************************
//* Middleward Generation
//* Section is to generate middle-ware for URI parameter
//* type checking
//******************************************************

ApiProxy.prototype.generateValidation = function() {

	this.traverseResTree( this.apiSchema, this.validateResource.bind(this) )

};

ApiProxy.prototype.validateURIParam = function ( param, type ) {
	var scope = this;
	// Don't create redundant uri validation middleware
	if ( scope.URIParamTypes[param] === type ) return;

	scope.URIParamTypes[param] = type;
	scope.router.param( param, function( req, res, next, paramValue ) {
		scope.validateURIStrInt( paramValue, ( type == 'integer' ) );
		req[param] = paramValue;
		next();
	});
};

// TODO: Check if APIs often have string/int listed as a string parameter
// Ex api.com/{string}/bar becomes api.com/foo123/bar or only api.com/foo/bar
ApiProxy.prototype.validateURIStrInt = function ( param, isInt ) {
	if ( ( isInt && isNaN( param ) ) || ( !isInt && !isNaN( param ) ) ) {
		this.respondInvPath();
		return;
	}
};

ApiProxy.prototype.respondInvPath = function( ) {
	api.JsonResponse(this.INVPATHERROR, {}, 400 );
}