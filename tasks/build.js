'use strict';
const fs = require('fs');
const LICENSE = '/**\n' + fs.readFileSync('./LICENSE').toString() + '**/';
const src = {
    server: [['src/server/**/*.js'], {base: './src/server'}],
    shared: [['src/shared/**/*.js'], {base: './src/shared'}]
};
const dest = {
    server: 'build/server',
    shared: 'build/shared'
};
const otherFiles = {
    server: ['src/server/**/*.json', 'src/server/**/*.md', 'src/server/.secure/*.pem'],
    shared: [],
};
const babelConfig = require('./babel-config');
module.exports = function (gulp, $, which) {
    return function () {
        const jsBuild = () => {
            return $.lazypipe()
                .pipe($.filter, '**/*.js')
                .pipe($.changed, dest[which])
                .pipe($.using)
                .pipe($.licenser, LICENSE)
                .pipe($.sourcemaps.init)
                .pipe($.babel, babelConfig[which])
                //https://github.com/gotwarlost/istanbul/blob/master/ignoring-code-for-coverage.md
                .pipe($.replace, /(\s+)_classCallCheck\(this/, '/*istanbul ignore next: dont mess up my coverage*/\n$1_classCallCheck(this')
                .pipe($.replace, /function _defineProperty/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _defineProperty')
                .pipe($.replace, /function _classCallCheck/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _classCallCheck')
                .pipe($.replace, /function _possibleConstructorReturn/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _possibleConstructorReturn')
                .pipe($.replace, /function _inherits/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _inherits')
                .pipe($.replace, /function _typeof/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _typeof')
                .pipe($.replace, /function _toConsumableArray/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction _toConsumableArray')
                .pipe($.replace, /function sliceIterator/, '/*istanbul ignore next: dont mess up my coverage*/\nfunction sliceIterator')
                .pipe($.replace, /arguments.length/g, '/*istanbul ignore next: dont mess up my coverage*/\narguments.length')
                .pipe($.replace, / === undefined \? (.*) : arguments/g, ' === undefined ? /*istanbul ignore next: dont mess up my coverage*/\n$1 : /*istanbul ignore next: dont mess up my coverage*/\narguments')
                .pipe($.relativeSourcemapsSource, {dest: dest[which]})
                .pipe($.sourcemaps.write, '.', {includeContent: false, sourceRoot: '.'}) //http://stackoverflow.com/questions/29440811/debug-compiled-es6-nodejs-app-in-webstorm
        };
        return $.mergeStream(
            gulp.src(...src[which])
                .pipe(jsBuild(which)()),
            gulp.src(otherFiles[which])
                .pipe($.changed(dest[which]))
            )
            .pipe(gulp.dest(dest[which]));
    }
};
