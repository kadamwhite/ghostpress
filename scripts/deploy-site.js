#!/usr/bin/env node
'use strict';

var path = require( 'path' );
var _ = require( 'lodash' );
var http = require( 'http' );

var bluebird = require( 'bluebird' );
var fs = bluebird.promisifyAll( require( 'fs' ) );
var rimraf = bluebird.promisify( require( 'rimraf' ) );
var mkdirp = bluebird.promisify( require( 'mkdirp' ) );
var ncp = bluebird.promisify( require( 'ncp' ) );

var wpService = require( '../server/services/wp' );
var decease = require( '../server/services/decease' );
var permalinkService = require( '../server/services/permalinks' );
var config = require( '../server/services/config' );

/**
 * This helper method takes a collection request and systematically requests
 * each successive page specified by that collection's pagination data. This
 * lets us build up a flat array of every post in the system.
 *
 * Note that this method `_embed`s data by default: this may take a while,
 * since the response payloads will not be small and we're fetching all of
 * their associated data.
 *
 * @param  {[type]} wpReq [description]
 * @return {[type]}       [description]
 */
function getAllPages( wpReq ) {
  return wpReq.embed().then(function( response ) {
    if ( ! response._paging || ! response._paging.next ) {
      return response;
    }
    return bluebird.all([
      response,
      getAllPages( response._paging.next.embed() )
    ]).then(function( responses ) {
      return _.flatten( responses );
    });
  });
}

// Variable to hold our WP service instance
var wp;

// Variable to hold the directory into which this site will be generated
var outputDir = path.resolve( __dirname, '../output' );

