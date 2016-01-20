'use strict';
// ### Page URL Helper
//
// *Usage example:*
// `{{page_url 2}}`

var permalinks = require( '../services/permalinks' );

/**
 * Returns the URL for the page specified in the current object context.
 */
function page_url( context, block ) {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  var url = '';

  if ( this.tagSlug !== undefined ) {
    url += permalinks.tag( this );
  }

  if ( this.authorSlug !== undefined ) {
    url += permalinks.author( this );
  }

  if ( context > 1 ) {
    url += '/page/' + context;
  }

  url += '/';

  return url;
}

module.exports = page_url;
