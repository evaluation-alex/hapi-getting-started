'use strict';
module.exports = function (gulp, $, {glob, runTasks}) {
    return function watch() {
        $.isWatching = true;
        return gulp.watch(glob, runTasks);
    };
};
