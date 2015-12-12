'use strict';
const Hapi = require('hapi');
const Bluebird = require('bluebird');
const path = require('path');
const config = require('./config');
const manifest = config.manifest;
process.title = 'hgs-server-' + process.env.NODE_ENV;
function start(server) {
    server.start(() => {
        console.log(`engage ${JSON.stringify(server.connections.map(c => c.info))}`);
    });
}
let server = new Hapi.Server(manifest.server);
manifest.connections.forEach(connection => {
    server.connection(connection);
});
Bluebird.all(Object.keys(manifest.plugins).map(plugin => {
    const module = plugin[0] === '.' ? path.join(__dirname, '/../', plugin) : plugin;
    const register = require(module);
    const options = manifest.plugins[plugin];
    return new Bluebird((resolve, reject) => {
        server.register({register, options}, err => {
            err ? reject(err) : resolve();
        });
    });
}))
    .then(() => {
        if (process.env.NODE_ENV !== 'production') {
            server.register({
                register: require('./common/plugins/dbindexes'),
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
