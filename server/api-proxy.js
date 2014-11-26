var api = require(API_CORE),
		raml = require( 'raml-parser' );

// Class: ApiProxy
// Loads GH api data and creates request rules based on it
//
var ApiProxy = exports.ApiProxy = function( router ) {
	this.router = router;
	this.apiSchema = {};
	this.INVPATHERROR = "Invalid API path";

	// Regexes for fixing path formats
	this.uriParamRegex = /\/\{[^\}]+\}/;
	this.obReg = /\/\{/g;
	this.cbReg = /\}/g;

	// Store URI validation functions to stop from creating redundant middleware
	this.URIParamTypes = {};
}

ApiProxy.prototype.init = function ( callback ) {
	var scope = this;

	raml.loadFile( 'github.raml' ).then( function( data ) {
		scope.apiSchema = data;
		scope.generateAPI();
		callback();
	}, function( error ) {
		process.exit(1);
	});
};

// Post-order traverse of Resource tree
ApiProxy.prototype.traverseResTree = function( res, fn, absPath ) {
	var cleanPath = this.formatUriSegment(absPath + (res.relativeUri || ''));

	if ( res.resources !== undefined ) {
		for ( var i = 0; i < res.resources.length; i++ ) {
			this.traverseResTree( res.resources[i], fn, cleanPath );
		}
	}
	fn( res, cleanPath );
	return;
};

// Generate whole list of endpoints and validation
ApiProxy.prototype.generateAPI = function() {

	this.traverseResTree( this.apiSchema, this.buildEndpoint.bind(this), '/api-github-com' )

};

ApiProxy.prototype.buildEndpoint = function( res, absPath ) {
	// Do validation of uri params
	this.validateResource( res );

	// Create actual endpoint
	if ( 'methods' in res ) {
		for ( var i = 0; i < res.methods.length; i++ ) {
			this.makeRoute( absPath, res.methods[i].method, res );
		}
	}

}

ApiProxy.prototype.makeRoute = function( absPath, method, res ) {
	if ( method === 'get' ) {
		this.router.get( absPath, function( request, response ) {
			// TODO: validate reqest params
			// TODO: make call to actual endpoint
			// TODO: return response
			console.log( 'You got ' + absPath );
			api.JsonResponse( 'Get request recieved @: ' + absPath, response, 200 );
			return;
		});
	} else if ( method === 'post' ) {
		this.router.post( absPath, function( request, response ) {
			// TODO: validate post params
			// TODO: make call to actual endpoint
			// TODO: return response
			console.log( 'You posted to ' + absPath );
			api.JsonResponse( 'Post recieved @: ' + absPath, response, 200 );
			return;
		});
	}
}

//******************************************************
//* Middleward Generation
//* Section is to generate middle-ware for URI parameter
//* type checking
//******************************************************


ApiProxy.prototype.validateResource = function ( res ) {
	if ( ! res.relativeUri ) return;

	if ( res.uriParameters ) {
		for ( key in res.uriParameters ) {
			this.validateURIParam( key, res.uriParameters[key].type );
		}
	}
	return;
}


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


//******************************************************
//* Utility functions
//******************************************************

ApiProxy.prototype.formatUriSegment = function ( uriSegment ) {
	// Build the endpoint path string, replace '/{param}' with '/:param'

	return uriSegment.replace(this.obReg, '/:').replace(this.cbReg, '');

}