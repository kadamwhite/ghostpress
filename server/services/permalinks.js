'use strict';

var permalinks = {};

permalinks.post = function( post ) {
  return '/' + post.slug;
};

permalinks.tag = function( tag ) {
  return '/tag/' + tag.slug + '/';
};

permalinks.author = function( author ) {
  return '/author/' + author.slug + '/';
};

permalinks.nav = function( nav ) {
  return '/???TODO';
};

permalinks.root = function() {
  return '/';
};

module.exports = permalinks;
