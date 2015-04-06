'use strict';
let relativeTo = './../../';
let relativeToServer = './../../server/';
let Hapi = require('hapi');
let HapiAuthBasic = require('hapi-auth-basic');
let Promise = require('bluebird');
let utils = require(relativeToServer + 'common/utils');
let AuthPlugin = require(relativeToServer + 'common/plugins/auth');
let MetricsPlugin = require(relativeToServer + 'common/plugins/metrics');
let I18NPlugin = require(relativeToServer + 'common/plugins/i18n');
let Config = require(relativeTo + 'config');
let Model = require(relativeToServer + 'common/model');
let Users = require(relativeToServer + 'users/model');
let UserGroups = require(relativeToServer + 'user-groups/model');
let Audit = require(relativeToServer + 'audit/model');
let Blogs = require(relativeToServer + 'blogs/model');
let Posts = require(relativeToServer + 'blogs/posts/model');
let AuthAttempts = require(relativeToServer + 'users/session/auth-attempts/model');
let Roles = require(relativeToServer + 'users/roles/model');
let Notifications = require(relativeToServer + 'users/notifications/model');
let _ = require('lodash');
let mongodb;
let server;
module.exports.authorizationHeader = (user) => 'Basic ' + (new Buffer(user.email + ':' + user.session[0].key)).toString('base64');
module.exports.authorizationHeader2 = (user, password) => 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
module.exports.setupConnect = () => {
    if (mongodb) {
        return Promise.resolve(mongodb);
    } else {
        return Model.connect(Config.hapiMongoModels.mongodb)
            .then((db) => {
                mongodb = db;
                return db;
            });
    }
};
let setupRootRole = () => {
    return Roles.findOne({name: 'root', organisation: 'silver lining'})
        .then((found) => {
            if (found) {
                return found;
            } else {
                return Roles.create('root', 'silver lining', [{action: 'update', object: '*'}, {
                    action: 'view',
                    object: '*'
                }]);
            }
        });
};
let setupReadonlyRole = () => {
    return Roles.findOne({name: 'readonly', organisation: 'silver lining'})
        .then((found) => {
            if (found) {
                return found;
            } else {
                return Roles.create('readonly', 'silver lining', [{action: 'view', object: '*'}]);
            }
        });
};
let setupRootUser = () => {
    return Users.findOne({email: 'root'})
        .then((found) => {
            if (found) {
                return found.setRoles(['root'], 'testSetup').resetPrefs().resetProfile().save();
            } else {
                return Users.create('root', 'silver lining', 'password123', 'en')
                    .then((rt) =>  {
                        return rt.setRoles(['root'], 'testSetup').save();
                    });
            }
        });
};
let setupFirstUser = () => {
    return Users.findOne({email: 'one@first.com'})
        .then((found) =>  {
            if (found) {
                return found.resetPrefs().resetProfile().save();
            } else {
                return Users.create('one@first.com', 'silver lining', 'password', 'en');
            }
        });
};
module.exports.setupRolesAndUsers = () => {
    return module.exports.setupConnect()
        .then(setupRootRole)
        .then(setupReadonlyRole)
        .then(setupRootUser)
        .then(setupFirstUser)
        .then(() =>  {
            return true;
        });
};
module.exports.findAndLogin = (user, roles) => {
    return Users.findOne({email: user})
        .then((foundUser) =>  {
            if (roles) {
                foundUser.setRoles(roles, 'test');
            }
            return foundUser.loginSuccess('test', 'test').save();
        })
        .then((loggedin) =>  {
            return {user: loggedin, authheader: module.exports.authorizationHeader(loggedin)};
        });
};
module.exports.setupServer = () => {
    return new Promise((resolve, reject) => {
        module.exports.setupRolesAndUsers()
            .then(() =>  {
                return module.exports.findAndLogin('root');
            })
            .then((foundUser) =>  {
                if (!server) {
                    let Manifest = require('./../../server/manifest').manifest;
                    let components = [
                        '../../server/audit',
                        '../../server/contact',
                        '../../server/users',
                        '../../server/users/session',
                        '../../server/users/session/auth-attempts',
                        '../../server/users/notifications',
                        '../../server/users/preferences',
                        '../../server/users/profile',
                        '../../server/user-groups',
                        '../../server/blogs',
                        '../../server/blogs/posts'
                    ];
                    let ModelsPlugin = {
                        register: require(relativeToServer + 'common/plugins/model'),
                        options: Manifest.plugins['./server/common/plugins/model']
                    };
                    let plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin, MetricsPlugin, I18NPlugin];
                    var server1 = new Hapi.Server();
                    server1.connection({host: 'localhost', port: Config.port});
                    server1.register(plugins, (err) => {
                        if (err) {
                            reject(err);
                        } else {
                            _.forEach(components, (component) => {
                                try {
                                    server1.route(require(component));
                                } catch (err) {
                                    console.log(err, err.stack);
                                }
                            });
                            server = server1;
                            resolve({server: server, authheader: foundUser.authheader});
                        }
                    });
                } else {
                    resolve({server: server, authheader: foundUser.authheader});
                }
            })
            .catch((err) =>  {
                if (err) {
                    reject(err);
                }
            });
    });
};
let cleanupUsers = (usersToCleanup) => {
    if (utils.hasItems(usersToCleanup)) {
        return Users.remove({email: {$in: usersToCleanup}});
    } else {
        return Promise.resolve(true);
    }
};
let cleanupUserGroups = (groupsToCleanup) => {
    if (utils.hasItems(groupsToCleanup)) {
        return UserGroups.remove({name: {$in: groupsToCleanup}});
    } else {
        return Promise.resolve(true);
    }
};
let cleanupBlogs = (blogsToCleanup) => {
    if (utils.hasItems(blogsToCleanup)) {
        return Blogs.remove({title: {$in: blogsToCleanup}});
    } else {
        return Promise.resolve(true);
    }
};
let cleanupPosts = (postsToCleanup) => {
    if (utils.hasItems(postsToCleanup)) {
        return Posts.remove({title: {$in: postsToCleanup}});
    } else {
        return Promise.resolve(true);
    }
};
let cleanupNotifications = (toClear) => {
    let notificationsToCleanup = _.flatten(_.map(['userGroups', 'blogs', 'posts'], (a) => _.map(toClear[a], (i) => new RegExp(i, 'g'))));
    if (utils.hasItems(notificationsToCleanup)) {
        return Notifications.remove({
            $or: [
                {'title.1.title': {$in: notificationsToCleanup}},
                {'title.1.postTitle': {$in: notificationsToCleanup}},
                {'title.1.name': {$in: notificationsToCleanup}}
            ]
        });
    } else {
        return Promise.resolve(true);
    }
};
module.exports.cleanupAudit = () => Audit.remove({});
module.exports.cleanupAuthAttempts = () => AuthAttempts.remove({});
module.exports.cleanupRoles = (roles) => Roles.remove({name: {$in: roles}});
module.exports.cleanupConnect = () => {
    mongodb = undefined;
    Model.disconnect();
};
module.exports.cleanup = (toClear, cb) => {
    Promise.join(cleanupUsers(toClear.users),
        cleanupUserGroups(toClear.userGroups),
        cleanupBlogs(toClear.blogs),
        cleanupPosts(toClear.posts),
        cleanupNotifications(toClear),
        module.exports.cleanupAudit(),
        module.exports.cleanupAuthAttempts(),
        () => {
            cb();
        })
        .catch((err) =>  {
            cb(err);
        })
        .done();
};
module.exports.testComplete = (notify, err) => {
    if (notify) {
        if (err) {
            notify(err);
        } else {
            notify();
        }
    }
};
