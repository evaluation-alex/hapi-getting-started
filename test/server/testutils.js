'use strict';
var relativeTo = './../../';
var relativeToServer = './../../server/';
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var Promise = require('bluebird');
var AuthPlugin = require(relativeToServer + 'common/plugins/auth');
var MetricsPlugin = require(relativeToServer + 'common/plugins/metrics');
var Config = require(relativeTo + 'config');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Users = require(relativeToServer + 'users/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Audit = require(relativeToServer + 'audit/model');
var Blogs = require(relativeToServer + 'blogs/model');
var Posts = require(relativeToServer + 'blogs/posts/model');
var AuthAttempts = require(relativeToServer + 'auth-attempts/model');
var Roles = require(relativeToServer + 'roles/model');
var Notifications = require(relativeToServer + 'users/notifications/model');

var _ = require('lodash');

var mongodb;

var authorizationHeader = function (user) {
    return 'Basic ' + (new Buffer(user.email + ':' + user.session.key)).toString('base64');
};

exports.authorizationHeader = authorizationHeader;

var authorizationHeader2 = function (user, password) {
    return 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
};

exports.authorizationHeader2 = authorizationHeader2;

var setupConnect = function () {
    return new Promise(function (resolve, reject) {
        BaseModel.connect(Config.hapiMongoModels.mongodb, function (err, db) {
            if (err || !db) {
                reject(err);
            } else {
                mongodb = db;
                resolve(true);
            }
        });
    });
};

exports.setupConnect = setupConnect;
/*jshint unused:false*/
function setupRootRole () {
    return new Promise(function (resolve, reject) {
        Roles._find({name: 'root', organisation: 'silver lining'})
            .then(function (found) {
                if (found && found.length > 0) {
                    resolve(found[0]);
                } else {
                    resolve(Roles.create('root', 'silver lining', [{action: 'update', object: '*'}, {
                        action: 'view',
                        object: '*'
                    }]));
                }
            });
    });
}

function setupReadonlyRole () {
    return new Promise(function (resolve, reject) {
        Roles._find({name: 'readonly', organisation: 'silver lining'})
            .then(function (found) {
                if (found && found.length > 0) {
                    resolve(found[0]);
                } else {
                    resolve(Roles.create('readonly', 'silver lining', [{action: 'view', object: '*'}]));
                }
            });
    });
}

function setupRootUser () {
    return new Promise(function (resolve, reject) {
        Users._findOne({email: 'root'})
            .then(function (found) {
                if (found) {
                    resolve(found.setRoles(['root'], 'testSetup').save());
                } else {
                    Users.create('root', 'password123', 'silver lining')
                        .then(function (rt) {
                            resolve(rt.setRoles(['root'], 'testSetup').save());
                        });
                }
            });
    });
}

function setupFirstUser () {
    return new Promise(function (resolve, reject) {
        Users._findOne({email: 'one@first.com'})
            .then(function (found) {
                if (found) {
                    resolve(found);
                } else {
                    resolve(Users.create('one@first.com', 'password', 'silver lining'));
                }
            });
    });
}
/*jshint unused:true*/

function setupRolesAndUsers () {
    return new Promise(function (resolve, reject) {
        setupConnect()
            .then(setupRootRole)
            .then(setupReadonlyRole)
            .then(setupRootUser)
            .then(setupFirstUser)
            .then(function () {
                resolve(true);
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            })
            .done();
    });
}

exports.setupRolesAndUsers = setupRolesAndUsers;

var setupServer = function () {
    return new Promise(function (resolve, reject) {
        setupRolesAndUsers()
            .then(function () {
                return Users._findOne({email: 'root'});
            })
            .then(function (foundUser) {
                return foundUser.loginSuccess('test', 'test').save();
            })
            .then(function (foundUser) {
                var Manifest = require('./../../server/manifest').manifest;
                var components = [
                    '../../server/audit',
                    '../../server/auth-attempts',
                    '../../server/contact',
                    '../../server/session',
                    '../../server/user-groups',
                    '../../server/users',
                    '../../server/blogs',
                    '../../server/blogs/posts',
                    '../../server/users/notifications'
                ];
                var ModelsPlugin = {
                    register: require('hapi-mongo-models'),
                    options: JSON.parse(JSON.stringify(Manifest.plugins['hapi-mongo-models']))
                };
                var plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin, MetricsPlugin];
                var server = new Hapi.Server();
                server.connection({host: 'localhost', port: Config.port});
                server.register(plugins, function (err) {
                    if (err) {
                        reject(err);
                    } else {
                        components.forEach(function (component) {
                            try {
                                server.route(require(component));
                            } catch (err) {
                                console.log(err);
                            }
                        });
                        resolve({server: server, authheader: authorizationHeader(foundUser)});
                    }
                });
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            })
            .done();
    });
};

