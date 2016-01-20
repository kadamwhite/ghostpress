'use strict';
// # URL helper
// Usage: `{{url}}`, `{{url absolute="true"}}`

var permalinks = require( '../services/permalinks' );

/**
 * Returns the URL for the current object scope i.e. If inside a post scope will return post permalink.
 */
function url( options ) {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */

  if ( this._type === 'post' ) {
    return permalinks.post( this );
  }

  if ( this._type === 'tag' ) {
    return permalinks.tag( this );
  }

  if ( this._type === 'author' ) {
    return permalinks.author( this );
  }

  if ( this._type === 'nav' ) {
    return permalinks.nav( this );
  }

  return permalinks.root();
}

module.exports = url;
