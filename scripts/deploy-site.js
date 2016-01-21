#!/usr/bin/env node
'use strict';

var path = require( 'path' );
var _ = require( 'lodash' );
var bluebird = require( 'bluebird' );
var fs = bluebird.promisifyAll( require( 'fs' ) );
var http = bluebird.promisifyAll( require( 'http' ) );
var rimraf = bluebird.promisify( require( 'rimraf' ) );

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

var wp;

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
      permalinks.push( permalinkService.post({ slug: postSlug }) );
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
  // The goal of this step is to prefix every permalink with the root URL of
  // the locally-running express server. This could have been done when pushing
  // permalinks into the array, but it's conceptually easier to handle that
  // as a separate step. (This isn't the slow part of the deployment process:
  // that's coming later! We can afford to incur one more simple iteration
  // at this comparatively-cheap stage.)
  .then(function( permalinks ) {
    return permalinks.map(function( permalink ) {
      // Append host server and ensure that any stray double-slashes are de-duped,
      // out of an excess of caution more than any real concern.
      return ( 'http://localhost:3456' + permalink ).replace( /\/+/, '/' );
    });
  })
  // Make a directory to hold all our generated pages
  .then(function( permalinks ) {
    var outputDir = path.resolve( __dirname, '../output' );
    return rimraf( outputDir )
      .then(function() {
        return fs.mkdirAsync( outputDir );
      })
      .then(function() {
        // Output directory has now been wiped & recreated, which was our goal:
        // Carry onwards by passing the relevant info on to the next step
        return {
          permalinks: permalinks,
          outputDir: outputDir
        };
      });
  })
  .then(function( context ) {
    var outputDir = context.outputDir;
    var permalinks = context.permalinks;
    // Systematically work through the permalinks to create all relevant directories
    var neededDirectories = _.chain( permalinks )
      .reduce(function( directories, permalink ) {
        return directories;
      }, [] )
      .unique();
    console.log( permalinks );
    console.log( 'here' );
  });
