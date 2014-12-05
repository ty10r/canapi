var api = require(API_CORE),
		raml = require( 'raml-parser' )
		REQUEST = require( 'request' ),
		ProxyUtils = require( UTILS_PATH ).Proxy;


var INVPATHERROR 			= "Invalid API path",
 		INVPARAMERROR 		= "Invalid Query Parameter value",
 		MISSINGPARAMERROR = "Missing Query Parameter ";


/**
 * Creates a new ApiProxy.
 * @class
 * @classdesc An ApiProxy built from a RAML file. Uses config file to include various middlewares.
 *            Loads a raml file and builds endpoint and parameter verification.
 */
var ApiProxy = exports.ApiProxy = function( router ) {
	this.router = router;
	this.apiSchema = {};

	// Regexes for fixing path formats
	this.uriParamRegex = /\/\{[^\}]+\}/;
	this.obReg = /\/\{/g;
	this.cbReg = /\}/g;

	// Store URI validation functions to stop from creating redundant middleware
	this.URIParamTypes = {};

	// Hold configuration for this api
	this.config = {};
}


/**
 * Parses API Raml file
 * sets member variables
 * Initializes the ApiProxy endpoints and middlewares ( path/parameter validation,
 * login requirement, OAuth requirement)
 * @function
 * @memberof ApiProxy
 * @param {Object} config The Api configuration details. Contains middleware parameters and raml location
 * @config {String} [raml] Path the the api's raml file
 * @config {Boolean} [loginRequired] Boolean value setting user login requirement for this API
 * @config {String} [access_token] OAuth access token for this API
 * @param {Function} callback A callback taking only a parameter for possible error output
*/

ApiProxy.prototype.init = function ( config, callback ) {
	var scope = this;

	raml.loadFile( config.raml ).then( function( data ) {
		scope.apiSchema = data;
		scope.baseUri = scope.apiSchema.baseUri;
		// format baseUri
		if( scope.baseUri.indexOf('/', scope.baseUri.length - 1) !== -1 ) {
			scope.baseUri = scope.baseUri.substring( 0, scope.baseUri.length - 1 );
		}


		// Check config for requiring login for this api
		scope.config = config;
		if ( config.loginRequired ) {
			var loginMiddleware = scope.requireLogin();
			scope.router.use( loginMiddleware );
		}

		scope.localBaseUri = config.localPath; 	// TODO: replace this with general base
		scope.generateAPI();
		if ( scope.config.logRequests ) {
			LogRequests = require( __dirname + '/log-requests.js' );
			scope.router.use( LogRequests() );
		}

		callback();
	}, function( error ) {
		callback(error);
	});
};





//******************************************************
//* API Proxy endpoint structure generation
//* Section is to generate the structure of the API
//* Proxy endpoints
//******************************************************

/**
 * Generates API Endpoints with their URI and parameter validation middleware
 * @function
 * @memberof ApiProxy
*/
ApiProxy.prototype.generateAPI = function() {

	this.traverseResTree( this.apiSchema, this.buildEndpoint.bind(this), '' )

};

/**
 * Post-order traversal the resource tree of a parsed RAML file
 * @function
 * @memberof ApiProxy
 * @param {Object} res The current node/resource object
 * @param {Function} fn The function to be applied to the res
 * @param {String} absPath The combination of all uri segments before this node, used to build endpoint paths
*/
ApiProxy.prototype.traverseResTree = function( res, fn, absPath ) {
	var cleanPath = ProxyUtils.formatUriSegment(absPath + (res.relativeUri || ''));

	if ( res.resources !== undefined ) {
		for ( var i = 0; i < res.resources.length; i++ ) {
			this.traverseResTree( res.resources[i], fn, cleanPath );
		}
	}
	fn( res, cleanPath );
	return;
};

