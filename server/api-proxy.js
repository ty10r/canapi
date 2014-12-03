var api = require(API_CORE),
		raml = require( 'raml-parser' )
		REQUEST = require( 'request' );


var INVPATHERROR 			= "Invalid API path",
 		INVPARAMERROR 		= "Invalid Query Parameter value",
 		MISSINGPARAMERROR = "Missing Query Parameter ";


// Class: ApiProxy
// Loads GH api data and creates request rules based on it
// Validates all get request parameters. Extraneous parameters are ignored
var ApiProxy = exports.ApiProxy = function( router ) {
	this.router = router;
	this.apiSchema = {};

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
		scope.baseUri = scope.apiSchema.baseUri;
		scope.localBaseUri = '/api-github-com'; 	// TODO: replace this with general base
		scope.generateAPI();
		callback();
	}, function( error ) {
		callback(error);
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

	this.traverseResTree( this.apiSchema, this.buildEndpoint.bind(this), this.localBaseUri )

};

ApiProxy.prototype.buildEndpoint = function( res, absPath ) {
	// Do validation of uri params
	this.validateResource( res );
	// Create actual endpoint
	if ( 'methods' in res ) {
		for ( var i = 0; i < res.methods.length; i++ ) {
			this.makeRoute( absPath, res.methods[i], res );
		}
	}

}

ApiProxy.prototype.makeRoute = function( absPath, methodObj ) {
	var scope = this;
	var remoteURI = scope.baseUri + absPath.replace( this.localBaseUri + '/', '' ); // TODO: Make more standard, validate baseURI from raml
	if ( methodObj.method === 'get' ) {
		// Setup getParamValidation object
		var getParamValidators = {};
		for ( paramName in methodObj.queryParameters ) {
			getParamValidators[paramName] = this.makeValidatorList( methodObj.queryParameters[paramName] );
		}
		// Create actual get endpoint
		this.router.get( absPath, function( request, response ) {
			var invalidParams = scope.validateQuery( request.query, getParamValidators );
			if ( invalidParams ) {
				api.JsonResponse( 'Errors: ' + invalidParams, response, 400 );
				return;
			}
			// make call to actual endpoint
			scope.makeGetRequestTo( remoteURI, request.query, function( error, res, body) {
				// return response
				api.JsonResponse( body, response, res.statusCode );
				return;
			});
		});



	} else if ( methodObj.method === 'post' ) {
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

// Uses list of validator functions on query parameters
// Returns undefined if all valid, string errors otherwise
ApiProxy.prototype.validateQuery = function( query, validators ) {
	var validationErrors = [];
	for ( paramName in validators ) {
		validators[paramName].forEach( function( validator ) {
			var paramError = validator( query[paramName] );
			if ( paramError ) validationErrors.push(paramName + ' : ' + paramError);
		})
	}
	if (validationErrors.length == 0) return undefined;
	return validationErrors;
}

ApiProxy.prototype.makeValidatorList = function( queryRules ) {
	var validators = [];
	// Required parameter validator
	if ( queryRules.required && !queryRules.default ) {
		validators.push( function( paramValue ) {
			if ( !paramValue ) {
				return MISSINGPARAMERROR;
			}
			return undefined;
		});
	}
	// Enum values validator
	if ( queryRules.enum ) {
		validators.push( this.generateEnumValidator( queryRules.type.enum, queryRules.required) );
	}
	// TODO Check if I need to validate string param type in anyway
	return validators;
}

ApiProxy.prototype.generateEnumValidator = function( enumList, isRequired ) {
	var validateEnum = function( enumList, paramValue ) {
		if ( !isRequired && !paramValue ) return undefined;

		var isCorrect = false;
		for ( var i = 0; i < enumList.length; i++ ) {
			if ( paramValue == enumList[i] ) isCorrect = true;
		}
		if ( !isCorrect ) {
			return INVPARAMERROR;
		}

		return undefined;
	}
	return validateEnum;
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
		scope.validateStrInt( paramValue, ( type == 'integer' ) );
		req[param] = paramValue;
		next();
	});
};


ApiProxy.prototype.respondInvPath = function( ) {
	api.JsonResponse(INVPATHERROR, {}, 400 );
}


//******************************************************
//* Utility functions
//******************************************************

ApiProxy.prototype.formatUriSegment = function ( uriSegment ) {
	// Build the endpoint path string, replace '/{param}' with '/:param'

	return uriSegment.replace(this.obReg, '/:').replace(this.cbReg, '');

}

// TODO: Check if APIs often have string/int listed as a string parameter
// Ex api.com/{string}/bar becomes api.com/foo123/bar or only api.com/foo/bar
ApiProxy.prototype.validateStrInt = function ( param, isInt ) {
	if ( ( isInt && isNaN( param ) ) || ( !isInt && !isNaN( param ) ) ) {
		this.respondInvPath();
		return;
	}
};

// Utility request to the remote of your choice
ApiProxy.prototype.makeGetRequestTo = function( url, params, callback ) {
	var fullUrl = url;
	if ( params ) fullUrl += '?'
	for ( param in params ) {
		fullUrl += ( param + '=' + params[param] + '&' );
	}
	this.makeRequestTo( fullUrl, callback );
}

ApiProxy.prototype.makeRequestTo = function ( url, callback ) {
	var options = {
		url: url, headers: { 'User-Agent': 'node.js' }
	};
	REQUEST( options, callback );
}