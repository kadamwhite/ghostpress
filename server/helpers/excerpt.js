'use strict';

/**
 * VERY naive implementation of excerpt "helper": just return the excerpt
 * that WordPress provided in the API response.
 *
 * `this` will be a deceased WP Post object
 *
 * @return {String} Post excerpt
 */
function excerpt() {
  return this.excerpt;
}

module.exports = excerpt;