exports.setupServer = setupServer;

function cleanupUsers (usersToCleanup) {
    return new Promise(function (resolve, reject) {
        if (usersToCleanup && usersToCleanup.length > 0) {
            Users.remove({email: {$in: usersToCleanup}}, function (err) {
                err ? reject(err) : resolve(true);
            });
        } else {
            resolve(true);
        }
    });
}

function cleanupUserGroups (groupsToCleanup) {
    return new Promise(function (resolve, reject) {
        if (groupsToCleanup && groupsToCleanup.length > 0) {
            UserGroups.remove({name: {$in: groupsToCleanup}}, function (err) {
                err ? reject(err) : resolve(true);
            });
        } else {
            resolve(true);
        }
    });
}

function cleanupBlogs (blogsToCleanup) {
    return new Promise(function (resolve, reject) {
        if (blogsToCleanup && blogsToCleanup.length > 0) {
            Blogs.remove({title: {$in: blogsToCleanup}}, function (err) {
                err ? reject(err) : resolve(true);
            });
        } else {
            resolve(true);
        }
    });
}

function cleanupPosts (postsToCleanup) {
    return new Promise(function (resolve, reject) {
        if (postsToCleanup && postsToCleanup.length > 0) {
            Posts.remove({title: {$in: postsToCleanup}}, function (err) {
                err ? reject(err) : resolve(true);
            });
        } else {
            resolve(true);
        }
    });
}

function cleanupNotifications (toClear) {
    return new Promise(function (resolve, reject) {
        var notificationsToCleanup = _.flatten(_.map(['userGroups', 'blogs', 'posts'], function (a) {
            return _.map(toClear[a], function (i) {
                return new RegExp(i, 'g');
            });
        }));
        Notifications.remove({'title.1.title': {$in: notificationsToCleanup}}, function (err) {
            err ? reject(err) : resolve(true);
        });
    });
}

function cleanupAudit () {
    return new Promise(function (resolve, reject) {
        Audit.remove({}, function (err) {
            err ? reject(err) : resolve(true);
        });
    });
}

function cleanupAuthAttempts () {
    return new Promise(function (resolve, reject) {
        AuthAttempts.remove({}, function (err) {
            err ? reject(err) : resolve(true);
        });
    });
}

var cleanupRoles = function (roles) {
    return new Promise(function (resolve, reject) {
        Roles.remove({name: {$in: roles}}, function (err) {
            err ? reject(err) : resolve(true);
        });
    });
};

module.exports.cleanupRoles = cleanupRoles;

function cleanupConnect (cb) {
    BaseModel.disconnect();
    cb();
}

exports.cleanupConnect = cleanupConnect;

var cleanup = function (toClear, cb) {
    Promise.join(cleanupUsers(toClear.users),
        cleanupUserGroups(toClear.userGroups),
        cleanupBlogs(toClear.blogs),
        cleanupPosts(toClear.posts),
        cleanupNotifications(toClear),
        cleanupAudit(),
        cleanupAuthAttempts(),
        function () {
            //cleanupConnect(cb);
            cb();
        })
        .catch(function (err) {
            cb(err);
        })
        .done();
};

exports.cleanup = cleanup;

var testComplete = function (notify, err) {
    if (notify) {
        if (err) {
            notify(err);
        } else {
            notify();
        }
    }
};

exports.testComplete = testComplete;
