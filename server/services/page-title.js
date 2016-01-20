'use strict';

var wp = require( './wp' );

function capitalize( str ) {
  return str.split( ' ' ).map(function( word ) {
    return word[ 0 ].toUpperCase() + word.slice( 1 );
  }).join( ' ' );
}

/**
 * Take a string or array of strings, and make a title out of them
 *
 * @param  {String[]|String} titleComponents Array of strings or a string
 * @return {[type]}                 [description]
 */
function pageTitle( titleComponents ) {
  if ( ! titleComponents ) {
    titleComponents = [];
  } else if ( typeof titleComponents === 'string' ) {
    titleComponents = [ titleComponents ];
  }

  titleComponents.push( wp.info.title );

  // Title-case & add | hierarchy delimiters
  return titleComponents.map(function( component ) {
    return capitalize( component.trim() );
  }).join( ' | ' );
}

module.exports = pageTitle;
