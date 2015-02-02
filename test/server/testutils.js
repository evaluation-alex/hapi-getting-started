'use strict';
var relativeTo = './../../';
var relativeToServer = './../../server/';
var Promise = require('bluebird');
var Config = require(relativeTo + 'config').config({argv: []});
var Manifest = require(relativeToServer + 'manifest').manifest;
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var HapiMongoModels = require('hapi-mongo-models');
var BaseModel = require('hapi-mongo-models').BaseModel;
var AuthPlugin = require(relativeToServer + 'common/auth');
var Users = require(relativeToServer + 'users/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Audit = require(relativeToServer + 'audit/model');
var Permissions = require(relativeToServer + 'permissions/model');
var AuthAttempts = require(relativeToServer + 'auth-attempts/model');
var Roles = require(relativeToServer + 'roles/model');

function setupRootRole() {
    var promise = new Promise(function (resolve, reject) {
        Roles.findByName(['root'])
            .then(function (found) {
                if (found && found.length > 0) {
                    resolve(found[0]);
                } else {
                    resolve(Roles.create('root', [{action: 'update', object: '*'},{action: 'view', object: '*'}]));
                }
            });
    });
    return promise;
}

function setupReadonlyRole() {
    var promise = new Promise(function (resolve, reject) {
        Roles.findByName(['readonly'])
            .then(function (found) {
                if (found && found.length > 0) {
                    resolve(found[0]);
                } else {
                    resolve(Roles.create('readonly', [{action: 'view', object: '*'}]));
                }
            });
    });
    return promise;
}

function setupRootUser() {
    var promise = new Promise(function(resolve, reject) {
        Users.findByEmail('root')
            .then(function(found) {
                if (found) {
                    resolve(found);
                } else {
                    Users.create('root', 'password123')
                        .then(function (rt) {
                            rt.updateRoles(['root'], 'testSetup');
                            resolve(rt);
                        });
                }
            });
    });
    return promise;
}

function setupFirstUser() {
    var promise = new Promise(function (resolve, reject) {
        Users.findByEmail('one@first.com')
            .then(function(found) {
                if (found) {
                    resolve(found);
                } else {
                    resolve(Users.create('one@first.com', 'password'));
                }
            });
    });
    return promise;
}

function setupRolesAndUsers() {
    var p1 = setupRootRole();
    var p2 = setupReadonlyRole();
    var p3 = setupRootUser();
    var p4 = setupFirstUser();
    return Promise.join(p1, p2, p3, p4,
        function (rootRole, readonlyRole, rootUser, firstUser) {
            /*
            console.log('root role - ' + JSON.stringify(rootRole));
            console.log('readonly role - ' + JSON.stringify(readonlyRole));
            console.log('root user - ' + JSON.stringify(rootUser));
            console.log('first user - ' + JSON.stringify(firstUser));
            */
            return {
                rootRole: rootRole,
                rootUser: rootUser,
                first: firstUser,
                readonly: readonlyRole
            };
        });
}

exports.setupRolesAndUsers = setupRolesAndUsers;

var setupServer = function(routes) {
    var promise = new Promise(function (resolve, reject) {
        var ModelsPlugin = {
            register: HapiMongoModels,
            options: JSON.parse(JSON.stringify(Manifest)).plugins['hapi-mongo-models']
        };
        var plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin];
        var server = new Hapi.Server();
        server.connection({port: Config.port.web});
        server.register(plugins, function (err) {
            routes.forEach(function(route) {
                server.route(require(route).Routes);
            });
            if (err) {
                reject(err);
            } else {
                resolve(server);
            }
        });
    });
    return promise;
};

exports.setupServer = setupServer;

var setupConnect = function(cb) {
    BaseModel.connect(Config.hapiMongoModels.mongodb, function (err, db) {
        if (err || !db) {
            cb(err);
        } else {
            cb();
        }
    });
};

exports.setupConnect = setupConnect;

function cleanupUsers (usersToCleanup) {
    var promise = new Promise(function (resolve, reject) {
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
    return promise;
}

function cleanupUserGroups (groupsToCleanup) {
    var promise = new Promise(function (resolve, reject) {
        if (groupsToCleanup && groupsToCleanup.length > 0 ){
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
    return promise;
}

function cleanupPermissions (permissionsToCleanup) {
    var promise = new Promise(function (resolve, reject) {
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
    return promise;
}

function cleanupAudit() {
    var promise = new Promise(function (resolve, reject) {
        Audit.remove({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
    return promise;
}

function cleanupAuthAttempts() {
    var promise = new Promise(function (resolve, reject) {
        AuthAttempts.remove({}, function (err) {
            if (err) {
                reject(err);
            } else {
                resolve(true);
            }
        });
    });
    return promise;
}

 function cleanupConnect(cb) {
    BaseModel.disconnect();
    cb();
}

exports.cleanupConnect = cleanupConnect;

var cleanup = function (users, userGroups, permissions, cb) {
    Promise.join(cleanupUsers(users), cleanupUserGroups(userGroups), cleanupPermissions(permissions), cleanupAudit(), cleanupAuthAttempts(),
        function(u, ug, p, a, aa) {
            //cleanupConnect(cb);
            cb();
        })
        .catch(function (err) {
            cb(err);
        });
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
