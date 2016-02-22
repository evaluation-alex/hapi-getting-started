'use strict';
module.exports = function (gulp, $) {
    return function () {
        //https://github.com/remy/nodemon/blob/master/doc/arch.md
        $.nodemon({
            env: {NODE_ENV: 'development'},
            nodeArgs: ['--harmony'],
            script: './build/server/index.js',
            watch: ['build/server/index.js', 'build/shared/**/*'],
            ignore: ['**/node_modules/**/*', 'test/**/*.*', '.git/**/*.*'],
            tasks: ['server:build'],
            delay: '20000ms'
        });
    }
};
