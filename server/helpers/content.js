'use strict';

var hbs = require( 'express-hbs' );

/**
 * VERY naive implementation of content "helper": just return the content as a safestring
 *
 * `this` will be a deceased WP Post object
 *
 * @return {String} Post content
 */
function content() {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  return new hbs.handlebars.SafeString(
    this.content
  );
}

module.exports = content;