// wpService.ready is a promise that resolves after API discovery completes
wpService.ready
  // Get the "wp" api client instance itself, then iterate through the WP
  // site and pull down every publicly-addressable post
  .then(function() {
    wp = wpService.service;
    return getAllPages( wp.posts() );
  })
  // Now that we have all pages, we need to somehow convert that exhaustive
  // list of posts into an exhaustive list of URLs on our express-powered
  // site, in preparation for systematically saving those URLs out as HTML.
  // We "throw away" most of the data in this process: what matters are the
  // slugs and the post counts for each tag & author.
  .then(function( posts ) {
    // "decease" the posts to embed data in a way that is friendlier for us to
    // work with (post.author.slug is easier than post._embedded.author.slug)
    return posts
      .map( decease.post )
      .reduce(function( data, post ) {
        data.posts.push( post.slug );

        if ( ! data.authors[ post.author.slug ] ) {
          data.authors[ post.author.slug ] = [];
        }
        data.authors[ post.author.slug ].push( post.slug );

        post.tags.forEach(function( tag ) {
          if ( ! data.tags[ tag.slug ] ) {
            data.tags[ tag.slug ] = [];
          }
          data.tags[ tag.slug ].push( post.slug );
        });
        return data;
      }, {
        posts: [],
        tags: {},
        authors: {}
      });
  })
  // Now that the data for posts is all set, add pages into the mix
  .then(function( data ) {
    return getAllPages( wp.pages() ).then(function( pages ) {
      data.pages = pages.map(function( page ) {
        // Pages don't contribute to author or tag counts
        return page.slug;
      });
      return data;
    });
  })
  // The goal of this step is to de-dupe posts and pages so that, in the
  // event multiple WP content somehow has the same slug, that we only once
  // try to render them into our Ghost-derived static site
  .then(function( data ) {
    // Combine posts & pages in one array and ensure there isn't any overlap
    data.posts = _.uniq( data.posts.concat( data.pages ) );
    return data;
  })
  // The goal of this step is to build an exhaustive list of URLs for valid
  // pages on the site, based on WordPress's content
  .then(function( data ) {
    var permalinks = [ '/' ];

    // Defined route schemes:
    // - /
    // - /page/:n/
    // - /:permalink/
    // - /:slug/
    // - /tag/:slug/
    // - /tag/:slug/page/:n/
    // - /author/:slug/
    // - /author/:slug/page/:n/

    // Add all single posts
    data.posts.forEach(function( postSlug ) {
      permalinks.push( permalinkService.post({ slug: postSlug }) + '/' );
    });

    // Add all tag archives
    Object.keys( data.tags ).forEach(function( tagSlug ) {
      var tagPosts = data.tags[ tagSlug ];
      var total = tagPosts.length;
      var totalPages = Math.ceil( total / 10 );
      var tagArchive = permalinkService.tag({ slug: tagSlug });
      permalinks.push( tagArchive );
      for ( var i = 2; i <= totalPages; i++ ) {
        permalinks.push( tagArchive + 'page/' + i + '/' );
      }
    });

    // Add all author archives
    Object.keys( data.authors ).forEach(function( authorSlug ) {
      var authorPosts = data.authors[ authorSlug ];
      var total = authorPosts.length;
      var totalPages = Math.ceil( total / 10 );
      var authorArchive = permalinkService.author({ slug: authorSlug });
      permalinks.push( authorArchive );
      for ( var i = 2; i <= totalPages; i++ ) {
        permalinks.push( authorArchive + 'page/' + i + '/' );
      }
    });

    return permalinks;
  })
  // Strip all initial slashes from permalinks, to make parsing them into
  // relative directory and file system paths easier
  .then(function( permalinks ) {
    return permalinks.map(function( permalink ) {
      return permalink.replace( /^\//, '' );
    });
  })
  // Ensure our site's output directory is empty
  .then(function( permalinks ) {
    // rm -rf the directory,
    return rimraf( outputDir )
      .then(function() {
        // Then recreate it
        return fs.mkdirAsync( outputDir );
      })
      .then(function() {
        // Pass the permalinks forward
        return permalinks;
      });
  })
  // We now make each directory that will be used to hold the generated site HTML
  .then(function( permalinks ) {
    // Use bluebird.reduce to execute each mkdirp action in sequence: we could
    // parallelize this a bit for efficiency, but if we do too many at once node
    // will begin to drop file system writes so sequential is safest.
    return bluebird.reduce( permalinks, function( previousStep, permalink ) {
      // Join permalink to the outputDir in which that permalink's directories
      // will be created, then make the directory hierarchy
      return mkdirp( path.join( outputDir, permalink ) );
    }, bluebird.Promise.resolve() ).then(function() {
      // All directories created! Pass the permalinks forward once more.
      return permalinks;
    });
  })
  // We have our permalink list, and we have our directory tree. Now we start
  // to populate it with downloaded posts!
  //
  // For every permalink, request the URL from the express server and save out
  // the HTML locally as [permalink]/index.html Using index.html gives us the
  // lowest-overhead way to maintain the extension-less URL scheme of ghost
  // while still generating static files.
  //
  // A more elegant solution would be to write the files out as e.g.
  // `/permalink/example/` -> `/permalink/example.html` (instead of the
  // `/permalink/example/index.html` used here) then use Nginx's `try_files`
  // directive, e.g. `try_files $uri $uri.html $uri/` to suppress extensions.
  .then(function( permalinks ) {
    // Break permalinks into groups of 5: this is a reasonable number of concurrent
    // HTTP read and File System write connections to have going at once.
    var groups = _.chunk( permalinks, 5 );
    return bluebird.reduce( groups, function( previous, group ) {
      // return Promise.resolve();
      // For each group, make a promise to wrap a (stream-based) file download
      var downloadPromises = group.map(function( permalink ) {
        return new bluebird.Promise(function( resolve, reject ) {
          var outputFile = path.join( outputDir, permalink, 'index.html' );
          var url = 'http://localhost:3456/' + permalink;
          console.log( 'Saving ' + url + '...' );

          // Use streaming interfaces here instead of promises for efficiency
          var fileWriter = fs.createWriteStream( outputFile );
          var request = http.get( url, function( response ) {
            response.pipe( fileWriter );
            fileWriter.on( 'finish', function() {
              fileWriter.close( resolve );  // close() is async, resolve when done
            });
          });
          request.on( 'error', function( err ) {
            fs.unlink( dest ); // Also async but result doesn't matter to us
            reject( err );
          });
        });
      });
      return bluebird.all( downloadPromises );
    }, bluebird.Promise.resolve() ).then(function() { return permalinks });
  })
  // Copy theme assets directory into output folder
  .then(function( permalinks ) {
    var themeAssetsDir = path.join( process.cwd(), 'themes', config.theme, 'assets' );
    var outputAssetsDir = path.join( outputDir, 'assets' );
    return ncp( themeAssetsDir, outputAssetsDir ).then(function() { return permalinks });
  })
  // Copy hard-coded images directory into output folder
  .then(function( permalinks ) {
    var themeAssetsDir = path.join( process.cwd(), 'assets' );
    var outputAssetsDir = path.join( outputDir, 'images' );
    return ncp( themeAssetsDir, outputAssetsDir ).then(function() { return permalinks });
  })
  .then(function( permalinks ) {
    console.log( '\nDone!' );
    console.log( 'Saved ' +permalinks.length + ' pages to ' + outputDir );
  });
