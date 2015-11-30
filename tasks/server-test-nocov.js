'use strict';
module.exports = function (gulp, $) {
    return function (cb) {
        return gulp.src(['test/server/**/*.js'], {read: false})
            .pipe($.mocha({
                reporter: 'spec',
                ui: 'bdd',
                timeout: 6000000
            }))
            .once('error', (err) => {
                $.gutil.log('[server:test:nocov]' + err);
                cb(err);
            })
            .once('end', () => {
                cb();
            });
    }
};
