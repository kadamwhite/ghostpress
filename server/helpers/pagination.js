'use strict';
// ### Pagination Helper
// `{{pagination}}`

var _ = require( 'lodash' );
var template = require( './template' );

/**
 * Outputs previous and next buttons, along with info about the current page
 */
function pagination( options ) {
  /* jshint validthis:true */
  /* jshint unused:false */
  if ( ! _.isObject( this.pagination ) || _.isFunction( this.pagination ) ) {
    return null;
  }

  if ( _.isUndefined( this.pagination.page ) || _.isUndefined( this.pagination.pages ) ||
    _.isUndefined( this.pagination.total ) || _.isUndefined( this.pagination.limit ) ) {
    throw new Error( 'pagination valuesMustBeDefined' );
  }

  if ( ( ! _.isNull( this.pagination.next ) && ! _.isNumber( this.pagination.next ) ) ||
    ( ! _.isNull( this.pagination.prev ) && ! _.isNumber( this.pagination.prev ) ) ) {
    throw new Error( 'pagination nextPrevValuesMustBeNumeric' );
  }

  if ( ! _.isNumber( this.pagination.page ) || ! _.isNumber( this.pagination.pages ) ||
    ! _.isNumber( this.pagination.total ) || ! _.isNumber( this.pagination.limit ) ) {
    throw new Error( 'pagination valuesMustBeNumeric' );
  }

  var context = _.merge( {}, this.pagination );

  if ( this.tag ) {
    context.tagSlug = this.tag.slug;
  }

  if ( this.author ) {
    context.authorSlug = this.author.slug;
  }

  return template.execute( 'pagination', context, options );
}

module.exports = pagination;
