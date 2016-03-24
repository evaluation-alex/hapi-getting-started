'use strict';
let Bluebird = require('bluebird');
let Hapi = require('hapi');
let path = require('path');
let config = require('./../../build/server/config');
let manifest = config.manifest;
module.exports = function () {
    config.enableConsole = true;
    manifest.plugins['./plugins/app-routes'].prependRoute = '';
    manifest.plugins['./plugins/connections'].mongo.app.url = manifest.plugins['./plugins/connections'].mongo.app.url2;
    return new Bluebird((resolve, reject) => {
        let server = new Hapi.Server(manifest.server);
        server.connection(manifest.connections[0]);
        Bluebird.all(Object.keys(manifest.plugins).map((plugin) => {
            let module = plugin[0] === '.' ? path.join(__dirname, '/../../build/server/', plugin) : plugin;
            return new Bluebird((resolve1, reject1) => {
                server.register({register: require(module), options: manifest.plugins[plugin]}, (err) => {
                    err ? reject1(err) : resolve1();
                });
            });
        }))
            .then(() => {
                function injectThen(options) {
                    let self = this;
                    return new Bluebird((resolve) => {
                        self.inject(options, resolve);
                    });
                }
                if (!server.injectThen) {
                    server.decorate('server', 'injectThen', injectThen);
                }
                server.register({
                    register: require('./../../build/server/plugins/dbindexes'),
                    options: {
                        'modules': [
                            'users',
                            'roles',
                            'auth-attempts',
                            'notifications',
                            'user-groups',
                            'blogs',
                            'posts',
                            'posts-stats',
                            'audit'
                        ]
                    }
                }, (err) => {
                    err ? reject(err) : resolve(server);
                });
                return server;
            });
    });
};
