'use strict';
const gulp = require('gulp');
const exec = require('child_process').exec;
const $ = require('gulp-load-plugins')({pattern: ['gulp-*', 'del', 'gutil', 'merge-stream', 'run-sequence', 'lazypipe']});
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
$.disableLinting = process.env.DISABLE_LINTING;
$.disableCoverage = process.env.DISABLE_COVERAGE;
console.log('running for ' + process.env.NODE_ENV);
const task = function task(task, ...rest) {
    return require('./tasks/' + task)(gulp, $, ...rest);
};
gulp.task('help', $.taskListing);
gulp.task('nsp', (cb) => {
    $.nsp({package: __dirname + '/package.json', stopOnError: false}, cb);
});
/*shared tasks*/
gulp.task('shared:lint', task('lint', 'shared'));
gulp.task('shared:clean', task('clean', ['build/shared/**/*.*']));
gulp.task('shared:build', task('build', 'shared'));
gulp.task('shared:watch', task('watch', ['src/shared/**/*.js'], ['shared:lint', 'shared:build']));
/*server tasks*/
gulp.task('server:lint', task('lint', 'server'));
gulp.task('server:clean', task('clean', ['build/server/**/*.*']));
gulp.task('server:build', task('build', 'server'));
gulp.task('server:watch', task('watch', ['src/server/**/*.js'], ['server:lint', 'server:build']));
gulp.task('server:dev', task('server-dev'));
/*server test tasks*/
gulp.task('server:test:clean', task('clean', ['coverage/server/**/*.*']));
gulp.task('server:test:run', task('test', 'server'));
gulp.task('server:test', (cb) => {
    $.runSequence(
        ['server:clean', 'shared:clean', 'server:test:clean'],
        ['server:lint', 'shared:lint'],
        ['server:build', 'shared:build'],
        'server:test:run',
        cb
    );
});
/*top level tasks*/
gulp.task('clean', ['server:clean', 'server:test:clean', 'shared:clean']);
gulp.task('build', ['server:build', 'shared:build']);
gulp.task('lint', ['server:lint', 'shared:lint']);
gulp.task('watch', ['server:watch', 'shared:watch']);
gulp.task('bg', (cb) => {
    $.runSequence(
        'clean',
        'lint',
        'build',
        'watch',
        cb
    );
});
gulp.task('dev', (cb) => {
    $.isWatching = true;
    $.runSequence(
        'server:dev',
        cb
    );
});
gulp.task('default', (cb) => {
    $.runSequence(
        'clean',
        'lint',
        'build',
        'watch',
        'server:dev',
        cb
    );
});
gulp.task('test', (cb) => {
    $.runSequence(
        'server:test',
        cb
    );
});
