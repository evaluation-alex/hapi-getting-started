'use strict';
let gulp = require('gulp');
let sourcemaps = require('gulp-sourcemaps');
let babel = require('gulp-babel');
let del = require('del');
let eslint = require('gulp-eslint');
let jscs = require('gulp-jscs');
let replace = require('gulp-replace');

gulp.task('build', ['eslint'], () => {
    return gulp.src('server/**/*.esn')
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(replace(/function _interopRequireWildcard/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _interopRequireWildcard' ))
        .pipe(replace(/function _classCallCheck/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _classCallCheck' ))
        .pipe(replace(/function _interopRequireDefault/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _interopRequireDefault' ))
        .pipe(replace(/function _inherits/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _inherits' ))
        .pipe(replace(/_classCallCheck\(this/, '/*istanbul ignore next: dont mess up my coverage*/\n_classCallCheck(this' ))
        .pipe(sourcemaps.write('.',  {
            includeContent: false,
            sourceRoot: ''
        })) //http://stackoverflow.com/questions/29440811/debug-compiled-es6-nodejs-app-in-webstorm
        .pipe(gulp.dest('server'));
});

gulp.task('eslint', () => {
    return gulp.src('server/**/*.esn')
        .pipe(eslint())
        .pipe(eslint.format())
        .pipe(eslint.failOnError())
});

gulp.task('jscs', () => {
    return gulp.src('server/**/*.esn')
        .pipe(jscs());
});

gulp.task('clean', (cb) => {
    del(['server/**/*.js.map', 'server/**/*.js'], cb);
});

gulp.task('watch', () => {
    gulp.watch('server/**/*.esn', ['build']);
});

gulp.task('default', ['clean', 'build', 'watch']);
