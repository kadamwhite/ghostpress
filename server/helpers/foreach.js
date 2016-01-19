'use strict';
// # Foreach Helper
// Usage: `{{#foreach data}}{{/foreach}}`
//
// Block helper designed for looping through posts

var hbs = require( 'express-hbs' );
var hbsUtils = hbs.handlebars.Utils;
var _ = require( 'lodash' );

/**
 * Block helper for iterating through posts
 *
 * Adapted from https://github.com/TryGhost/Ghost/blob/master/core/server/helpers/foreach.js
 */
function foreach( context, options ) {
  // Suppress JSHint errors on usage of "this" outside a prototype method:
  /* jshint validthis:true */
  if ( ! options ) {
    throw new Error( 'Iterator must specify a collection' );
  }
  var fn = options.fn;
  var inverse = options.inverse;
  var columns = options.hash.columns;
  var length = _.size( context );
  var limit = parseInt( options.hash.limit, 10 ) || length;
  var from = parseInt( options.hash.from, 10 ) || 1;
  var to = parseInt( options.hash.to, 10 ) || ( from - 1 ) + limit;
  var output = '';
  var data;
  var contextPath;

  if ( options.data && options.ids ) {
    contextPath = hbsUtils.appendContextPath( options.data.contextPath, options.ids[ 0 ] ) + '.';
  }

  if ( hbsUtils.isFunction( context ) ) {
    context = context.call( this );
  }

  if ( options.data ) {
    data = hbs.handlebars.createFrame( options.data );
  }

  function execIteration( field, index, last ) {
    if ( data ) {
      data.key = field;
      data.index = index;
      data.number = index + 1;
      data.first = index === from - 1; // From uses 1-indexed, but array uses 0-indexed.
      data.last = ! ! last;
      data.even = index % 2 === 1;
      data.odd = ! data.even;
      data.rowStart = index % columns === 0;
      data.rowEnd = index % columns === ( columns - 1 );

      if ( contextPath ) {
        data.contextPath = contextPath + field;
      }
    }

    output = output + fn( context[ field ], {
      data: data,
      blockParams: hbsUtils.blockParams([
        context[ field ],
        field
      ], [
        contextPath + field,
        null
      ])
    });
  }

  function iterateCollection( context ) {
    var count = 1;
    var current = 1;

    _.each( context, function( item, key ) {
      if ( current < from ) {
        current += 1;
        return;
      }

      if ( current <= to ) {
        execIteration( key, current - 1, current === to );
      }
      count += 1;
      current += 1;
    });
  }

  if ( context && typeof context === 'object' ) {
    iterateCollection( context );
  }

  if ( length === 0 ) {
    output = inverse( this );
  }

  return output;
}

module.exports = foreach;
