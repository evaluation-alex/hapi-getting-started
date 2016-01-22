'use strict';
//https://gist.github.com/yannickcr/6129327b31b27b14efc5
const isparta = require('isparta');
require('babel-register');
module.exports = function (gulp, $, which, cvg) {
    let src = {
        server: ['build/**/*.js'],
        client: ['client/**/*.js']
    };
    let req = {
        server: [],
        client: [`./test/client/setup`]
    };
    function test(which) {
        return gulp.src([`test/${which}/index.js`], {read: false})
            .pipe($.mocha({
                reporter: 'spec',
                ui: 'bdd',
                harmony: true,
                timeout: 20000,
                require: req[which]
            }));
    };
    function handleErrEnd(pipe, which, cb) {
        return pipe
            .on('error', (err) => {
                $.gutil.log(`[${which}:test:cov]${err}`);
            })
            .on('end', () => {
                cb();
                let ct = setTimeout(() => {
                    clearTimeout(ct);
                    process.exit();//https://github.com/sindresorhus/gulp-mocha/issues/1
                }, 5 * 1000);//let other tasks complete!, hopefully that will complete in 30s
            });
    };
    function coverage(which, cb) {
        return gulp.src(src[which])
            .pipe($.istanbul({instrumenter: isparta.Instrumenter}))
            .pipe($.istanbul.hookRequire())
            .once('finish', () => {
                handleErrEnd(test(which)
                    .pipe($.istanbul.writeReports({
                        dir: `./test/artifacts/${which}`,
                        reporters: ['lcov', 'html', 'text', 'text-summary'],
                        reportOpts: {dir: `./test/artifacts/${which}`}
                    })), which, cb);
            });
    };
    return function (cb) {
        cvg === 'cov' ? coverage(which, cb) : handleErrEnd(test(which), which, cb);
    }
};
