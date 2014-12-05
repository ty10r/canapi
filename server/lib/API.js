var fs = require( 'fs' );


//*******************************************
//* HTTP API RESPONSE
//********************************************

// Generic JSON Response
var JsonResponse = exports.JsonResponse = function( params, response, code ) {
	var code = code && code !== 200 ? code : 200;
	response.time = new Date();
	response.status( code ).json( params );
};

// Generic server error Response
var ServerErrorResponse = exports.ServerErrorResponse = function( error, response ) {
	console.error( error );
	JsonResponse( error, response, 500 );
}
