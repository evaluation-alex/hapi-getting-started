'use strict';
let gulp = require('gulp');
let sourcemaps = require('gulp-sourcemaps');
let babel = require('gulp-babel');
let del = require('del');
let eslint = require('gulp-eslint');
let jscs = require('gulp-jscs');
let jshint = require('gulp-jshint');
let replace = require('gulp-replace');
let config = require('./package.json');

gulp.task('build', ['eslint', 'jscs', 'jshint'], () => {
    return gulp.src('server/**/*.esn')
        .pipe(sourcemaps.init())
        .pipe(babel())
        .pipe(replace(/function _interopRequireWildcard(.*)/, '//jscs:disable\n/*istanbul ignore next: dont mess up my coverage*/\nfunction _interopRequireWildcard$1\n//jscs:enable' ))
        .pipe(replace(/function _classCallCheck(.*)/, '//jscs:disable\n/*istanbul ignore next: dont mess up my coverage*/\nfunction _classCallCheck$1\n//jscs:enable' ))
        .pipe(replace(/function _interopRequireDefault(.*)/, '//jscs:disable\n/*istanbul ignore next: dont mess up my coverage*/\nfunction _interopRequireDefault$1\n//jscs:enable' ))
        .pipe(replace(/function _inherits(.*)/, '//jscs:disable\n/*istanbul ignore next: dont mess up my coverage*/\nfunction _inherits$1\n//jscs:enable' ))
        .pipe(replace(/(\s+)_classCallCheck\(this/, '/*istanbul ignore next: dont mess up my coverage*/\n$1_classCallCheck(this' ))
        .pipe(sourcemaps.write('.',  {
            includeContent: false,
            sourceRoot: ''
        })) //http://stackoverflow.com/questions/29440811/debug-compiled-es6-nodejs-app-in-webstorm
        .pipe(gulp.dest('server'));
});

gulp.task('eslint', () => {
    return gulp.src('server/**/*.esn')
        .pipe(eslint(config.eslintConfig))
        .pipe(eslint.format())
        .pipe(eslint.failOnError());
});

gulp.task('jscs', () => {
    return gulp.src('server/**/*.esn')
        .pipe(jscs(config.jscsConfig));
});

gulp.task('jshint', () => {
    let jshintConfig = config.jshintConfig;
    jshintConfig.lookup = false;
    return gulp.src('server/**/*.esn')
        .pipe(jshint(jshintConfig))
        .pipe(jshint.reporter('unix'));
});

gulp.task('clean', (cb) => {
    del(['server/**/*.js.map', 'server/**/*.js'], cb);
});

gulp.task('watch', () => {
    gulp.watch('server/**/*.esn', ['build']);
});

gulp.task('default', ['clean', 'build', 'watch']);
