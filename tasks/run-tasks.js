'use strict';
module.exports = function (gulp, $, {runTasks}) {
    return function runSeqPll(cb) {
        $.gutil.log(`runTasks:${runTasks}`);
        $.runSequence(...runTasks, cb);
    };
};
