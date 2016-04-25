'use strict';
//https://gist.github.com/yannickcr/6129327b31b27b14efc5
const instrumenter = require('isparta').Instrumenter;
module.exports = function (gulp, $, {src, testSrc, requires, coverageDir, disableCoverage}) {
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
            .pipe($.istanbul({instrumenter}))
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
        disableCoverage ?
            handleErrEnd(runTest(), cb) :
            gatherCoverage(cb);
    };
};
