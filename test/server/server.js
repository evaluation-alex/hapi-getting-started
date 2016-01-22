'use strict';
/*eslint-disable no-unused-expressions*/
let Bluebird = require('bluebird');
let Hapi = require('hapi');
let path = require('path');
let config = require('./../../build/config');
let manifest = config.manifest;
module.exports = function () {
    manifest.plugins['./build/common/plugins/app-routes'].prependRoute = '';
    return new Bluebird((resolve, reject) => {
        let server = new Hapi.Server(manifest.server);
        server.connection(manifest.connections[0]);
        Bluebird.all(Object.keys(manifest.plugins).map((plugin) => {
            let options = manifest.plugins[plugin];
            let module = plugin[0] === '.' ? path.join(__dirname, '/../../', plugin) : plugin;
            let register = require(module);
            return new Bluebird((resolve1, reject1) => {
                server.register({register: register, options: options}, (err) => {
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
                    register: require('./../../build/common/plugins/dbindexes'),
                    options: {
                        'modules': [
                            'users',
                            'roles',
                            'auth-attempts',
                            'notifications',
                            'user-groups',
                            'blogs',
                            'posts',
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
