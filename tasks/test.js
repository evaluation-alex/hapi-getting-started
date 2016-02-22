'use strict';
//https://gist.github.com/yannickcr/6129327b31b27b14efc5
const isparta = require('isparta');
const babelConfig = require('./babel-config');
const src = {
    server: ['build/server/**/*.js']
};
const requires = {
    server: []
};
module.exports = function (gulp, $, which, cvg) {
    const test = function test(which) {
        return gulp.src([`test/${which}/index.js`], {read: false})
            .pipe($.mocha({
                reporter: 'spec',
                ui: 'bdd',
                harmony: true,
                timeout: 2000000,
                require: requires[which]
            }));
    };
    const handleErrEnd = function handleErrEnd(pipe, which, cb) {
        return pipe
            .on('error', (err) => {
                $.gutil.log(`[${which}:test:cov]${err}`);
            })
            .on('end', () => {
                cb();
                const ct = setTimeout(() => {
                    clearTimeout(ct);
                    process.exit();//https://github.com/sindresorhus/gulp-mocha/issues/1
                }, 5 * 1000);//let other tasks complete!, hopefully that will complete in 30s
            });
    };
    const coverage = function coverage(which, cb) {
        return gulp.src(src[which])
            .pipe($.istanbul({instrumenter: isparta.Instrumenter}))
            .pipe($.istanbul.hookRequire())
            .once('finish', () => {
                handleErrEnd(test(which)
                    .pipe($.istanbul.writeReports({
                        dir: `./coverage/${which}`,
                        reporters: ['lcov', 'html', 'text', 'text-summary'],
                        reportOpts: {dir: `./coverage/${which}`}
                    })), which, cb);
            });
    };
    return function (cb) {
        require('babel-register')(babelConfig[which]);
        cvg === 'cov' ? coverage(which, cb) : handleErrEnd(test(which), which, cb);
    }
};
