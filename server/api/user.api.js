var mongoose = require( 'mongoose' ),
		api = require( API_CORE ),
		User = mongoose.model( 'User' ),
		Utils = require( UTILS_PATH );

//*********************************************
//* Request Audits for auth protected endpoints
//*********************************************
var UserRequiredApi = function( request, response, next ) {
	if ( !request.cookies || !request.cookies.authToken ) {
		next();
		return;
	}

	var user = User.findOne({ authToken: request.cookies.authToken },
									function( error, user ) {
										if ( error ) {
											api.JsonResponse( error, response, 500 );
											return;
										}
										request.user = user;
	});
	if ( !request.user ) {
		api.JsonResponse( "That requires authorization.", response, 403 );
		return;
	}
};


//*********************************************
//* User API Endpoints
//* Includes initial ghateway signup
//*********************************************
exports.bind = function( app ) {

	// Registration
	app.post( '/register', function( request, response ) {
		if ( !request.body.password ) {
			api.JsonResponse( 'Please provide a password.', response, 400 );
		}

		// Create newUser object and setup auth data
		var newUser = new User({
			userName: request.body.userName
		});
		newUser.password = Utils.Security.encryptPassword( request.body.password );
		newUser.authToken = Utils.Security.getAuthToken();

		// Assuming no error return the new user object.
		newUser.save( function( error, user ) {
			if ( error ) {
				api.JsonResponse( error, response, 500 );
				return;
			}

			var censoredFields = {password: true, extAuthTokens: true};
			var censoredUser = Utils.Security.censorResponse( user, censoredFields );
			api.JsonResponse( censoredUser, response, 200 );
		});

	});
}
