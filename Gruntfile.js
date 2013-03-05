module.exports = function(grunt) {

  // Project configuration.
  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),
    // uglify: {
    //   options: {
    //     banner: '/*! <%= pkg.name %> <%= grunt.template.today("yyyy-mm-dd") %> */\n'
    //   },
    //   build: {
    //     src: 'src/<%= pkg.name %>.js',
    //     dest: 'build/<%= pkg.name %>.min.js'
    //   }
    // }
    jshint: {
      all: ['Gruntfile.js', 'mobile/js/ck.mobile.view.js', 'mobile/js/ck.mobile.js']
    },
    coffee: {
      compile: {
        files: {
          'shared/js/ck.model.js': 'shared/coffee/ck.model.coffee',
          'shared/js/ck.js': 'shared/coffee/ck.coffee',
          'smartboard/js/ck.smartboard.js': 'smartboard/coffee/ck.smartboard.coffee',
          'smartboard/js/ck.smartboard.view.ballooncloud.js': 'smartboard/coffee/ck.smartboard.view.ballooncloud.coffee',
          'smartboard/js/ck.smartboard.view.js': 'smartboard/coffee/ck.smartboard.view.coffee'
        }
      }
    },
    sass: {
      compile: {
        files: {
          'smartboard/css/ck.smartboard.css': 'smartboard/css/scss/ck.smartboard.scss'
        }
      }
    }
  });

  // Load the plugin that provides the "uglify" task.
  // grunt.loadNpmTasks('grunt-contrib-uglify');
  // grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib');
  // grunt.loadNpmTasks('grunt-coffee');

  // Default task(s).
  // grunt.registerTask('default', ['uglify']);
  grunt.registerTask('default', ['jshint', 'coffee']);
  

};