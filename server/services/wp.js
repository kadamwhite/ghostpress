'use strict';
/**
 * This module handles WordPress discovery and interaction. Its responsibilities:
 *
 * 1. Discover the WP-API endpoint from a provided URL
 * 2. Look up basic blog information for use in the theme, such as site title/subtitle
 * 3. Alert the consumers of the WP service once the service instance is ready
 * 4. TODO: provide a caching wrapper for the wp service so that we can avoid re-
 *    requesting the same resources once they've been pulled down once
 */

var WP = require( 'wordpress-rest-api' );
var http = require( 'http' );
var request = require( 'request' );
var hbs = require( 'express-hbs' );
var url = require( 'url' );
var parseLinkHeader = require( 'parse-link-header' );
var bluebird = require( 'bluebird' );

// Create the WP instance, but give it a dummy endpoint
var wp = new WP({
  endpoint: 'temporary-endpoint'
});

var siteInfo = {};

var config = require( './config' );

/**
 * Function to be called with the API url, once we have found one
 * @param  {String} linkUrl href of the API <link>
 * @return {Promise} Promise that resolves once the API root has been inspected
 */
function foundLink( linkUrl ) {
  // Modify the internal endpoint within our WP object.
  wp._options.endpoint = linkUrl;

  // Query the API endpoint directly to get meta-information about the
  // site, such as the site title (name) and site description.
  return wp.root().then(function( apiRoot ) {
    siteInfo.title = apiRoot.name;
    siteInfo.description = apiRoot.description;
    // apiRoot.url exists, but is not relevant to this Ghost site: hard-code
    // the localhost url.
    siteInfo.url = 'http://localhost:3456';

    // Hard-code some Bocoup-content-compatibility properties.
    // The things you do for the sake of conference demo code...
    if ( siteInfo.title.match( /bocoup/i ) ) {
      siteInfo.description = new hbs.handlebars.SafeString(
        '<span style="background-color:#ea4142;padding:5px;">' +
          siteInfo.description +
        '</span>'
      );
      siteInfo.logo = '/images/bocoup.png';
      siteInfo.cover = '/images/banner-home.png';
    }
  });
}

/**
 * Discover the proper API endpoint URL by requesting that URL and inspecting
 * its headers. There are cleaner ways to do autodiscovery, and there will
 * soon be a method to do this auto-discovery through a method on the WP
 * service itself, to obviate the need to do any of this ourselves.
 *
 * @type {Promise}
 */
var wpReady = new bluebird.Promise(function( resolve, reject ) {

  // Start by making a HEAD request against the endpoint: if we find a link
  // header for the REST API, that's all we need.
  var req = http.request({
    method: 'HEAD',
    // Run the WP url through url.parse to ensure we just get the "host"
    // component (http.request will choke on a full URL)
    host: url.parse( config.wp.url ).host,
    port: 80,
    path: '/'
  }, function( response ) {
    var headers = parseLinkHeader( response.headers.link );

    // If we detect a WP-API relation link header,
    if ( headers && headers[ 'https://api.w.org/' ] ) {
      console.info( 'Found API link header!' );
      // return it
      return foundLink( headers[ 'https://api.w.org/' ].url ).then( resolve, reject );
    }
    // If we make it this far, unfortunately we didn't see a link header.
    // Maybe we can get a <link> tag out of the HTML, though! (Hope we never
    // have it come to this). To do that, we need to GET that HTML, since
    // we previously only requested the headers: we use "request" because
    // it's cumbersome to assemble an HTML response with node's HTTP module.
    // We may hit this step if the site is being served through cloudflare
    // or a similar CDN that doesn't forward headers.
    request( config.wp.url, function( err, response, html ) {
      // If we errored, bail
      if ( err || response.statusCode !== 200 ) {
        return reject( err || new Error( 'Could not get ' + config.wp.url ) );
      }

      // First, define the (monster) RegExp we will use to search the HTML for a
      // link header. RE is a terrible way to do this, c.f. Zalgo (2012)
      // http://stackoverflow.com/questions/1732348/regex-match-open-tags-except-xhtml-self-contained-tags/1732454#1732454
      var linkRE = new RegExp(
        '<link[^>]*' +
        // Match href if it comes before rel
        '(?:href="([^"]*)")?' +
        '[^>]*' +
        // Match rel
        'rel="[^"]*api.w.org[^"]*"' +
        '[^>]*' +
        // Match href if it comes after rel
        '(?:href="([^"]*)")?' +
        '[^>]*>',
        // case-insensitive RE
        'i'
      );

      // Standardize response to use double-quotes so that we don't need to make
      // the above regex TWICE as long, then see if we have a match for the <link>
      var linkMatch = response.body.replace( /'/g, '"' ).match( linkRE );
      // Store the HTML of _just_ the relevant <link> tag, and ensure double-quotes
      // so that we don't need to write quite so ridiculous a regex EVER AGAIN.
      var link = linkMatch[ 0 ].replace( /'/g, '"' );
      var hrefMatch;
      var apiUrl;
      if ( link ) {

        hrefMatch = link.match( /href="([^"]*)"/ );
        apiUrl = hrefMatch && hrefMatch[ 1 ];

        if ( apiUrl ) {
          console.info( 'Deduced API link from HTML!' );
          return foundLink( apiUrl ).then( resolve, reject );
        }
      }
      // If we made it all the way here nothing we did could produce a URL
      return reject( new Error( 'Could not deduce an API link from ' + config.wp.url ) );
    });
  });
  req.end();
  req.on( 'error', reject );
});

/**
 * Define a helper method to wrap category requests, to abstract the song and
 * dance needed to .search() for a specific category by slug
 *
 * @param {String} slug A category slug
 * @return {Promise} A promise to a WP Category object from the API
 */
function getCategory( slug ) {
  return wp.categories().search( slug ).then(function( categories ) {
    if ( ! categories || ! categories.length ) {
      throw new Error( 'No categories found with slug ' + slug );
    }
    for ( var i = 0; i < categories.length; i++ ) {
      if ( categories[ i ].slug === slug ) {
        return categories[ i ];
      }
    }
    // Not found, but we did get a response: pass through the categories as-is
    // so the requesting code can inspect the collection
    return categories;
  });
}

module.exports = {
  get: {
    category: getCategory
  },
  info: siteInfo,
  ready: wpReady,
  service: wp
};
