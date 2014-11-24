var crypto = require( 'crypto' );

var Security = exports.Security = {

  makeSalt: function() {
    return Math.round( ( new Date().valueOf() * Math.random() ) ) + '';
  },

  getAuthToken: function() {
    return crypto.createHash( 'sha256' ).update( this.makeSalt() +
      this.makeSalt() ).digest( 'hex' );
  },

  encryptPassword: function( password ) {
    var salt = this.makeSalt();
    return 'SHA-1:' + salt + ':' + crypto.createHash( 'sha1' ).update( salt + password ).digest( 'hex' );
  },

  // To keep from returning things like password in responses.
  censorResponse: function( object, censors ) {
    var censored = {};
    for ( var key in (object._doc || object ) ) {
      if ( ! (key in censors) )
        censored[key] = object[key];
    }

    return censored;
  }

}