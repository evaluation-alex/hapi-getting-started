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
                        timeout: 6000000,
                        harmony: true
                    }))
                    .pipe($.istanbul.writeReports({
                        dir: './test/artifacts/server',
                        reporters: ['lcov', 'html', 'text', 'text-summary'],
                        reportOpts: {dir: './test/artifacts/server'}
                    }))
                    .on('error', (err) => {
                        $.gutil.log('[server:test:cov]' + err);
                    })
                    .on('end', () => {
                        cb();
                    });
            });
    }
};
