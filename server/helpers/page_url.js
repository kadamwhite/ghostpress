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
    url += permalinks.tag({
      slug: this.tagSlug
    });
  }

  if ( this.authorSlug !== undefined ) {
    url += permalinks.author({
      slug: this.authorSlug
    });
  }

  if ( context > 1 ) {
    url += '/page/' + context;
  }

  url += '/';

  // De-dupe any unintentionally-doubled slashes resulting for inelegant demo code
  return url.replace( /\/+/g, '/' );
}

module.exports = page_url;
