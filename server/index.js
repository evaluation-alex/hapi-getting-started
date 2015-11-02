'use strict';
import Hapi from 'hapi';
import Bluebird from 'bluebird';
import path from 'path';
import {manifest} from './config';
function start(server) {
    server.start(() => {
        console.log('engage' + JSON.stringify(server.connections.map(c => c.info)));
    });
}
let server = new Hapi.Server(manifest.server);
manifest.connections.forEach(connection => {
    server.connection(connection);
});
Bluebird.all(Object.keys(manifest.plugins).map(plugin => {
    const module = plugin[0] === '.' ? path.join(__dirname, '/../', plugin) : plugin;
    return new Bluebird((resolve, reject) => {
        server.register({register: require(module), options: manifest.plugins[plugin]}, err => {
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
