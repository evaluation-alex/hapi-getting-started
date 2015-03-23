'use strict';
var Config = require('./../config');

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
    'hapi-bunyan': {logger: Config.logger, mergeData: true, includeTags: true, joinTags: ','},
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
            Blogs: './server/blogs/model',
            Posts: './server/blogs/posts/model',
            Notifications: './server/users/notifications/model',
            Preferences: './server/users/preferences/model'
        },
        autoIndex: Config.hapiMongoModels.autoIndex
    },
    'hapi-require-https': {},
    'hapi-auth-basic': {},
    './server/common/plugins/auth': {},
    './server/common/auth/metrics': {}
};

var components = [
    './server/contact',
    './server/auth-attempts',
    './server/audit',
    './server/users',
    './server/session',
    './server/user-groups',
    './server/blogs',
    './server/blogs/posts',
    './server/users/notifications',
    './server/users/preferences'
];

module.exports.components = components;

var manifest = {
    server: server,
    connections: connections,
    plugins: plugins
};

module.exports.manifest = manifest;
