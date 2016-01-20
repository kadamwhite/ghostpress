'use strict';

function getPageNum( link ) {
  if ( ! link || typeof link !== 'string' ) { return null; }
  var pageNumMatch = link.match( /[\&\?]page=(\d+)/ );
  return pageNumMatch && pageNumMatch[ 1 ] ? parseInt( pageNumMatch[ 1 ], 10 ) : null;
}

function getPaginationObj( wpResponse ) {
  var wpPagination = wpResponse._paging;

  var prev = getPageNum( wpPagination.links.prev );
  var next = getPageNum( wpPagination.links.next );
  var page = next ? next - 1 : prev ? prev + 1 : 1;

  return {
    // page - the current page number
    page: page,
    // prev - the previous page number
    prev: prev,
    // next - the next page number
    next: next,
    // pages - the number of pages available
    pages: parseInt( wpPagination.totalPages, 10 ),
    // total - the number of posts available
    total: parseInt( wpPagination.total, 10 ),
    // limit - the number of posts per page
    limit: 10
  };
}

module.exports = getPaginationObj;
