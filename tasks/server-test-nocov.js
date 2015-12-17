'use strict';
module.exports = function (gulp, $) {
    return function (cb) {
        gulp.src(['test/server/**/*.js'], {read: false})
            .pipe($.mocha({
                reporter: 'spec',
                ui: 'bdd',
                timeout: 6000000,
                harmony: true
            }))
            .on('error', (err) => {
                $.gutil.log('[server:test:nocov]' + err);
            })
            .on('end', () => {
                cb();
            });
    }
};
