'use strict';
var Config = require('./../config');
var Bunyan = require('bunyan');

var logOptions = {
    name: 'main',
    streams: [{
        type: 'rotating-file',
        path: Config.logs.logDir + '/' + Config.projectName + '.log',
        period: '1d',
        count: 7,
        name: 'file',
        level: 'debug'
    }, {
        type: 'stream',
        stream: process.stdout,
        name: 'console',
        level: 'error'
    }]
};

var logger = Bunyan.createLogger(logOptions);

module.exports.logger = logger;

var server = {
    connections: {
        routes: {
            security: true
        }
    }
};

var connections = [{
    port: Config.port,
    labels: ['api']
}];

var plugins = {
    /*'good': {
     opsInterval: 1000 * 60 * 15,
     reporters: [{
     reporter: require('good-console'),
     args: [Config.logs.logConfig, {format: 'YYYY.MM.DD.HH.mm.ss.SSS'}]
     }, {
     reporter: require('good-file'),
     args: [{
     path: Config.logs.logDir,
     format: 'YYYY_MM_DD',
     prefix: Config.projectName + '_',
     rotate: 'daily'
     }, Config.logs.logConfig]
     }],
     logRequestHeaders: true,
     logRequestPayload: true,
     logResponsePayload: true
     },*/
    'hapi-bunyan': {logger: logger, mergeData: true, includeTags: true, joinTags: ','},
    'lout': {},
    'poop': {logPath: Config.logs.logDir},
    'tv': {},
    'hapi-mongo-models': {
        mongodb: Config.hapiMongoModels.mongodb,
        models: {
            AuthAttempts: './server/auth-attempts/model',
            Roles: './server/roles/model',
            Users: './server/users/model',
            Audit: './server/audit/model',
            UserGroups: './server/user-groups/model',
            Permissions: './server/permissions/model'
        },
        autoIndex: Config.hapiMongoModels.autoIndex
    },
    'hapi-auth-basic': {},
    './server/common/auth': {}
};

var components = [
    './server/audit',
    './server/auth-attempts',
    './server/contact',
    './server/permissions',
    './server/session',
    './server/user-groups',
    './server/users'
];

module.exports.components = components;

var manifest = {
    server: server,
    connections: connections,
    plugins: plugins
};

module.exports.manifest = manifest;