/**
 * Builds an endpoint for all accessible resource paths
 * Creates validation middleware for URIs of each path
 * @function
 * @memberof ApiProxy
 * @param {Object} res The current node/resource object
 * @param {String} absPath The combination of all uri segments before this node, used to build endpoint paths
*/
ApiProxy.prototype.buildEndpoint = function( res, absPath ) {
	var scope = this;
	// Do validation of uri params
	this.validateResource( res );

	// Attach API data to all response objects
	this.router.all( absPath, function( request, response, next ) {
		response.locals._API = scope.config.name;
		next();
	});

	// Check if OAuth verification is required for all methods on this endpoint
	var oauthReq = false;
	if ( res.securedBy ) {
		oauthReq = true;
		for ( var i = 0; i < res.securedBy.length; i++ ) {
			if ( res.securedBy[i] === null ) {
				oauthReq = false;
			}
		}
	}
	// OAuth required, attach middleware to all methods of this path
	if ( oauthReq ) {
		this.router.all( absPath, function( request, response, next ) {
			var authorized = scope.attachOauth( request, response );
			if ( !authorized ) {
				return;
			}
			next();
		});
	}

	// Create actual method endpoints
	if ( 'methods' in res ) {
		for ( var i = 0; i < res.methods.length; i++ ) {
			this.makeRoute( absPath, res.methods[i], res );
		}
	}
}

/**
 * Adds a route to this API's router for each method available
 * Checks if OAuth is required for the endpoint and includes middleware if necessary
 * The route created returns any middleware errors detected or the response from the target API
 * @function
 * @memberof ApiProxy
 * @param {String} absPath The combination of all uri segments before this node, used to build endpoint paths
 * @param {Object} methodObj Method object listed by the parsed raml schema
*/
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
		this.router.get( absPath, function( request, response, next ) {
			response.locals.destination = remoteURI;
			// Validate query parameters
			var invalidParams = scope.validateQuery( request.query, getParamValidators );
			if ( invalidParams ) {
				api.JsonResponse( 'Errors: ' + invalidParams, response, 400 );
				next();
			}

			// make call to remote endpoint
			ProxyUtils.makeGetRequestTo( remoteURI, request.query, function( error, res, body ) {
				if ( error ) console.log( error );
				// return response
				api.JsonResponse( body, response, res.statusCode );
				next();
			});
		});



	} else if ( methodObj.method === 'post' ) {
		this.router.post( absPath, function( request, response, next ) {
			response.locals.destination = remoteURI;
			// @TODO: validate post params
			ProxyUtils.makePostRequestTo( remoteURI, request.body, function( error, res, body ) {
				if ( error ) console.log( error );
				// return response
				api.JsonResponse( body, response, res.statusCode );
				next();
			});
		});


	} else if ( methodObj.method === 'put' ) {
		this.router.put( absPath, function( request, response, next ) {
			response.locals.destination = remoteURI;
			ProxyUtils.makePutRequestTo( remoteURI, function( error, res, body ) {
				if ( error ) console.log( error );
				// return response
				api.JsonResponse( body, response, res.statusCode );
				next();
			});
		})


	} else if ( methodObj.method === 'delete' ) {
		this.router.put( absPath, function( request, response, next ) {
			response.locals.destination = remoteURI;
			ProxyUtils.makeDeleteRequestTo( remoteURI, function( err, res, body ) {
				if ( error ) console.log( error );
				api.JsonResponse( body, response, res.statusCode );
				next();
			});
		});
	}
}

/**
 * Validates the format of query parameters based on RAML schema specifications
 * @function
 * @memberof ApiProxy
 * @param {Object} query Query parameters and their values as recieved by Canapi server
 * @param {Object} validators Map of validator functions required for each parameter
 * @return {String} Validation failures of recieved query paramaters. Undefined if none are found
*/
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

/**
 * Makes a list of validator functions required for a parameter based on the queryRules
 * @function
 * @memberof ApiProxy
 * @param {Object} queryRules Rules for a query parameter as provided by a parsed RAML schema
 * @return {Array} A list of functions to check the validity of a query parameter
*/
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

