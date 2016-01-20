'use strict';
// Usage: `{{image}}`

/**
 * Returns the URL for the current object scope i.e. If inside a post scope will return image permalink
 */
function image( options ) {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  if ( this.image && typeof this.image === 'string' ) {
    return this.image;
  }
  if ( this.image && this.image.url ) {
    return this.image.url;
  }
}

module.exports = image;
