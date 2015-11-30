'use strict';
let gulp = require('gulp');
let $ = require('gulp-load-plugins')({pattern: ['gulp-*', 'del', 'gutil', 'merge-stream', 'run-sequence']});
function task(task, ...rest) {
    return require('./tasks/' + task)(gulp, $, ...rest);
}

/*server tasks*/
gulp.task('server:lint', task('lint', ['server/**/*.js']));
gulp.task('server:clean', task('clean', ['build/**/*.*', 'test/artifacts/**/*.*']));
gulp.task('server:build', ['server:lint'], task('server-build'));
gulp.task('server:watch', task('watch', ['server/**/*.js'], ['server:build']));
gulp.task('server:dev', ['server:clean', 'server:build'], task('server-dev'));
gulp.task('server:default', ['server:watch', 'server:dev']);
/*server test tasks*/
gulp.task('server:test:prep', task('server-test-prep'));
gulp.task('server:test:perf', task('perf'));
gulp.task('server:test:clean', task('server-test-clean'));
gulp.task('server:test:nocov', task('server-test-nocov'));
gulp.task('server:test:cov', task('server-test-cov'));
gulp.task('server:test:watch', task('watch', ['test/server/**/*.js', 'server/**/*.js'], ['server:test:nocov']));
gulp.task('server:test', (cb) => {
    $.runSequence(
        ['server:test:clean', 'server:clean', 'server:test:prep'],
        'server:build',
        'server:test:cov',
        ['server:test:clean', 'server:test:perf'],
        cb
    );
});
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log('running for ' + process.env.NODE_ENV);
gulp.task('default', ['server:default']);
gulp.task('test', ['server:test']);
