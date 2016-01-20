'use strict';
// # Tags Helper
// Usage: `{{tags}}`, `{{tags separator=' - '}}`

var hbs = require( 'express-hbs' );
var _ = require( 'lodash' );
var utils = require( './utils' );
var tags;

/**
 * Returns a string of the tags on the post.
 *
 * By default, tags are separated by commas.
 *
 * Note that the standard {{#each tags}} implementation is unaffected by this helper
 *
 * From https://github.com/TryGhost/Ghost/blob/master/core/server/helpers/tags.js
 */
function tags( options ) {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  options = options || {};
  options.hash = options.hash || {};

  var autolink  = ! ( _.isString( options.hash.autolink ) && options.hash.autolink === 'false' );
  var separator = _.isString( options.hash.separator ) ? options.hash.separator : ', ';
  var prefix  = _.isString( options.hash.prefix ) ? options.hash.prefix : '';
  var suffix  = _.isString( options.hash.suffix ) ? options.hash.suffix : '';
  var limit  = options.hash.limit ? parseInt( options.hash.limit, 10 ) : undefined;
  var from  = options.hash.from ? parseInt( options.hash.from, 10 ) : 1;
  var to  = options.hash.to ? parseInt( options.hash.to, 10 ) : undefined;
  var output = '';

  function createTagList( tags ) {
    if ( autolink ) {
      return _.map( tags, function( tag ) {
        return utils.linkTemplate( {
          url: '/tag/' + tag.slug + '/',
          text: _.escape( tag.name )
        });
      });
    }
    return _( tags ).pluck( 'name' ).each( _.escape );
  }

  if ( this.tags && this.tags.length ) {
    output = createTagList( this.tags );
    from -= 1; // From uses 1-indexed, but array uses 0-indexed.
    to = to || limit + from || this.tags.length;

    output = prefix + output.slice( from, to ).join( separator ) + suffix;
  }

  return new hbs.handlebars.SafeString( output );
}

module.exports = tags;
