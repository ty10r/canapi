var crypto = require( 'crypto' )
    REQUEST = require( 'request' );

/**
 * Utility functions and values needed across the application
 * @module utils
 * @exports {Object} Security submodule of security utility functions
 * @exports {Object} Proxy submodule of proxy utility functions
*/

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

};

var Proxy = exports.Proxy = {
  obReg: /\/\{/g,
  cbReg: /\}/g,
  formatUriSegment: function ( uriSegment ) {
    // Build the endpoint path string, replace '/{param}' with '/:param'

    return uriSegment.replace(this.obReg, '/:').replace(this.cbReg, '');

  },
  validateStrInt: function ( param, isInt ) {
    if ( ( isInt && isNaN( param ) ) || ( !isInt && !isNaN( param ) ) ) {
      this.respondInvPath();
      return;
    }
  },

  // Utility request to the remote of your choice
  makeGetRequestTo: function( url, params, callback ) {
    var fullUrl = url;
    if ( params ) fullUrl += '?'
    for ( param in params ) {
      fullUrl += ( param + '=' + params[param] + '&' );
    }
    this.makeRequestTo( fullUrl, callback );
  },

  makeRequestTo: function ( url, callback ) {
    var options = {
      url: url, headers: { 'User-Agent': 'node.js' }
    };
    REQUEST( options, callback );
  }
};