'use strict';
//https://gist.github.com/yannickcr/6129327b31b27b14efc5
const isparta = require('isparta');
module.exports = function (gulp, $, {src, testSrc, requires, babelConfig, coverageDir}) {
    const runTest = function runTest() {
        return gulp.src(testSrc, {read: false})
            .pipe($.mocha({
                reporter: 'spec',
                ui: 'bdd',
                harmony: true,
                timeout: 2000000,
                require: requires
            }));
    };
    const handleErrEnd = function handleErrEnd(pipe, cb) {
        return pipe
            .on('error', (err) => {
                $.gutil.log(`[test:cov]${err}`);
            })
            .on('end', () => {
                cb();
                const ct = setTimeout(() => {
                    clearTimeout(ct);
                    process.exit();//https://github.com/sindresorhus/gulp-mocha/issues/1
                }, 5 * 1000);//let other tasks complete!, hopefully that will complete in 30s
            });
    };
    const gatherCoverage = function gatherCoverage(cb) {
        return gulp.src(src)
            .pipe($.istanbul({instrumenter: isparta.Instrumenter}))
            .pipe($.istanbul.hookRequire())
            .once('finish', () => {
                handleErrEnd(runTest()
                    .pipe($.istanbul.writeReports({
                        dir: coverageDir,
                        reporters: ['lcov', 'html', 'text', 'text-summary'],
                        reportOpts: {dir: coverageDir}
                    })), cb);
            });
    };
    return function test(cb) {
        require('babel-register')(babelConfig);
        $.disableCoverage ?
            handleErrEnd(runTest(), cb) :
            gatherCoverage(cb);
    };
};
