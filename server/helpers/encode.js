'use strict';
// # Encode Helper

var hbs = require( 'express-hbs' );
var encode;

/**
 * Usage:  `{{encode uri}}`
 *
 * Returns URI encoded string
 */
function encode( context, str ) {
  var uri = context || str;
  return new hbs.handlebars.SafeString( encodeURIComponent( uri ) );
}

module.exports = encode;
