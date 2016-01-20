'use strict';

var hbs = require( 'express-hbs' );

/**
 * VERY naive implementation of excerpt "helper": just return the excerpt
 * that WordPress provided in the API response.
 *
 * `this` will be a deceased WP Post object
 *
 * @return {String} Post excerpt
 */
function excerpt() {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  return new hbs.handlebars.SafeString( this.excerpt );
}

module.exports = excerpt;
