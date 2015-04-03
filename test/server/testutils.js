'use strict';
let relativeTo = './../../';
let relativeToServer = './../../server/';
let Hapi = require('hapi');
let HapiAuthBasic = require('hapi-auth-basic');
let Promise = require('bluebird');
Promise.longStackTraces();
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
let authorizationHeader = function (user) {
    return 'Basic ' + (new Buffer(user.email + ':' + user.session[0].key)).toString('base64');
};
exports.authorizationHeader = authorizationHeader;
let authorizationHeader2 = function (user, password) {
    return 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
};
exports.authorizationHeader2 = authorizationHeader2;
let setupConnect = function () {
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
exports.setupConnect = setupConnect;
function setupRootRole () {
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
}
function setupReadonlyRole () {
    return Roles.findOne({name: 'readonly', organisation: 'silver lining'})
        .then((found) => {
            if (found) {
                return found;
            } else {
                return Roles.create('readonly', 'silver lining', [{action: 'view', object: '*'}]);
            }
        });
}
function setupRootUser () {
    return Users.findOne({email: 'root'})
        .then((found) => {
            if (found) {
                return found.setRoles(['root'], 'testSetup').resetPrefs().resetProfile().save();
            } else {
                return Users.create('root', 'silver lining', 'password123', 'en')
                    .then(function (rt) {
                        return rt.setRoles(['root'], 'testSetup').save();
                    });
            }
        });
}
function setupFirstUser () {
    return Users.findOne({email: 'one@first.com'})
        .then(function (found) {
            if (found) {
                return found.resetPrefs().resetProfile().save();
            } else {
                return Users.create('one@first.com', 'silver lining', 'password', 'en');
            }
        });
}
function setupRolesAndUsers () {
    return setupConnect()
        .then(setupRootRole)
        .then(setupReadonlyRole)
        .then(setupRootUser)
        .then(setupFirstUser)
        .then(function () {
            return true;
        });
}
exports.setupRolesAndUsers = setupRolesAndUsers;
function findAndLogin (user, roles) {
    return Users.findOne({email: user})
        .then(function (foundUser) {
            if (roles) {
                foundUser.setRoles(roles, 'test');
            }
            return foundUser.loginSuccess('test', 'test').save();
        })
        .then(function (loggedin) {
            return {user: loggedin, authheader: authorizationHeader(loggedin)};
        });
}
module.exports.findAndLogin = findAndLogin;
let setupServer = function () {
    return new Promise(function (resolve, reject) {
        setupRolesAndUsers()
            .then(function () {
                return findAndLogin('root');
            })
            .then(function (foundUser) {
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
                    server = new Hapi.Server();
                    server.connection({host: 'localhost', port: Config.port});
                    server.register(plugins, function (err) {
                        if (err) {
                            reject(err);
                        } else {
                            components.forEach(function (component) {
                                try {
                                    server.route(require(component));
                                } catch (err) {
                                    console.log(err, err.stack);
                                }
                            });
                            resolve({server: server, authheader: foundUser.authheader});
                        }
                    });
                } else {
                    resolve({server: server, authheader: foundUser.authheader});
                }
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            });
    });
};
exports.setupServer = setupServer;
function cleanupUsers (usersToCleanup) {
    if (utils.hasItems(usersToCleanup)) {
        return Users.remove({email: {$in: usersToCleanup}});
    } else {
        return Promise.resolve(true);
    }
}
function cleanupUserGroups (groupsToCleanup) {
    if (utils.hasItems(groupsToCleanup)) {
        return UserGroups.remove({name: {$in: groupsToCleanup}});
    } else {
        return Promise.resolve(true);
    }
}
function cleanupBlogs (blogsToCleanup) {
    if (utils.hasItems(blogsToCleanup)) {
        return Blogs.remove({title: {$in: blogsToCleanup}});
    } else {
        return Promise.resolve(true);
    }
}
function cleanupPosts (postsToCleanup) {
    if (utils.hasItems(postsToCleanup)) {
        return Posts.remove({title: {$in: postsToCleanup}});
    } else {
        return Promise.resolve(true);
    }
}
function cleanupNotifications (toClear) {
    let notificationsToCleanup = _.flatten(_.map(['userGroups', 'blogs', 'posts'], function (a) {
        return _.map(toClear[a], function (i) {
            return new RegExp(i, 'g');
        });
    }));
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
}
function cleanupAudit () {
    return Audit.remove({});
}
module.exports.cleanupAudit = cleanupAudit;
function cleanupAuthAttempts () {
    return AuthAttempts.remove({});
}
module.exports.cleanupAuthAttempts = cleanupAuthAttempts;
let cleanupRoles = function (roles) {
    return Roles.remove({name: {$in: roles}});
};
module.exports.cleanupRoles = cleanupRoles;
function cleanupConnect () {
    mongodb = undefined;
    Model.disconnect();
}
exports.cleanupConnect = cleanupConnect;
let cleanup = function (toClear, cb) {
    Promise.join(cleanupUsers(toClear.users),
        cleanupUserGroups(toClear.userGroups),
        cleanupBlogs(toClear.blogs),
        cleanupPosts(toClear.posts),
        cleanupNotifications(toClear),
        cleanupAudit(),
        cleanupAuthAttempts(),
        function () {
            cb();
        })
        .catch(function (err) {
            cb(err);
        })
        .done();
};
exports.cleanup = cleanup;
let testComplete = function (notify, err) {
    if (notify) {
        if (err) {
            notify(err);
        } else {
            notify();
        }
    }
};
exports.testComplete = testComplete;
