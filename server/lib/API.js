var fs = require( 'fs' );


//*******************************************
//* HTTP API RESPONSE
//********************************************

// Generic JSON Response
var JsonResponse = exports.JsonResponse = function( params, response, code ) {
	// var code = code && code !== 200 ? code : 200;
	var responseObject = params;
	// {
	// 	status: code === 200 ? 'success' : 'error',
	// 	time: new Date(),
	// 	data: params
	// };
	response.json( responseObject, code );
};
