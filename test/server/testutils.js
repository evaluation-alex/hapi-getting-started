'use strict';
var relativeTo = './../../';
var relativeToServer = './../../server/';
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var AuthPlugin = require(relativeToServer + 'common/auth');
var MetricsPlugin = require(relativeToServer + 'common/metrics');
var Promise = require('bluebird');
var Config = require(relativeTo + 'config');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Users = require(relativeToServer + 'users/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Audit = require(relativeToServer + 'audit/model');
var Permissions = require(relativeToServer + 'permissions/model');
var Blogs = require(relativeToServer + 'blogs/model');
var AuthAttempts = require(relativeToServer + 'auth-attempts/model');
var Roles = require(relativeToServer + 'roles/model');

var mongodb;
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

function setupRootRole () {
    return new Promise(function (resolve/*, reject*/) {
        Roles.findByName(['root'], 'silver lining')
            .then(function (found) {
                if (found && found.length > 0) {
                    resolve(found[0]);
                } else {
                    resolve(Roles.create('root', 'silver lining', [{action: 'update', object: '*'}, {action: 'view', object: '*'}]));
                }
            });
    });
}

function setupReadonlyRole () {
    return new Promise(function (resolve/*, reject*/) {
        Roles.findByName(['readonly'], 'silver lining')
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
    return new Promise(function (resolve/*, reject*/) {
        Users.findByEmail('root')
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
    return new Promise(function (resolve/*, reject*/) {
        Users.findByEmail('one@first.com')
            .then(function (found) {
                if (found) {
                    resolve(found);
                } else {
                    resolve(Users.create('one@first.com', 'password', 'silver lining'));
                }
            });
    });
}

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
        setupConnect()
            .then(function () {
                var Manifest = require('./../../server/manifest').manifest;
                var components = [
                    '../../server/audit',
                    '../../server/auth-attempts',
                    '../../server/contact',
                    '../../server/permissions',
                    '../../server/session',
                    '../../server/user-groups',
                    '../../server/users',
                    '../../server/blogs'
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
                                var routes = require(component).Routes;
                                server.route(routes);
                            } catch (err) {
                                console.log(err);
                            }
                        });
                        resolve(server);
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
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
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
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        } else {
            resolve(true);
        }
    });
}

function cleanupPermissions (permissionsToCleanup) {
    return new Promise(function (resolve, reject) {
        if (permissionsToCleanup && permissionsToCleanup.length > 0) {
            Permissions.remove({description: {$in: permissionsToCleanup}}, function (err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
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
                if (err) {
                    reject(err);
                } else {
                    resolve(true);
                }
            });
        } else {
            resolve(true);
        }
    });
}

function cleanupMetrics() {
    return new Promise(function (resolve, reject) {
        mongodb.collection('metrics').remove({}, function (err, no) {
            if (err) {
                reject(err);
            } else {
                resolve(no);
            }
        });
    });
}

function cleanupAudit () {
    return new Promise(function (resolve, reject) {
        Audit.remove({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

function cleanupAuthAttempts () {
    return new Promise(function (resolve, reject) {
        AuthAttempts.remove({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
}

var cleanupRoles = function(roles) {
    return new Promise(function (resolve, reject) {
        Roles.remove({name: {$in : roles}}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
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
    Promise.join(cleanupUsers(toClear.users), cleanupUserGroups(toClear.userGroups), cleanupPermissions(toClear.permissions), cleanupBlogs(toClear.blogs), cleanupAudit(), cleanupAuthAttempts(), cleanupMetrics(),
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

var authorizationHeader = function (user) {
    return 'Basic ' + (new Buffer(user.email + ':' + user.session.key)).toString('base64');
};

exports.authorizationHeader = authorizationHeader;

var authorizationHeader2 = function (user, password) {
    return 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
};

exports.authorizationHeader2 = authorizationHeader2;

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