/**
 * Makes an enumeration validator based on the possible values of the enumeration and whether it is required
 * @function
 * @memberof ApiProxy
 * @param {Array} enumList Possible String values for an enumeration parameter
 * @return {Function} A validation function to check the validity of an enumeration URI parameter
*/
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
//* URI Middleware Generation
//* Section is to generate middle-ware for URI parameter
//* type checking
//******************************************************

/**
 * Validates each URI Parameter found in a resource path of a parsed RAML Schema
 * @function
 * @memberof ApiProxy
 * @param {Object} res The resource object taken from a parsed RAML schema.
*/
ApiProxy.prototype.validateResource = function ( res ) {
	if ( ! res.relativeUri ) return;

	if ( res.uriParameters ) {
		for ( key in res.uriParameters ) {
			this.validateURIParam( key, res.uriParameters[key].type );
		}
	}
	return;
}

/**
 * Adds middle ware for a URI parameter based on the type indicated by parsed RAML Schema
 * @function
 * @memberof ApiProxy
 * @param {String} the URI Parameter name
 * @param {String} type indicates the type of the URI paramater labeled by param
*/
ApiProxy.prototype.validateURIParam = function ( param, type ) {
	var scope = this;
	// Don't create redundant uri validation middleware
	if ( scope.URIParamTypes[param] === type ) return;

	scope.URIParamTypes[param] = type;
	scope.router.param( param, function( req, res, next, paramValue ) {
		ProxyUtils.validateStrInt( paramValue, ( type == 'integer' ) );
		req[param] = paramValue;
		next();
	});
};

/**
 * Sends a static json response indicating an invalid path requested
 * @function
 * @memberof ApiProxy
*/
ApiProxy.prototype.respondInvPath = function( ) {
	api.JsonResponse(INVPATHERROR, {}, 400 );
}




//********************************************************
//* User Required Middleware
//* If an API is configured to be login protected, we will
//* load this widdleware
//********************************************************

/**
 * Creates the Middleware necessary for requiring a user to login before accessing an API
 * @function
 * @memberof ApiProxy
 * @return {Function} UserRequiredApi the middleware for requiring user login
*/
ApiProxy.prototype.requireLogin = function() {
	var mongoose = require( 'mongoose' );
	var User = mongoose.model( 'User' );

	/**
	 * Middleware function for requiring user login
	 * @function
	 * @param {Object} request The request object passed to this endpoint by Express router
	 * @param {Object} response The response object passed to this endpoint by Express router
	 * @param {Function} next The next function to be called in the middleware chain - handled by Express router
	*/
	var UserRequiredApi = function( request, response, next ) {
		if ( !request.cookies || !request.cookies.authToken ) {
			api.JsonResponse( "This API requires Canapi authorization. Register at /register or log-in at /authorize", response, 403 );
			return;
		}

		var user = User.findOne({ authToken: request.cookies.authToken },
										function( error, user ) {
											if ( error ) {
												api.ServerErrorResponse( error, response );
												return;
											}
											request.canapiUser = user;
		});
		if ( !request.canapiUser ) {
			api.JsonResponse( "This API requires Canapi authorization. Register at /register or log-in at /authorize", response, 403 );
			return;
		}
		next();
	};
	return UserRequiredApi;
}


/**
 * Middleware for requiring OAuth access token for an API
 * Access token should be listed in API configuration
 * @function
 * @memberof ApiProxy
 * @param {Object} request The request object passed by Express router
 * @param {Object} response The response object passed by Express router
 * @return {Boolean} False if a necessary OAuth token was not found, True otherwise
*/
ApiProxy.prototype.attachOauth = function( request, response ) {
	if ( !this.config.access_token ) {
		api.JsonResponse( "This API requires an OAuth access token. See server configuration", response, 403 );
		return false;
	}
	request.query.access_token = this.config.access_token;
	return true;
}