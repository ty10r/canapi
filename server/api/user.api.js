var mongoose = require( 'mongoose' ),
		api = require( API_CORE ),
		User = mongoose.model( 'User' ),
		Utils = require( UTILS_PATH ),
		express = require( 'express' );


//*********************************************
//* User API Endpoints
//* Includes initial ghateway signup
//*********************************************
exports.bind = function( app ) {
	var userRouter = express.Router();

	var userResponse = function( user, responseObj ) {
		var censoredFields = { passwords: true, extAuthTokens: true };
		var censoredUser = Utils.Security.censorResponse( user, censoredFields );
		api.JsonResponse( censoredUser, responseObj, 200 );
	}

	var invalidAuthResponse = function( responseObj ) {
 	  api.JsonResponse( 'Invalid userName/password combination.', responseObj, 400 );
 	  return;
	}

	// User input validation middleware
	userRouter.use( function( request, response, next ) {
		if ( !request.body.password ) {
			api.JsonResponse( 'ERROR: Please provide a password.', response, 400 );
			return;
		}
		if ( ! request.body.userName ) {
			api.JsonResponse( 'ERROR: Please provide a userName.', response, 400 );
			return;
		}
		next();
	});

	// Registration
	userRouter.post( '/register', function( request, response ) {
		// Create newUser object and setup auth data
		var newUser = new User({
			userName: request.body.userName
		});
		newUser.password = Utils.Security.encryptPassword( request.body.password );
		newUser.authToken = Utils.Security.getAuthToken();

		// Assuming no error return the new user object.
		newUser.save( function( error, user ) {
			if ( error ) {
				api.ServerErrorResponse( error, response );
				return;
			}
			userResponse( user, response );
		});

	});

	// Resends auth token to user.
	userRouter.post( '/authorize', function( request, response ) {
		User.findOne({ userName: request.body.userName },
			function( error, existingUser ) {
			 	if ( error ) {
			 		api.ServerErrorResponse( error, response );
			 		return;
			 	}
			 	if ( !existingUser ) {
			 	  invalidAuthResponse( response );
			 	}
			 	if ( existingUser.checkPassword( request.body.password ) ) {
			 		userResponse( existingUser, response );
			 	} else {
			 		invalidAuthResponse( response );
			 	}
			 });
	});

	// Link user router to application
	app.use( '/user', userRouter );

}
