'use strict';
/*eslint-disable no-unused-expressions*/
let Bluebird = require('bluebird');
let Hapi = require('hapi');
let path = require('path');
let config = require('./../../server/config');
let manifest = config.manifest;
module.exports = function () {
    manifest.plugins['./server/common/plugins/app-routes'].prependRoute = '';
    return new Bluebird((resolve, reject) => {
        let server = new Hapi.Server(manifest.server);
        manifest.connections.forEach((connection) => {
            server.connection(connection);
        });
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
                    register: require('../../server/common/plugins/dbindexes'),
                    options: {
                        'modules': [
                            'users',
                            'users/roles',
                            'users/session/auth-attempts',
                            'users/notifications',
                            'user-groups',
                            'blogs',
                            'blogs/posts',
                            'audit'
                        ]
                    }
                }, (err) => {
                    err ? reject(err) : resolve(server);
                });
            });
    });
};
