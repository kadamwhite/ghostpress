'use strict';

/**
 * "decease" is a service used to convert a WP object into its corresponding
 * Ghost representation. There is a function exported for each major type:
 *
 * - post
 * - author
 */
var _ = require( 'lodash' );

/**
 * links is a reusable key store of the relations used to segment embedded
 * data objects, such as media, authors and terms.
 * @type {Object}
 */
var links = {
  author: 'author',
  media: 'https://api.w.org/featuredmedia',
  term: 'https://api.w.org/term'
};

/*
[{
  "id": 2,
  "name": "themedemos",
  "url": "",
  "description": "",
  "link": "http://wpapi.loc/author/themedemos",
  "avatar_urls": {
    "24": "http://0.gravatar.com/avatar/?s=24&d=mm&r=g",
    "48": "http://0.gravatar.com/avatar/?s=48&d=mm&r=g",
    "96": "http://2.gravatar.com/avatar/?s=96&d=mm&r=g"
  },
  "slug": "themedemos"
}]
*/
function deceaseAuthor( wpAuthor ) {
  return {
    id: wpAuthor.id,
    name: wpAuthor.name,
    bio: wpAuthor.description,
    location: null,
    website: wpAuthor.url,
    // TODO: the author's profile picture (image helper)
    image: wpAuthor.avatar_urls[ '48' ],
    // TODO: the author's cover image
    cover: null,
    url: wpAuthor.link
  };
}

function deceaseCategory( wpCategory ) {
  return wpCategory;
}

/*
"id": 1022,
"date": "2013-03-15T15:40:38",
"slug": "featured-image-horizontal-2",
"type": "attachment",
"link": "http://wpapi.loc/2012/03/template-featured-image-horizontal/featured-image-horizontal-2",
"title": {
  "rendered": "Horizontal Featured Image"
},
"author": 2,
"alt_text": "Horizontal Featured Image",
"media_type": "image",
"media_details": {
  // Dimensions of "full" version
  "width": 580,
  "height": 300,
  "file": "2013/03/featured-image-horizontal-15.jpg",
  "sizes": {
    "thumbnail": {
      "file": "featured-image-horizontal-15-150x150.jpg",
      "width": 150,
      "height": 150,
      "mime_type": "image/jpeg",
      "source_url": "http://wpapi.loc/content/uploads/2013/03/featured-image-horizontal-15-150x150.jpg"
    },
    "medium": {
      "same": "keys"
    },
    "full": {
      "same": "keys"
    }
  }
},
"source_url": "http://wpapi.loc/content/uploads/2013/03/featured-image-horizontal-15.jpg"
*/
// TODO: the cover image associated with the post (image helper)
function deceaseMedia( wpMedia ) {
  return wpMedia;
}

function deceasePost( wpPost ) {
  var author = {};
  var categories = [];
  var featuredMedia = {};
  var postClasses = [ 'post' ];
  var embedded = wpPost._embedded;

  if ( embedded ) {
    if ( embedded[ links.author ] && embedded[ links.author ].length ) {
      // embedded[links.author] will be an array, but Ghost expects object: use _.first
      author = deceaseAuthor( _.first( embedded[ links.author ] ) );
    }

    if ( embedded[ links.term ] && embedded[ links.term ].length ) {
      // embedded[ links.term ] is an array of arrays: find all Category objects
      categories = embedded[ links.term ].reduce(function( memoArr, termArr ) {
        // termArr may not be an array, if a given taxonomy isn't configured
        // for rest api access it could be an object specifying a 404
        if ( typeof termArr.forEach !== 'function' ) {
          return memoArr;
        }
        termArr.forEach(function( term ) {
          if ( term.taxonomy === 'category' ) {
            memoArr.push( deceaseCategory( term ) );
          }
        });
        return memoArr;
      }, [] );
    }

    if ( embedded[ links.media ] && embedded[ links.media ].length ) {
      // embedded[links.media] will be an array, but Ghost expects object: use _.first
      featuredMedia = deceaseMedia( _.first( embedded[ links.media ] ) );
    }
  }

  categories.forEach(function( category ) {
    postClasses.push( 'tag-' + category.slug );
  });

  return {
    _original: wpPost,
    post_class: postClasses.join( ' ' ),
    page: false,
    id: wpPost.id,
    title: wpPost.title.rendered,
    excerpt: wpPost.excerpt.rendered,
    content: wpPost.content.rendered,
    url: '/' + wpPost.slug,
    image: featuredMedia,
    featured: wpPost.sticky,
    // TODO: meta_title - custom meta title for the post (meta_title helper)
    meta_title: null,
    // TODO: Custom meta description for the post (meta_description helper)
    meta_description: null,
    created_at: wpPost.date,
    published_at: wpPost.date,
    updated_at: wpPost.modified,
    author: author,
    // TODO: a list of tags associated with the post (see tags for details)
    tags: categories
  };
}

module.exports = {
  author: deceaseAuthor,
  category: deceaseCategory,
  media: deceaseMedia,
  post: deceasePost
};
