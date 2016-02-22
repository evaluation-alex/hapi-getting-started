'use strict';
const Hapi = require('hapi');
const Bluebird = require('bluebird');
const config = require('./config');
const {manifest} = config;
process.env.NODE_ENV = process.env.NODE_ENV || 'development';
process.title = 'hgs-server-' + process.env.NODE_ENV;
function start(server) {
    server.start(() => {
        console.log(`engage ${JSON.stringify(server.connections.map(c => c.info))}`);
    });
}
const server = new Hapi.Server(manifest.server);
manifest.connections.forEach(connection => server.connection(connection));
Bluebird.all(Object.keys(manifest.plugins).map(plugin =>
    new Bluebird((resolve, reject) => {
        server.register({register: require(plugin), options: manifest.plugins[plugin]}, err =>
            err ? reject(err) : resolve()
        );
    })
))
    .then(() => {
        if (process.env.NODE_ENV !== 'production') {
            server.register({
                register: require('./plugins/dbindexes'),
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
            }, err => {
                if (err) {
                    throw err;
                }
                start(server);
            });
        } else {
            start(server);
        }
        return null;
    })
    .catch(err => {
        console.log(err);
    });
