'use strict';
module.exports = function (gulp, $, {dirs}) {
    return function clean(cb) {
        if (dirs && dirs.length > 0) {
            $.del(dirs).then(() => cb());
        } else {
            cb();
        }
    };
};
