'use strict';
module.exports = function (gulp, $) {
    return function serverDev() {
        //https://github.com/remy/nodemon/blob/master/doc/arch.md
        return $.nodemon({
                env: {NODE_ENV: 'development'},
                nodeArgs: ['--harmony'],
                script: './build/server/index.js',
                watch: ['build/server', 'build/shared'],
                ignore: ['**/node_modules/**/*', 'test/**/*.*', '.git/**/*.*'],
                tasks: ['server:build', 'shared:build'],
                delay: '20000ms'
            })
            .on('restart', () => $.gutil.log('restarted'));
    }
};
