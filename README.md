# "GhostPress"

This project is a demo created in conjunction with a talk I gave at the [Day of REST](https://feelingrestful.com) event in London in January 2016.

By providing the URL of a publicly-accessible, [WP-API](https://github.com/WP-API/WP-API)-enabled Wordpress site in the `config.yml`, and by copying a theme from the [Ghost](https://ghost.org/) content management system, GhostPress will let you start an Express server that will fetch data from the specified WP site, and display it within the provided (and configured) Ghost theme!

## Installation

1. Download repository
2. From the command line, run `npm install` to install server runtime and site generation script dependencies
3. Download a Ghost theme, *e.g.* [Casper](https://github.com/TryGhost/Casper), into the `themes/` directory
4. Run `npm start` to fire up the Express server
5. Visit http://localhost:3456 to explore the running GhostPress site
6. While the server is running, in another command line window, run `npm run generate` to render the entire GhostPress site out to static HTML files, which will be saved into an `output/` directory
7. Profit!

## Commands

Start server: `npm start`

Generate static site from server: `npm run generate`

Lint all JS files: `npm test`
