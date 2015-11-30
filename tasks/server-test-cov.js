'use strict';
module.exports = function (gulp, $) {
    return function (cb) {
        gulp.src(['build/**/*.js'])
            .pipe($.istanbul())
            .pipe($.istanbul.hookRequire())
            .once('finish', () => {
                gulp.src(['test/server/**/*.js'], {read: false})
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
                    .once('error', (err) => {
                        $.gutil.log('[server:test:cov]' + err);
                        cb(err);
                    })
                    .once('end', () => {
                        cb();
                    });
            });
    }
};
