'use strict';
const fs = require('fs');
const LICENSE = '/**\n' + fs.readFileSync('./LICENSE').toString() + '**/';
const buildJS = function buildJS($, dest, babelConfig) {
    return $.lazypipe()
        .pipe($.changed, dest)
        .pipe($.using)
        .pipe($.licenser, LICENSE)
        .pipe($.sourcemaps.init)
        .pipe($.babel, babelConfig)
        //https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md
        .pipe($.replace, /function _interopRequireDefault/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _interopRequireDefault')
        .pipe($.replace, /function _wrapComponent/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _wrapComponent')
        .pipe($.replace, /function _defineProperty/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _defineProperty')
        .pipe($.replace, /function _objectWithoutProperties/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _objectWithoutProperties')
        .pipe($.replace, /var _createClass = function/, 'var _createClass = /*istanbul ignore next: ignore babel generated code*/\nfunction')
        .pipe($.replace, /function _classCallCheck/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _classCallCheck')
        .pipe($.replace, /function _possibleConstructorReturn/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _possibleConstructorReturn')
        .pipe($.replace, /function _inherits/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _inherits')
        .pipe($.replace, /var _extends = (.*) function/, 'var _extends = $1 /*istanbul ignore next: ignore babel generated code*/\nfunction')
        .pipe($.replace, /var _get = function get/, 'var _get = /*istanbul ignore next: ignore babel generated code*/\nfunction get')
        .pipe($.replace, /function _typeof/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _typeof')
        .pipe($.replace, /function _toConsumableArray/, '/*istanbul ignore next: ignore babel generated code*/\nfunction _toConsumableArray')
        .pipe($.replace, /(\s+)_classCallCheck\(this/, '/*istanbul ignore next: ignore babel generated code*/\n$1_classCallCheck(this')
        .pipe($.replace, /_slicedToArray = function/, '_slicedToArray = /*istanbul ignore next: ignore babel generated code*/\nfunction')
        .pipe($.replace, /arguments.length/g, '/*istanbul ignore next: ignore babel generated code*/\narguments.length')
        .pipe($.replace, / === undefined \? (.*) : /g, ' === undefined ? /*istanbul ignore next: ignore babel generated code*/\n$1 : ')
        .pipe($.replace, /arguments\[/g, '/*istanbul ignore next: ignore babel generated code*/\narguments[')
        .pipe($.relativeSourcemapsSource, {dest: dest})
        .pipe($.sourcemaps.write, '.', {includeContent: false, sourceRoot: '.'});//http://stackoverflow.com/questions/29440811/debug-compiled-es6-nodejs-app-in-webstorm
};
const copyOthers = function copyOthers($, dest) {
    return $.lazypipe()
        .pipe($.changed, dest)
        .pipe($.using);
};
module.exports = function (gulp, $, {src, dest, babelConfig}) {
    return function build() {
        return gulp.src(src)
            .pipe($.if(/\.js$/,
                        buildJS($, dest, babelConfig)(),
                        copyOthers($, dest)()
                 )
            )
            .on('error', (err) => $.gutil.log(err))
            .pipe(gulp.dest(dest));
    };
};
