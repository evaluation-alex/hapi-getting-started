'use strict';
var Config = require('./../config').config({argv:[]});
var ExtendedModel = require('./common/extended-model');
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
            AuthAttempts: './server/auth-attempts/model',
            Roles: './server/roles/model',
            Users: './server/users/model',
            Audit: './server/audit/model',
            UserGroups: './server/user-groups/model',
            Permissions: './server/permissions/model'
        },
        autoIndex: Config.hapiMongoModels.autoIndex
    },
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
