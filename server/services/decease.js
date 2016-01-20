'use strict';

/**
 * "decease" is a service used to convert a WP object into its corresponding
 * Ghost representation. There is a function exported for each major type:
 *
 * - post
 * - author
 */
var _ = require( 'lodash' );
var marked = require( 'marked' );
var permalinks = require( './permalinks' );
var wp = require( './wp' );

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
  if ( ! wpAuthor ) {
    return {};
  }
  return {
    _type: 'author',
    slug: wpAuthor.slug,
    id: wpAuthor.id,
    name: wpAuthor.name,
    bio: marked( wpAuthor.description || '' ),
    location: null,
    website: wpAuthor.url,
    // TODO: the author's profile picture (image helper)
    image: wpAuthor.avatar_urls[ '96' ],
    // TODO: the author's cover image
    cover: null,
    url: permalinks.author( wpAuthor )
  };
}

function deceaseCategory( wpCategory ) {
  wpCategory._type = 'tag';
  return wpCategory;
}

/**
 * Convert a WP Media object into something the ghost theme can interpret
 * (mostly it just needs to return an object with a URL)
 *
 * @param  {Object} wpMedia WP media object
 * @return {Object}
 */
function deceaseMedia( wpMedia ) {
  var media = {
    _type: '_image',
    slug: wpMedia.slug,
    id: wpMedia.id,
    alt: wpMedia.alt_text,
    width: wpMedia.media_details.width,
    height: wpMedia.media_details.height
  };
  if ( wpMedia.media_details.sizes && wpMedia.media_details.sizes.full ) {
    media.url = wpMedia.media_details.sizes.full.source_url;
  } else {
    media.url = wpMedia.media_details.source_url;
  }
  return media;
}


/**
 * Convert a WP Post object into something the ghost theme can interpret
 * See http://themes.ghost.org/v0.7.5/docs/post-context#post-object-attributes
 *
 * @param  {Object} wpPost WP post object
 * @return {Object}
 */
function deceasePost( wpPost ) {
  if ( ! wpPost ) {
    return {};
  }

  var author = {};
  var categories = [];
  var featuredMedia = {};
  var postClasses = [ 'post' ];
  var content = wpPost.content.rendered;
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

  // Try to deduce featured image from the first paragraph, if present: this is a nuance
  // unique to Bocoup's theme's editorial direction. Note the lack of a closing <p> tag
  // in this RE, that is so that it will work regardless of whether image is in a <p> all
  // to itself or not.
  var contentImageRE = /^<p[^>]*>[^<]*<img[^>]*src="([^"]+)"[^>]*>/i;
  if ( content.trim().match( contentImageRE ) ) {
    // second element in array returned from match() will be the () regex match
    featuredMedia.url = content.trim().match( contentImageRE, '$1' )[ 1 ];

    // Remove the image from the body so it does not display twice
    content = content.replace( contentImageRE, '<p>' );
  }
  if ( ! featuredMedia.url ) {
    // If we still have no image, set this to Null so the theme will do the right thing.
    featuredMedia = null;
  }

  // We may have caused there to be empty <p> tags: remove them for spacing consistency
  content = content.replace( /<p><\/p>/g, '' );

  var post = {
    _type: 'post',
    _original: wpPost,
    slug: wpPost.slug,
    post_class: postClasses.join( ' ' ),
    page: false,
    id: wpPost.id,
    title: wpPost.title.rendered,
    excerpt: wpPost.excerpt.rendered,
    content: content,
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

  post.url = permalinks.post( post );

  return post;
}

module.exports = {
  author: deceaseAuthor,
  category: deceaseCategory,
  media: deceaseMedia,
  post: deceasePost
};
