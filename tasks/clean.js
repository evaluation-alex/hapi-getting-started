'use strict';
module.exports = function (gulp, $, toRemove) {
    return function (cb) {
        if (toRemove && toRemove.length > 0) {
            $.del(toRemove).then(() => cb());
        } else {
            cb();
        }
    }
};
