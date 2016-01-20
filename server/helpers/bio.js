'use strict';

var hbs = require( 'express-hbs' );

/**
 * VERY naive implementation of bio "helper": just return the bio as a safestring
 *
 * `this` will be a deceased WP Author object
 *
 * @return {String} Bio
 */
function bio() {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  return new hbs.handlebars.SafeString(
    this.bio
  );
}

module.exports = bio;
