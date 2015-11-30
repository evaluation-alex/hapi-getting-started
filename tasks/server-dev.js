'use strict';
module.exports = function (gulp, $) {
    return function () {
        //https://github.com/remy/nodemon/blob/master/doc/arch.md
        $.nodemon({
            exec: 'node --harmony ',
            script: './build/index.js',
            watch: ['build/index.js'],
            ignore: ['**/node_modules/**/*', 'public/**/*.*', 'test/**/*.*', '.git/**/*.*'],
            tasks: ['server:build'],
            delay: '20000ms'
        });
    }
};
