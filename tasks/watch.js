'use strict';
module.exports = function (gulp, $, toWatch, toRun) {
    return function () {
        $.isWatching = true;
        return gulp.watch(toWatch, toRun);
    }
};
