'use strict';
module.exports = function (gulp, $, toWatch, toRun) {
    return function () {
        return gulp.watch(toWatch, toRun);
    }
};
