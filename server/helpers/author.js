'use strict';
// # Author Helper
// Usage: `{{author}}` OR `{{#author}}{{/author}}`

var hbs = require( 'express-hbs' );
var _ = require( 'lodash' );
var utils = require( './utils' );

/**
 * Can be used as either an output or a block helper
 *
 * Output helper: `{{author}}`
 * Returns the full name of the author of a given post, or a blank string
 * if the author could not be determined.
 *
 * Block helper: `{{#author}}{{/author}}`
 * This is the default handlebars behaviour of dropping into the author object scope
 */
function author( context, options ) {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  if ( _.isUndefined( options ) ) {
    options = context;
  }

  if ( options.fn ) {
    return hbs.handlebars.helpers.with.call( this, this.author, options );
  }

  var autolink = _.isString( options.hash.autolink ) && options.hash.autolink === 'false' ? false : true;
  var output = '';

  if ( this.author && this.author.name ) {
    if ( autolink ) {
      output = utils.linkTemplate({
        url: '/author/' + this.author.slug + '/',
        text: _.escape( this.author.name )
      });
    } else {
      output = _.escape( this.author.name );
    }
  }

  return new hbs.handlebars.SafeString( output );
}

module.exports = author;
