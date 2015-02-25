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

if (Config.tls) {
    connections[0].tls = Config.tls;
}

var plugins = {
    'hapi-bunyan': {logger: logger, mergeData: true, includeTags: true, joinTags: ','},
    'lout': {},
    'poop': {logPath: Config.logs.logDir},
    'tv': {},
    'hapi-mongo-models': {
        mongodb: Config.hapiMongoModels.mongodb,
        models: {
            AuthAttempts: './server/auth-attempts/model',
            Audit: './server/audit/model',
            Roles: './server/roles/model',
            Users: './server/users/model',
            UserGroups: './server/user-groups/model',
            Permissions: './server/permissions/model',
            Blogs: './server/blogs/model',
            Posts: './server/blogs/posts/model'
        },
        autoIndex: Config.hapiMongoModels.autoIndex
    },
    'hapi-require-https': {},
    'hapi-auth-basic': {},
    './server/common/auth': {},
    './server/common/metrics': {mongodburl: Config.hapiMongoModels.mongodb.url}
};

var components = [
    './server/contact',
    './server/auth-attempts',
    './server/audit',
    './server/users',
    './server/session',
    './server/user-groups',
    './server/permissions',
    './server/blogs',
    './server/blogs/posts'
];

module.exports.components = components;

var manifest = {
    server: server,
    connections: connections,
    plugins: plugins
};

module.exports.manifest = manifest;
