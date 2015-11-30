'use strict';
let path = require('path');
module.exports = function (gulp, $) {
    return function () {
        return $.mergeStream(
            gulp.src(['server/**/*.js'], {base: './server'})
                .pipe($.sourcemaps.init())
                .pipe($.babel({
                    optional: ['validation.undeclaredVariableCheck', 'runtime'],
                    loose: ['es6.classes', 'es6.modules'],
                    blacklist: ['es6.blockScoping', 'es6.arrowFunctions', 'es6.properties.shorthand', 'es6.properties.computed', 'es6.constants', 'es6.templateLiterals']
                }))
                .pipe($.replace(/(\s+)_classCallCheck\(this/, '/*istanbul ignore next: dont mess up my coverage*/\n$1_classCallCheck(this'))
                .pipe($.sourcemaps.write('.', {
                    includeContent: false,
                    sourceRoot(file) {
                        return path.relative(file.path, __dirname);
                    }
                })) //http://stackoverflow.com/questions/29440811/debug-compiled-es6-nodejs-app-in-webstorm
                .pipe(gulp.dest('build')),
            gulp.src(['server/**/*.json', 'server/**/*.md', 'server/.secure/*.pem'])
                .pipe(gulp.dest('build'))
        );
    }
};
