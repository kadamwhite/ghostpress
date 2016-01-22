'use strict';
/*

Ghost Context Table, from http://themes.ghost.org/docs/context-overview

Context | URL                   | Template          | Data          | Body Classes      | Done?
--------+-----------------------+-------------------+---------------+-------------------+-------
index,  | /                     | home.hbs,         | [{post}],     | .home-template    | Yes
home    |                       | index.hbs         | {pagination}  |                   |
--------+-----------------------+-------------------+---------------+-------------------+-------
index,  | /page/2/              | index.hbs         | [{post}],     | .paged            | Yes
paged   |                       |                   | {pagination}  |                   |
--------+-----------------------+-------------------+---------------+-------------------+-------
post    | /:permalink/          | post-:slug.hbs,   | {post}        | .post-template,   | Yes
        |                       | post.hbs          |               | .tag-:slug        |
--------+-----------------------+-------------------+---------------+-------------------+-------
page    | /:slug/               | page-:slug.hbs,   | {post}        | .page-template,   | Yes
        |                       | page.hbs,         |               | .tag-:slug        |
        |                       | post.hbs          |               |                   |
--------+-----------------------+-------------------+---------------+-------------------+-------
tag     | /tag/:slug/           | tag-:slug.hbs,    | [{post}],     | .tag-template,    | Yes
        |                       | tag.hbs,          | {pagination}, | .tag-:slug        |
        |                       | index.hbs         | {tag}         |                   |
--------+-----------------------+-------------------+---------------+-------------------+-------
tag,    | /tag/:slug/page/2/    | tag-:slug.hbs,    | [{post}],     | .tag-template,    | Yes
paged   |                       | tag.hbs or        | {pagination}, | .tag-:slug,       |
        |                       | index.hbs         | {tag}         | .paged            |
--------+-----------------------+-------------------+---------------+-------------------+-------
author  | /author/:slug/        | author-:slug.hbs, | [{post}],     | .author-template, | Yes
        |                       | author.hbs or     | {pagination}, | .author-:slug     |
        |                       | index.hbs         | {author}      |                   |
--------+-----------------------+-------------------+---------------+-------------------+-------
author, | /author/:slug/page/2/ | author-:slug.hbs, | [{post}],     | .author-template, | Yes
paged   |                       | author.hbs,       | {pagination}, | .author-:slug     |
        |                       | index.hbs         | {author}      | .paged            |
--------+-----------------------+-------------------+---------------+-------------------+-------
private | /private/             | private.hbs       | {error}       | .private-template | N/A

*/

var express = require( 'express' );
var router = express.Router();
var bluebird = require( 'bluebird' );
var hbs = require( 'express-hbs' );
var wpService = require( './services/wp' );
var wp = wpService.service; // Not the best naming
var siteInfo = require( './services/wp' ).info;
var decease = require( './services/decease' );

// Helpers
var pageTitle = require( './services/page-title' );
var getPaginationObj = require( './services/pagination' );
function getAuthorFromPosts( authorSlug ) {
  return function( posts ) {
    for ( var i = 0; i < posts.length; i++ ) {
      if ( posts[ i ]._embedded && posts[ i ]._embedded.author[ 0 ] ) {
        if ( posts[ i ]._embedded.author[ 0 ].slug === authorSlug ) {
          return posts[ i ]._embedded.author[ 0 ];
        }
      }
    }
    return null;
  }
}

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
  bluebird.props({
    meta_title: pageTitle(),
    posts: postsPromise,
    pagination: postsPromise.then( getPaginationObj ),
    context: [ 'index', 'home' ],
    body_class: 'home-template'
  }).then(function( context ) {
    context.posts = context.posts.map( decease.post );
    res.render( 'index', context );
  }).catch( next );
});

router.get( '/page/:pagenum', function pagedArchiveRoute( req, res, next ) {
  var postsPromise = wp.posts().perPage( 10 ).page( req.params.pagenum ).embed();
  bluebird.props({
    meta_title: pageTitle( 'Page ' + req.params.pagenum ),
    posts: postsPromise,
    pagination: postsPromise.then( getPaginationObj ),
    context: [ 'index', 'paged' ],
    body_class: 'paged'
  }).then(function( context ) {
    context.posts = context.posts.map( decease.post );
    res.render( 'index', context );
  }).catch( next );
});

// Individual posts & pages

router.get( '/:slug', function singlePageRoute( req, res, next ) {
  var postsPromise = wp.posts().name( req.params.slug ).embed().then(function( posts ) {
    // posts().name() returns an array, hopefully with only one element
    return posts.length === 1 ? decease.post( posts[ 0 ] ) : 404;
  });
  var postTitlePromise = postsPromise.then(function( post ) {
    return pageTitle( post !== 404 ? post.title : '404' );
  });
  bluebird.props({
    meta_title: postTitlePromise,
    post: postsPromise,
    context: [ 'post' ],
    body_class: 'post-template'
  }).then(function( context ) {
    if ( context.post === 404 ) { return next(); }
    res.render( 'post', context );
  }).catch( next );
});

