'use strict';
// # Date Helper
// Usage: `{{date format="DD MM, YYYY"}}`, `{{date updated_at format="DD MM, YYYY"}}`

var moment = require( 'moment' );

/**
 * Formats a date using moment.js. Formats published_at by default but will also
 * take a date as a parameter.
 *
 * From https://github.com/TryGhost/Ghost/blob/master/core/server/helpers/date.js
 */
function date( context, options ) {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  if ( ! options && context.hasOwnProperty( 'hash' ) ) {
    options = context;
    context = undefined;

    // set to published_at by default, if it's available
    // otherwise, this will print the current date
    if ( this.published_at ) {
      context = this.published_at;
    }
  }

  // ensure that context is undefined, not null, as that can cause errors
  context = context === null ? undefined : context;

  var f = options.hash.format || 'MMM Do, YYYY';
  var timeago = options.hash.timeago;
  var date;

  if ( timeago ) {
    date = moment( context ).fromNow();
  } else {
    date = moment( context ).format( f );
  }
  return date;
}

module.exports = date;
