'use strict';
const gulp = require('gulp');
const $ = require('gulp-load-plugins')({pattern: ['gulp-*', 'del', 'gutil', 'merge-stream', 'run-sequence', 'lazypipe']});
const tasks = require('require-dir')('./tasks');
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
console.log('running for ' + process.env.NODE_ENV);
const config = {
    server: {
        lint: {
            src: ['src/server/**/*.js'],
            disableLinting: process.env.DISABLE_LINTING
        },
        clean: {
            dirs: ['build/server/**/*.*', 'coverage/server/**/*.*']
        },
        build: {
            src: ['src/server/**/*.js', 'src/server/**/*.json', 'src/server/**/*.md', 'src/server/.secure/*.pem'],
            dest: 'build/server',
            babelConfig: {
                babelrc: false,
                presets: ['es2015-node5']
            }
        },
        watch: {
            glob: ['src/server/**/*.js'],
            runTasks: ['server:lint', 'server:build']
        },
        'test:run': {
            alias: 'test',
            src: ['build/server/**/*.js'],
            testSrc: [`test/server/index.js`],
            requires: [],
            coverageDir: './coverage/server',
            disableCoverage: process.env.DISABLE_COVERAGE
        },
        test: {
            alias: 'run-tasks',
            runTasks: [
                ['server:clean', 'shared:clean'],
                ['server:lint', 'shared:lint'],
                ['server:build', 'shared:build'],
                'server:test:run'
            ]
        },
        dev: {alias: 'server-dev'}
    },
    shared: {
        lint: {
            src: ['src/shared/**/*.js'], disableLinting: process.env.DISABLE_LINTING
        },
        clean: {
            dirs: ['build/shared/**/*.*']
        },
        build: {
            src: ['src/shared/**/*.js'],
            dest: 'build/shared',
            babelConfig: {
                babelrc: false,
                presets: ['es2015']
            }
        },
        watch: {
            glob: ['src/shared/**/*.js'],
            runTasks: ['shared:lint', 'shared:build']
        }
    }
};
Object.keys(config).forEach(target => {
    Object.keys(config[target]).forEach(taskType => {
        const {deps, alias, ...taskArgs} = config[target][taskType];
        const toLoad = alias || taskType;
        gulp.task(`${target}:${taskType}`, deps || [], tasks[toLoad](gulp, $, taskArgs));
    });
});
const topLevel = {
    clean: {deps: ['server:clean', 'shared:clean']},
    build: {deps: ['server:build', 'shared:build']},
    lint: {deps: ['server:lint', 'shared:lint']},
    watch: {deps: ['server:watch', 'shared:watch']},
    test: {runTasks: ['server:test']},
    bg: {runTasks: ['clean', 'lint', 'build', 'watch']},
    default: {runTasks: ['bg', 'dev']}
};
Object.keys(topLevel).forEach(task => {
    const {deps, runTasks} = topLevel[task];
    gulp.task(task, deps || [], runTasks ? tasks['run-tasks'](gulp, $, {runTasks}) : undefined);
});
gulp.task('dev', (cb) => {
    $.isWatching = true;
    $.runSequence(
        'server:dev',
        cb
    );
});
gulp.task('help', $.taskListing);
gulp.task('nsp', (cb) => {
    $.nsp({package: __dirname + '/package.json', stopOnError: false}, cb);
});
