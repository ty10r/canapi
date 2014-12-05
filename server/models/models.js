//*******************************************
//* USER MODEL
//* Necessary to link our authentication with
//* various auth protected APIs
//* @requires mongoose
//* @requires mongoose-unique-validator
//* @requires crypto
//*******************************************
var mongoose = require('mongoose'),
    uniqueValidator = require('mongoose-unique-validator'),
    Schema = mongoose.Schema,
    crypto = require('crypto');


var UserSchema = new Schema({
  userName:           { type: String, unique: true },
  password:           { type: String },
  authToken:          { type: String },
  extAuthTokens:      []
});


// Requirements
UserSchema.path('userName').required( true, 'Please provide a userName.');
UserSchema.plugin( uniqueValidator, { message: 'That userName is already in use.'} );

// Model Helpers
UserSchema.methods = {

  checkPassword: function( inPass ) {
    if ( !inPass ) inPass = '';
    var pwElements = this.password.split( ':', 3 );
    var algo = pwElements[0], salt = pwElements[1], validHash = pwElements[2];

    var hash = crypto.createHash( 'sha1' ).update( salt + inPass ).digest( 'hex' );
    return ( hash === validHash );
  }

};

// Exported MODEL
mongoose.model('User', UserSchema);


var RequestSchema = new Schema({
  api:            { type: String },
  method:         { type: String },
  destination:    { type: String },
  parameters:     [],
  body:           { type: String },
  user:           { type: Schema.Types.ObjectId, ref: 'User' },
  statusCode:     { type: Number },
  date:           { type: Date, default: Date.now }
});

// Exported MODEL
mongoose.model('Request', RequestSchema );


