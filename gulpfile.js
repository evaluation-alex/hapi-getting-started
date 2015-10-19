'use strict';
let gulp = require('gulp');
let $ = require('gulp-load-plugins')({pattern: ['gulp-*', 'del', 'gutil', 'merge-stream']});
let path = require('path');
let _ = require('lodash');
let pkg = require('./package.json');
gulp.task('server:eslint', () => {
    return gulp.src('server/**/*.esn')
        .pipe($.eslint(pkg.eslintConfig))
        .pipe($.eslint.format())
        .pipe($.eslint.failOnError());
});
gulp.task('server:jscs', () => {
    return gulp.src('server/**/*.esn')
        .pipe($.jscs(pkg.jscsConfig));
});
gulp.task('server:jshint', () => {
    let jshintConfig = pkg.jshintConfig;
    jshintConfig.lookup = false;
    return gulp.src('server/**/*.js')
        .pipe($.jshint(jshintConfig))
        .pipe($.jshint.reporter('unix'));
});
gulp.task('server:clean', (cb) => {
    $.del(['build/.opts', 'build/**/*', 'test/server/artifacts/**/*.*']).then(() => cb());
});
gulp.task('server:build', ['server:eslint', 'server:jscs', 'server:jshint'], () => {
    return $.mergeStream(
        gulp.src(['server/**/*', '!server/manifest.json', '!server/**/*.md'], {base: './server'})
            .pipe($.sourcemaps.init())
            .pipe($.babel({
                optional: ['validation.undeclaredVariableCheck', 'runtime'],
                loose: ['all'],
                blacklist: ['es6.blockScoping', 'es6.arrowFunctions', 'es6.properties.shorthand', 'es6.properties.computed']
            }))
            .pipe($.replace(/function _interopRequireWildcard(.*)/, '//jscs:disable\n/*istanbul ignore next: dont mess up my coverage*/\nfunction _interopRequireWildcard$1\n//jscs:enable'))
            .pipe($.replace(/function _classCallCheck(.*)/, '//jscs:disable\n/*istanbul ignore next: dont mess up my coverage*/\nfunction _classCallCheck$1\n//jscs:enable'))
            .pipe($.replace(/function _interopRequireDefault(.*)/, '//jscs:disable\n/*istanbul ignore next: dont mess up my coverage*/\nfunction _interopRequireDefault$1\n//jscs:enable'))
            .pipe($.replace(/function _inherits(.*)/, '//jscs:disable\n/*istanbul ignore next: dont mess up my coverage*/\nfunction _inherits$1\n//jscs:enable'))
            .pipe($.replace(/(\s+)_classCallCheck\(this/, '/*istanbul ignore next: dont mess up my coverage*/\n$1_classCallCheck(this'))
            .pipe($.sourcemaps.write('.', {
                includeContent: false,
                sourceRoot: ''
            })) //http://stackoverflow.com/questions/29440811/debug-compiled-es6-nodejs-app-in-webstorm
            .pipe(gulp.dest('build')),
        gulp.src('server/.opts')
            .pipe(gulp.dest('build')),
        gulp.src('server/manifest.json')
            .pipe(gulp.dest('build')),
        gulp.src('server/**/*.md')
            .pipe(gulp.dest('build'))
        );
});
gulp.task('server:watch', () => {
    gulp.watch('server/**/*.js', ['server:build']);
});
gulp.task('server:test:nocov', ['server:clean', 'server:build'], () => {
    return gulp.src(['test/server/**/*.js'], {read: false})
        .pipe($.mocha({
            reporter: 'spec',
            ui: 'bdd',
            timeout: 6000000
        }))
        .on('error', $.gutil.log);
});
gulp.task('server:test:cov', ['server:clean', 'server:build'], (cb) => {
    gulp.src(['build/**/*.js'])
        .pipe($.istanbul())
        .pipe($.istanbul.hookRequire())
        .on('finish', function () {
            gulp.src(['test/server/**/*.js'])
                .pipe($.mocha({
                    reporter: 'spec',
                    ui: 'bdd',
                    timeout: 6000000
                }))
                .pipe($.istanbul.writeReports({
                    dir: './test/artifacts',
                    reporters: ['lcov', 'html', 'text', 'text-summary'],
                    reportOpts: {dir: './test/artifacts'}
                }))
                .pipe($.istanbul.enforceThresholds({thresholds: {global: 95}}))
                .on('error', $.gutil.log)
                .on('end', cb);
        });
});
gulp.task('server:test:watch', () => {
    return gulp.watch(['test/server/**/*.js', 'server/**/*.js'], ['server:test:nocov']);
});
gulp.task('server:dev', ['server:clean', 'server:build'], () => {
    //https://github.com/remy/nodemon/blob/master/doc/arch.md
    $.nodemon({
        exec: 'node --harmony ',
        script: './build/index.js',
        watch: ['build/index.js'],
        ignore: ['**/node_modules/**/*', 'public/**/*.*', 'dist/**/*.*', 'test/**/*.*', '.git/**/*.*'],
        tasks: ['server:build'],
        delay: '20000ms'
    })
});
console.log('running for ' + process.env.NODE_ENV);
gulp.task('server:default', ['server:watch', 'server:dev']);
gulp.task('default', ['server:default']);
gulp.task('test', ['server:test:cov']);
