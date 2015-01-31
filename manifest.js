'use strict';
var Config = require('./config').config({argv:[]});
var ExtendedModel = require('./server/models/extended-model');
var server = {
    connections: {
        routes: {
            security: true
        }
    }
};

var connections = [{
    port: Config.port,
    labels: ['web']
}];

var plugins = {
    'good': {
        opsInterval: 1000 * 60 * 15,
        reporters: [{
            reporter: require('good-console'),
            args: [Config.logs.logConfig, {format: 'YYYY.MM.DD.HH.mm.ss.SSS'}]
        }, {
            reporter: require('good-file'),
            args: [{path: Config.logs.logDir, format: 'YYYY_MM_DD', prefix: Config.projectName + '_', rotate: 'daily'}, Config.logs.logConfig]
        }],
        logRequestHeaders: true,
        logRequestPayload: true,
        logResponsePayload: true
    },
    'hapi-auth-basic': {},
    'hapi-mongo-models': {
        mongodb: Config.hapiMongoModels.mongodb,
        models: {
            AuthAttempts: './server/models/auth-attempts',
            Roles: './server/models/roles',
            Users: './server/models/users',
            Audit: './server/models/audit',
            UserGroups: './server/models/user-groups',
            Permissions: './server/models/permissions'
        },
        autoIndex: Config.hapiMongoModels.autoIndex
    },
    './server/auth': {},
    './server/mailer': {},
    './server/api/auth-attempts': {basePath: '/api'},
    './server/api/contact': {basePath: '/api'},
    './server/api/login': {basePath: '/api'},
    './server/api/logout': {basePath: '/api'},
    './server/api/signup': {basePath: '/api'},
    './server/api/users': {basePath: '/api'},
    './server/api/user-groups': {basePath: '/api'},
    './server/api/permissions': {basePath: '/api'},
    './server/api/audit': {basePath: '/api'}
};

var manifest = {
    server: server,
    connections: connections,
    plugins: plugins
};

exports.manifest = manifest;
