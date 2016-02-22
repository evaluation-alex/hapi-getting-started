'use strict';
const eslintOptions = {
    'parserOptions': {
        'ecmaVersion': 6,
        'ecmaFeatures': {
            'experimentalObjectRestSpread': true
        }
    },
    'env': {
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
    }
};
const src = {
    server: ['src/server/**/*.js'],
    shared: ['src/shared/**/*.js']
};
const dest = {
    server: 'build/server',
    shared: 'build/shared'
};
module.exports = function (gulp, $, which) {
    return function (cb) {
        return !$.disableLinting ?
            gulp.src(src[which])
                .pipe($.eslint(eslintOptions))
                .pipe($.eslint.format()) :
            cb();
    }
};
