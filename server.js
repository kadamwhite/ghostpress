'use strict';

var express = require( 'express' );
var path = require( 'path' );
var favicon = require( 'serve-favicon' );
var cookieParser = require( 'cookie-parser' );
var bodyParser = require( 'body-parser' );
var hbs = require( 'express-hbs' );
var config = require( './server/services/config' );

// Get the promise that will resolve when the WP instance is bound
// (following successful API endpoint autodiscovery)
var wp = require( './server/services/wp' );

var app = express();

var themeDir = path.join( __dirname, 'themes', config.theme );

// view engine setup:
app.engine( 'hbs', hbs.express4({
  defaultLayout: path.join( themeDir, 'default.hbs' ),
  partialsDir: [
    path.join( themeDir, '/partials' )
  ]
}) );
app.set( 'view engine', 'hbs' );
app.set( 'views', themeDir );

// Bind all of our custom helpers (mostly defined to shim things that
// exist within Ghost itself)
var helpers = require( './server/helpers' );
Object.keys( helpers ).forEach(function( helperName ) {
  hbs.registerHelper( helperName, helpers[ helperName ] );
});

// One favicon to rule them all (from feelingrestful.org Day of REST event)
app.use( favicon( path.join( __dirname, 'assets/ador_logo.png' ) ) );

// Serve static assets from the theme
app.use( express.static( path.join( themeDir, 'assets' ) ) );

// Serve static assets from the server
app.use( '/assets', express.static( path.join( __dirname, 'assets' ) ) );

// Understand JSON, cookies, and URL-encoded data (via the querystring library)
app.use( bodyParser.json() );
app.use( bodyParser.urlencoded({ extended: false }) );
app.use( cookieParser() );

// Routes

// Publicly-accessible routes
app.use( '/', require( './server/routes' ) );

// Load the server once the WP client has initialized
wp.ready.then(function() {
  app.listen( 3456, function() {
    console.log( 'GhostPress is listening on port 3456!' );
  });
}).catch(function( err ) {
  // And error out if it doesn't initialize properly
  console.error( err );
  process.exit( 1 );
});

module.exports = app;
