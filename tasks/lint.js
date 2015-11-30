'use strict';
let pkg = require('./../package.json');
module.exports = function (gulp, $, src) {
    return function () {
        return $.mergeStream(
            gulp.src(src)
                .pipe($.eslint(pkg.eslintConfig))
                .pipe($.eslint.format())
                .pipe($.eslint.failOnError()),
            gulp.src(src)
                .pipe($.jscs(pkg.jscsConfig))
                .pipe($.jscs.reporter())
                .pipe($.jscs.reporter('fail'))
        );
    }
};
