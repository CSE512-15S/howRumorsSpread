'use strict';
var gulp = require('gulp'),
  nodemon = require('gulp-nodemon'),
  livereload = require('gulp-livereload'),
  sass = require('gulp-sass'),
  browserify = require('browserify'),
  source = require('vinyl-source-stream'),
  buffer = require('vinyl-buffer'),
  gutil = require('gulp-util'),
  uglify = require('gulp-uglify'),
  sourcemaps = require('gulp-sourcemaps'),
  _ = require('underscore'),
  watchify = require('watchify'),
  notify = require('gulp-notify');


var handleErrors = function() {
  var args = Array.prototype.slice.call(arguments);

  // Send error to notification center with gulp-notify
  notify.onError({
    title: "Compile Error",
    message: "<%= error %>"
  }).apply(this, args);

  // Keep gulp from hanging on this task
  this.emit('end');
};


var browserifyTask = function(devMode) {
  var bundleConfig = {
    entries: './public/js/app.js',
    debug: true
  };

  if (devMode) {
    _.extend(bundleConfig, watchify.args);
  }

  var b = browserify(bundleConfig);

  var bundle = function() {
    return b
        .bundle()
        .on('error', handleErrors)
        // Use vinyl-source-stream to make the
        // stream gulp compatible. Specify the
        // desired output filename here.
        .pipe(source('bundle.js'))
        // Specify the output destination
        .pipe(gulp.dest('./public/dist/'));

    };

  if(devMode) {
      // Wrap with watchify and rebundle on changes
      b = watchify(b);
      // Rebundle on update
      b.on('update', bundle);
    } else {
      // Sort out shared dependencies.
      // b.require exposes modules externally
      // if(bundleConfig.require) b.require(bundleConfig.require);
      // // b.external excludes modules from the bundle, and expects
      // // they'll be available externally
      // if(bundleConfig.external) b.external(bundleConfig.external);
    }

    return bundle();

}

gulp.task('broswerify', function () {
 return browserifyTask();
});

gulp.task('watchify', function() {
  return browserifyTask(true);
});


gulp.task('sass', function () {
  gulp.src('./public/css/*.scss')
    .pipe(sass())
    .pipe(gulp.dest('./public/css'))
    .pipe(livereload());
});

gulp.task('watch', ['watchify'], function() {
  gulp.watch('./public/css/*.scss', ['sass']);
});

gulp.task('develop', function () {
  livereload.listen();
  nodemon({
    script: 'bin/www',
    ext: 'js jade coffee',
  }).on('restart', function () {
    setTimeout(function () {
      livereload.changed(__dirname);
    }, 500);
  });
});

gulp.task('default', [
  'sass',
  'broswerify',
  'develop',
  'watch'
]);
