'use strict';

/**
 * "decease" is a service used to convert a WP object into its corresponding
 * Ghost representation. There is a function exported for each major type:
 *
 * - post
 */

function deceaseAuthor( wpAuthor ) {
  return {
    id: null,       // TODO: the incremental ID of the author
    name: null,     // TODO: the name of the author
    bio: null,      // TODO: the author's bio
    location: null, // TODO: the author's location
    website: null,  // TODO: the author's website
    image: null,    // TODO: the author's profile picture (image helper)
    cover: null,    // TODO: the author's cover image
    url: null       // TODO: the web address for the author's page (url helper)
  };
}

function deceasePost( wpPost ) {
  return {
    _original: wpPost,
    page: false,
    id: wpPost.id,
    title: wpPost.title.rendered,
    excerpt: wpPost.excerpt.rendered,
    content: wpPost.content.rendered,
    url: '/' + wpPost.slug,
    image: {},              // TODO: the cover image associated with the post (image helper)
    featured: false,        // TODO: indicates a featured post. Defaults to false
    meta_title: null,       // TODO: meta_title - custom meta title for the post (meta_title helper)
    meta_description: null, // TODO: Custom meta description for the post (meta_description helper)
    created_at: wpPost.date,
    published_at: wpPost.date,
    updated_at: wpPost.modified,
    author: {},             // TODO: full details of the post's author (see author for details)
    tags: []                // TODO: a list of tags associated with the post (see tags for details)
  };
}

module.exports = {
  author: deceaseAuthor,
  post: deceasePost
};
