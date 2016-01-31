'use strict';
const gulp = require('gulp');
const exec = require('child_process').exec;
const $ = require('gulp-load-plugins')({pattern: ['gulp-*', 'del', 'gutil', 'merge-stream', 'run-sequence']});
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
$.disableLinting = process.env.DISABLE_LINTING;
$.disableCoverage = process.env.DISABLE_COVERAGE;
console.log('running for ' + process.env.NODE_ENV);
function task(task, ...rest) {
    return require('./tasks/' + task)(gulp, $, ...rest);
}
gulp.task('help', $.taskListing);
//https://github.com/cedx/david.gulp/blob/master/example/gulpfile.js
gulp.task('deps:check', () => {
    return gulp.src('./package.json')
        .pipe($.david({error404: true, errorSCM: true, errorDepCount: 5}))
        .on('error', err => console.error(err));
});
gulp.task('deps:upgrade', () => {
    return gulp.src('package.json')
        .pipe($.david({update: true}))
        .pipe(gulp.dest('.'));
});
gulp.task('deps:update', ['deps:upgrade'], (cb) => {
    exec('npm i', (err, stdout) => {
        const output = stdout.trim();
        if (output.length) {
            console.log(output);
        }
        err ? cb(err) : cb();
    });
});
/*server tasks*/
gulp.task('server:lint', task('lint', ['server/**/*.js']));
gulp.task('server:clean', task('clean', ['build/**/*.*', 'test/artifacts/server/**/*.*']));
gulp.task('server:build', ['server:lint'], task('server-build'));
gulp.task('server:watch', task('watch', ['server/**/*.js'], ['server:build']));
gulp.task('server:dev', ['server:clean', 'server:build'], task('server-dev'));
gulp.task('server:default', ['server:watch', 'server:dev']);
/*server test tasks*/
gulp.task('server:test:nocov', task('test', 'server', 'no-cov'));
gulp.task('server:test:cov', task('test', 'server', 'cov'));
gulp.task('server:test:watch', task('watch', ['test/server/**/*.js', 'server/**/*.js'], ['server:test:nocov']));
gulp.task('server:test', (cb) => {
    $.runSequence(
        'server:clean',
        'server:build',
        $.disableCoverage ? 'server:test:nocov' : 'server:test:cov',
        cb
    );
});
/*common lint task*/
gulp.task('lint', ['server:lint']);
/*top level tasks*/
gulp.task('default', ['server:default']);
gulp.task('test', ['server:test']);
