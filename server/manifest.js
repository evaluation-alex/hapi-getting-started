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
    './server/common/plugins/model': {
        mongodb: Config.hapiMongoModels.mongodb,
        models: {
            Audit: './server/audit/model',
            Users: './server/users/model',
            AuthAttempts: './server/users/session/auth-attempts/model',
            Roles: './server/users/roles/model',
            Notifications: './server/users/notifications/model',
            UserGroups: './server/user-groups/model',
            Blogs: './server/blogs/model',
            Posts: './server/blogs/posts/model'
        },
        autoIndex: Config.hapiMongoModels.autoIndex
    },
    'hapi-require-https': {},
    'hapi-auth-basic': {},
    './server/common/plugins/auth': {},
    './server/common/plugins/metrics': {}
};
var components = [
    './server/contact',
    './server/users',
    './server/users/session',
    './server/users/session/auth-attempts',
    './server/users/notifications',
    './server/users/preferences',
    './server/users/profile',
    './server/user-groups',
    './server/blogs',
    './server/blogs/posts',
    './server/audit'
];
module.exports.components = components;
var manifest = {
    server: server,
    connections: connections,
    plugins: plugins
};
module.exports.manifest = manifest;
