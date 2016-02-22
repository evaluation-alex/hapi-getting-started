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
gulp.task('server:dev', ['server:clean', 'shared:clean', 'server:build', 'shared:build', 'server:watch'], task('server-dev'));
/*server test tasks*/
gulp.task('server:test:clean', task('clean', ['coverage/server/**/*.*']));
gulp.task('server:test:nocov', task('test', 'server', 'no-cov'));
gulp.task('server:test:cov', task('test', 'server', 'cov'));
gulp.task('server:test', (cb) => {
    $.runSequence(
        ['server:test:clean'],
        ['server:lint', 'shared:lint'],
        $.disableCoverage ? 'server:test:nocov' : 'server:test:cov',
        cb
    );
});
/*top level tasks*/
gulp.task('clean', ['server:clean', 'server:test:clean', 'shared:clean']);
gulp.task('build', ['server:build', 'shared:build']);
gulp.task('lint', ['server:lint', 'shared:lint']);
gulp.task('watch', ['server:watch', 'shared:watch']);
gulp.task('default', (cb) => {
    $.runSequence(
        'clean',
        'lint',
        'build',
        'watch',
        cb
    );
});
gulp.task('test', ['server:test']);
