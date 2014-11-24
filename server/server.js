var express = require( 'express' ),
    mongoose = require( 'mongoose' ),
    fs = require( 'fs' ),
    cookieParser = require( 'cookie-parser' ),
    bodyParser = require( 'body-parser' ),
    expressValidator = require( 'express-validator' );

//*******************************************
//* GLOBAL VARS (accessible from anywhere)
//*******************************************
require( './globals.js' );



//*******************************************
//* DATABASE INIT
//*******************************************
var connect = function() {
  var options = { server: { socketOptions: {keepAlive: 1 } } };
  mongoose.connect( CONFIG.db, options );
}
connect();

// Handle errors
mongoose.connection.on( 'error', function( err ) {
  console.log( err );
});

// Reconnect on disconnect
mongoose.connection.on( 'disconnected', function(err) {
    connect();
});

// Bootstrap models
var models_path = __dirname + '/models';
fs.readdirSync(models_path).forEach(function (file) {
  if (~file.indexOf('.js')) require(models_path + '/' + file)
});



//*******************************************
//* Server FAILURE listener
//*******************************************
process.on( 'uncaughtException', function( error ) {
  console.error( error.stack ? error.stack : error );
  process.exit(1);
});



process.env.TZ = 'UTC';

//*******************************************
//* Server initialization
//*******************************************
var app = express();
// Body parser for parameter reading
app.use( bodyParser() );
// Cookie parser for authentication cookies later
app.use( cookieParser() );
// Validator which will help with validating request params
app.use( expressValidator() );



//*******************************************
//* Server Start
//*******************************************
app.listen( CONFIG.port, function( error ) {
  if ( error ) {
    console.error( error );
  }
  else {
    console.log( 'Listening on Port: ' + CONFIG.port );
  }
});
