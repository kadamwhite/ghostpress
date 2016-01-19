var _ = require( 'lodash' );

module.exports = function( grunt ) {
  'use strict';

  // Reusable file globbing
  var files = {
    grunt: [ 'Gruntfile.js' ],
    server: [
      'server.js',
      'server/**/*.js'
    ]
  };

  // Reusable JSHintRC options
  var jshintrc = grunt.file.readJSON( '.jshintrc' );

  // Load tasks.
  require( 'load-grunt-tasks' )( grunt );

  grunt.initConfig({

    pkg: grunt.file.readJSON( 'package.json' ),

    jscs: {
      options: {
        config: '.jscsrc',
        reporter: require( 'jscs-stylish' ).path
      },
      grunt: {
        src: files.grunt
      },
      server: {
        src: files.server
      }
    },

    jshint: {
      options: {
        reporter: require( 'jshint-stylish' )
      },
      grunt: {
        options: jshintrc,
        src: files.grunt
      },
      server: {
        options: _.merge({
          node: true
        }, jshintrc ),
        src: files.server
      }//,
      // tests: {
      //   options: _.merge({
      //     globals: {
      //       beforeEach: false,
      //       describe: false,
      //       it: false
      //     }
      //   }, jshintrc ),
      //   src: files.tests
      // }
    }

  });

  grunt.registerTask( 'lint', [ 'jshint', 'jscs' ] );
  grunt.registerTask( 'default', [ 'lint' ] );
};
