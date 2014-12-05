//*********************************************
//* Request Logging Middleware
//* @requires mongoose
//*********************************************
var mongoose = require( 'mongoose' ),
		User = mongoose.model( 'User' ),
		Request = mongoose.model( 'Request' );

module.exports = function() {
	return function( request, response, next ) {
			var userId = request.canapiUser ? request.canapiUser._id : null;
			var thisRequest = new Request({
				api: 					response.locals._API,
				method: 			request.method,
				destination: 	response.locals.destination,
				parameters: 	request.query || null,
				body: 				JSON.stringify(request.body),
				user: 				userId,
				statusCode: 	response.statusCode,
			});

			thisRequest.save( function( error, request ) {
				if ( error ) {
					console.log( "Error saving a request log:", error);
				}
			});

		next();
	}
}