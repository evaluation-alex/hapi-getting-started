'use strict';
const path = require('path');
module.exports = function (gulp, $) {
    return function () {
        return $.mergeStream(
            gulp.src(['server/**/*.js'], {base: './server'})
                .pipe($.sourcemaps.init())
                .pipe($.babel({
                    babelrc: false,//https://discuss.babeljs.io/t/disable-babelrc/63
                    presets: ['es2015-node5']
                }))
                .pipe($.replace(/(\s+)_classCallCheck\(this/, '/*istanbul ignore next: dont mess up my coverage*/\n$1_classCallCheck(this'))
                .pipe($.replace(/function _defineProperty/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _defineProperty'))
                .pipe($.replace(/function _classCallCheck/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _classCallCheck'))
                .pipe($.replace(/function _possibleConstructorReturn/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _possibleConstructorReturn'))
                .pipe($.replace(/function _inherits/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _inherits'))
                .pipe($.replace(/function _typeof/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _typeof'))
                .pipe($.replace(/function _toConsumableArray/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _toConsumableArray'))
                .pipe($.relativeSourcemapsSource({dest: 'build'}))
                .pipe($.sourcemaps.write('.', {includeContent: false, sourceRoot: '.'})) //http://stackoverflow.com/questions/29440811/debug-compiled-es6-nodejs-app-in-webstorm
                .pipe(gulp.dest('build')),
            gulp.src(['server/**/*.json', 'server/**/*.md', 'server/.secure/*.pem'])
                .pipe(gulp.dest('build'))
        );
    }
};
