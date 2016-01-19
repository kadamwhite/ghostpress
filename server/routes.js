'use strict';
/*

Ghost Context Table, from http://themes.ghost.org/docs/context-overview

Context | URL                   | Template          | Data          | Body Classes
--------+-----------------------+-------------------+---------------+------------------
index,  | /                     | home.hbs,         | [{post}],     | .home-template
home    |                       | index.hbs         | {pagination}  |
--------+-----------------------+-------------------+---------------+------------------
index,  | /page/2/              | index.hbs         | [{post}],     | .paged
paged   |                       |                   | {pagination}  |
--------+-----------------------+-------------------+---------------+------------------
post    | /:permalink/          | post-:slug.hbs,   | {post}        | .post-template,
        |                       | post.hbs          |               | .tag-:slug
--------+-----------------------+-------------------+---------------+------------------
page    | /:slug/               | page-:slug.hbs,   | {post}        | .page-template,
        |                       | page.hbs,         |               | .tag-:slug
        |                       | post.hbs          |               |
--------+-----------------------+-------------------+---------------+------------------
tag     | /tag/:slug/           | tag-:slug.hbs,    | [{post}],     | .tag-template,
        |                       | tag.hbs,          | {pagination}, | .tag-:slug
        |                       | index.hbs         | {tag}         |
--------+-----------------------+-------------------+---------------+------------------
tag,    | /tag/:slug/page/2/    | tag-:slug.hbs,    | [{post}],     | .tag-template,
paged   |                       | tag.hbs or        | {pagination}, | .tag-:slug,
        |                       | index.hbs         | {tag}         | .paged
--------+-----------------------+-------------------+---------------+------------------
author  | /author/:slug/        | author-:slug.hbs, | [{post}],     | .author-template,
        |                       | author.hbs or     | {pagination}, | .author-:slug
        |                       | index.hbs         | {author}      |
--------+-----------------------+-------------------+---------------+------------------
author, | /author/:slug/page/2/ | author-:slug.hbs, | [{post}],     | .author-template,
paged   |                       | author.hbs,       | {pagination}, | .author-:slug
        |                       | index.hbs         | {author}      | .paged
--------+-----------------------+-------------------+---------------+------------------
private | /private/             | private.hbs       | {error}       | .private-template

*/

var express = require( 'express' );
var router = express.Router();
var bluebird = require( 'bluebird' );
var wp = require( './services/wp' ).service;
var decease = require( './services/decease' );

// Helpers
var pageTitle = require( './services/page-title' );

// Handle routes

router.get( '/', function homepageRoute( req, res, next ) {
  var postsPromise = wp.posts().embed();
  console.log( postsPromise._renderURI() );
  bluebird.props({
    title: pageTitle(),
    posts: postsPromise
  }).then(function( context ) {
    console.log( context.posts[ 0 ] );
    console.log( '-----' );
    context.posts = context.posts.map( decease.post );
    res.render( 'index', context );
  }).catch( next );
});

// Handle 404's

router.use(function handle404( req, res, next ) {
  res.status( 404 );

  var message = 'Not Found';

  // respond with html page
  if ( req.accepts( 'html' ) ) {
    return res.render( 'index', {
      posts: [{
        title: 'Not Found'
      }]
    });
  }

  // respond with json
  if ( req.accepts( 'json' ) ) {
    return res.send({ error: 'Not Found' });
  }

  // respond with plain text
  res.type( 'txt' ).send( message );
});

// Handle errors (will print stacktrace)

router.use(function( err, req, res, next ) {
  console.error( err );
  console.error( err.stack );
  res.status( err.status || 500 );
  res.render( 'index', {
    title: 'Error',
    message: err.message,
    error: err,
    __dirname: __dirname
  });
});

module.exports = router;
