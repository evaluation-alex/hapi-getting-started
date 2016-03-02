'use strict';
module.exports = function (gulp, $, toWatch, toRun) {
    return function watch() {
        $.isWatching = true;
        return gulp.watch(toWatch, toRun);
    }
};
