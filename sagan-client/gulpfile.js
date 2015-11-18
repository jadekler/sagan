var cssmin = require('gulp-minify-css'),
    gulp = require('gulp');

var paths = {
    css: {
        files: ['src/css/*.css'],
        root: 'src/css'
    },
    assets: ['src/img*/**','src/*.txt','src/*.html','src/font*/**','src/css*/filterable-list.css'],
    js: ['config.js', 'build.js', 'build.js.map', 'jspm_packages/system.js', 'src/**/*'],
    dest: './dist/'
};

// concat and minify CSS files
gulp.task('minify-css', function() {
    return gulp.src(paths.css.files)
        .pipe(cssmin({root:paths.css.root}))
        .pipe(gulp.dest(paths.dest+'css'));
});

// copy assets
gulp.task('copy-assets', function() {
    return gulp.src(paths.assets)
        .pipe(gulp.dest(paths.dest));
});

// copy javascript
gulp.task('copy-javascript', function() {
    return gulp.src(paths.js)
        .pipe(gulp.dest(paths.dest + '/lib'));
});

gulp.task('build', ['minify-css', 'copy-assets', 'copy-javascript'], function(){ });