// If we slip past the post slug routes, try to retrieve a matching page instead
router.get( '/:pageslug', function pageRoute( req, res, next ) {
  var pagePromise = wp.pages().name( req.params.pageslug ).embed().then(function( pages ) {
    return pages.length === 1 ? decease.post( pages[ 0 ] ) : 404;
  });
  var pageTitlePromise = pagePromise.then(function( page ) {
    return pageTitle( page !== 404 ? page.title : '404' );
  });
  bluebird.props({
    meta_title: pageTitlePromise,
    post: pagePromise,
    context: [ 'page' ],
    body_class: 'page-template'
  }).then(function( context ) {
    if ( context.post === 404 ) { return next(); }
    res.render( 'page', context );
  }).catch( next );
});

// Author archives

router.get( '/author/:slug', function authorArchiveRoute( req, res, next ) {
  var authorSlug = req.params.slug;
  var postsPromise = wp.posts()
    .author( authorSlug )
    .perPage( 10 )
    .embed();
  var authorPromise = postsPromise
    .then( getAuthorFromPosts( authorSlug ) )
    .then( decease.author );
  var pageTitlePromise = authorPromise
    .then(function( author ) {
      return pageTitle( 'Posts by ' + author.name );
    });
  var paginationPromise = postsPromise
    .then( getPaginationObj )
    .then(function( pagination ) {
      pagination.authorSlug = authorSlug;
      return pagination;
    });

  bluebird.props({
    meta_title: pageTitlePromise,
    author: authorPromise,
    posts: postsPromise,
    pagination: paginationPromise,
    context: [ 'author' ],
    body_class: 'author-template'
  }).then(function( context ) {
    context.posts = context.posts.map( decease.post );
    res.render( 'author', context );
  }).catch( next );
});

router.get( '/author/:slug/page/:pagenum', function authorPagedArchiveRoute( req, res, next ) {
  var authorSlug = req.params.slug;
  var postsPromise = wp.posts()
    .author( authorSlug )
    .perPage( 10 )
    .page( req.params.pagenum )
    .embed();
  var authorPromise = postsPromise
    .then( getAuthorFromPosts( authorSlug ) )
    .then( decease.author );
  var pageTitlePromise = authorPromise
    .then(function( author ) {
      return pageTitle([ 'Posts by ' + author.name, 'Page ' + req.params.pagenum ]);
    });
  var paginationPromise = postsPromise
    .then( getPaginationObj )
    .then(function( pagination ) {
      pagination.authorSlug = authorSlug;
      return pagination;
    });

  bluebird.props({
    meta_title: pageTitlePromise,
    author: authorPromise,
    posts: postsPromise,
    pagination: paginationPromise,
    context: [ 'author', 'paged' ],
    body_class: 'author-template paged'
  }).then(function( context ) {
    context.posts = context.posts.map( decease.post );
    res.render( 'author', context );
  }).catch( next );
});

// Tag archives (Ghost "tag" == WP "category")

router.get( '/tag/:slug', function tagArchiveRoute( req, res, next ) {
  var tagSlug = req.params.slug;
  var tagPromise = wpService.get.category( tagSlug ).then( decease.tag );
  var postsPromise = tagPromise.then(function( category ) {
    return wp.posts().category( category.id ).perPage( 10 ).embed();
  });
  var pageTitlePromise = tagPromise
    .then(function( tag ) {
      return pageTitle( 'Tag: ' + tag.name );
    });
  var paginationPromise = postsPromise
    .then( getPaginationObj )
    .then(function( pagination ) {
      pagination.tagSlug = tagSlug;
      return pagination;
    });

  bluebird.props({
    meta_title: pageTitlePromise,
    tag: tagPromise,
    posts: postsPromise,
    pagination: paginationPromise,
    context: [ 'tag' ],
    body_class: 'tag-template'
  }).then(function( context ) {
    context.posts = context.posts.map( decease.post );
    res.render( 'tag', context );
  }).catch( next );
});

router.get( '/tag/:slug/page/:pagenum', function tagPagedArchiveRoute( req, res, next ) {
  var tagSlug = req.params.slug;
  var tagPromise = wpService.get.category( tagSlug ).then( decease.tag );
  var postsPromise = tagPromise.then(function( category ) {
    return wp.posts()
      .category( category.id )
      .perPage( 10 )
      .page( req.params.pagenum )
      .embed();
  });
  var pageTitlePromise = tagPromise
    .then(function( tag ) {
      return pageTitle([ 'Tag: ' + tag.name, 'Page ' + req.params.pagenum ]);
    });
  var paginationPromise = postsPromise
    .then( getPaginationObj )
    .then(function( pagination ) {
      pagination.tagSlug = tagSlug;
      return pagination;
    });

  bluebird.props({
    meta_title: pageTitlePromise,
    tag: tagPromise,
    posts: postsPromise,
    pagination: paginationPromise,
    context: [ 'tag', 'paged' ],
    body_class: 'tag-template paged'
  }).then(function( context ) {
    context.posts = context.posts.map( decease.post );
    res.render( 'tag', context );
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
