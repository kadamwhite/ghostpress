'use strict';

var WP = require( 'wordpress-rest-api' );
var http = require( 'http' );
var url = require( 'url' );
var parseLinkHeader = require( 'parse-link-header' );
var bluebird = require( 'bluebird' );

// Create the WP instance, but give it a dummy endpoint
var wp = new WP({
  endpoint: 'temporary-endpoint'
});

var siteInfo = {};

var config = require( './config' );

// Get the site hostname from the configuration file
// Run it through url.parse to ensure we just get the "host"
// component (http.request will choke on a full URL)
var wpHost = url.parse( config.wp.url ).host;

// Discover the proper API endpoint URL by requesting that
// URL and inspecting its headers
var wpReady = new bluebird.Promise(function( resolve, reject ) {
  var req = http.request({
    method: 'HEAD',
    host: wpHost,
    port: 80,
    path: '/'
  }, function( response ) {
    var headers = parseLinkHeader( response.headers.link );

    // If we detect a WP-API relation link header,
    if ( headers[ 'https://api.w.org/' ] ) {
      // Modify the internal endpoint within our WP object. (There will
      // eventually be a method to do this auto-discovery on the WP
      // service itself, to obviate the need to manipulate internal
      // instance properties in this way.)
      wp._options.endpoint = headers[ 'https://api.w.org/' ].url;

      // Query the API endpoint directly to get meta-information about the
      // site, such as the site title (name) and site description.
      wp.root().then(function( apiRoot ) {
        siteInfo.name = apiRoot.name;
        siteInfo.description = apiRoot.description;
        siteInfo.url = apiRoot.url;
      }).then( resolve, reject );
    } else {
      reject( new Error( 'No WP-API endpoint found for ' + config.wp.url ) );
    }
  });
  req.end();
  req.on( 'error', reject );
});

module.exports = {
  info: siteInfo,
  ready: wpReady,
  service: wp
};
