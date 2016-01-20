'use strict';

var hbs = require( 'express-hbs' );

function asset( url, options ) {
  // Ensure there is precisely one leading slash on the URL
  // (all URLs passed to asset helper are assumed to be
  // root-relative, based on the express.static configuration)
  // and pass the results through Handlebars' SafeString
  return new hbs.handlebars.SafeString(
    '/' + url.replace( /^\/+/, '' )
  );

  // This solution is _notably devoid_ of any of the highly-useful caching
  // control code that exists within Ghost's own asset.js helper file!
}

module.exports = asset;
