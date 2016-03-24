'use strict';
const eslintOptions = {
    'parserOptions': {
        'ecmaVersion': 6,
        'ecmaFeatures': {
            'jsx': true,
            'experimentalObjectRestSpread': true
        }
    },
    'env': {
        'browser': true,
        'node': true,
        'mocha': true,
        'es6': true
    },
    'globals': {
        'expect': true,
        'describe': true,
        'it': true,
        'window': true
    },
    'parser': 'babel-eslint',
    'extends': 'eslint:recommended',
    'rules': {
        'quotes': [2, 'single'],
        'no-console': 0,
        'no-unused-vars': [2, {'args': 'none'}]

    },
};
module.exports = function (gulp, $, {src}) {
    return function lint(cb) {
        return !$.disableLinting ?
            gulp.src(src)
                .pipe($.eslint(eslintOptions))
                .pipe($.eslint.format()) :
            cb();
    };
};
