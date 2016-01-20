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
var hbs = require( 'express-hbs' );
var wp = require( './services/wp' ).service;
var siteInfo = require( './services/wp' ).info;
var decease = require( './services/decease' );

// Helpers
var pageTitle = require( './services/page-title' );
var getPaginationObj = require( './services/pagination' );

// Middleware
router.use(function( req, res, next ) {
  hbs.updateTemplateOptions({
    data: {
      blog: siteInfo
    }
  });
  next();
});

// Handle routes

router.get( '/', function homepageRoute( req, res, next ) {
  var postsPromise = wp.posts().perPage( 10 ).embed();
  res.locals.context = [ 'index', 'home' ];
  bluebird.props({
    meta_title: pageTitle(),
    posts: postsPromise,
    pagination: postsPromise.then( getPaginationObj ),
    body_class: 'home-template'
  }).then(function( context ) {
    context.posts = context.posts.map( decease.post );
    res.render( 'index', context );
  }).catch( next );
});

router.get( '/page/:pagenum', function pagedArchiveRoute( req, res, next ) {
  var postsPromise = wp.posts().perPage( 10 ).page( req.params.pagenum ).embed();
  res.locals.context = [ 'index', 'paged' ];
  bluebird.props({
    meta_title: pageTitle( 'Page ' + req.params.page ),
    posts: postsPromise,
    pagination: postsPromise.then( getPaginationObj ),
    body_class: 'paged'
  }).then(function( context ) {
    context.posts = context.posts.map( decease.post );
    res.render( 'index', context );
  }).catch( next );
});

router.get( '/:slug', function homepageRoute( req, res, next ) {
  var postsPromise = wp.posts().name( req.params.slug ).embed().then(function( posts ) {
    // posts().name() returns an array, hopefully with only one element
    return posts.length === 1 ? decease.post( posts[ 0 ] ) : 404;
  });
  var pageTitlePromise = postsPromise.then(function( post ) {
    return pageTitle( post !== 404 ? post.title : '404' );
  });
  res.locals.context = [ 'post' ];
  bluebird.props({
    meta_title: pageTitlePromise,
    post: postsPromise,
    body_class: 'post-template'
  }).then(function( context ) {
    if ( context.post === 404 ) { return next(); }
    res.render( 'post', context );
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
        post_class: 'post',
        published_at: new Date(),
        title: 'Not Found',
        excerpt: '',
        content: ''
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
  res.render( 'post', {
    title: err,
    content: new hbs.handlebars.SafeString(
      err.stack
    ),
    published_at: new Date()
    // error: err,
    // __dirname: __dirname
  });
});

module.exports = router;
