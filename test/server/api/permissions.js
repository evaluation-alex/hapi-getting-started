'use strict';
var Config = require('./../../../config').config({argv: []});
var Manifest = require('./../../../manifest').manifest;
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var AuthPlugin = require('../../../server/auth');
var HapiMongoModels = require('hapi-mongo-models');
var PermissionsPlugin = require('./../../../server/api/permissions');
var Users = require('./../../../server/models/users');
var Permissions = require('./../../../server/models/permissions');
var UserGroups = require('./../../../server/models/user-groups');
var Audit = require('./../../../server/models/audit');

//var expect = require('chai').expect;
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Users', function () {
    var authorizationHeader = function (user, password) {
        return 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
    };
    var rootAuthHeader = null;
    var ModelsPlugin, server;
    var permissionsToClear = [];
    var groupsToClear = [];
    beforeEach(function (done) {
        ModelsPlugin = {
            register: HapiMongoModels,
            options: JSON.parse(JSON.stringify(Manifest)).plugins['hapi-mongo-models']
        };
        var plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin, PermissionsPlugin];
        server = new Hapi.Server();
        server.connection({port: Config.port.web});
        server.register(plugins, function (err) {
            if (err) {
                throw err;
            }
            Users.findByEmail('root')
                .then(function (root) {
                    return root.loginSuccess('test', 'test');
                })
                .then(function(root) {
                    rootAuthHeader = authorizationHeader(root.email, root.session.key);
                    done();
                });
        });
    });

    describe('GET /permissions', function () {
        it('should give permissions when isactive = true is sent', function (done) {
        });
        it('should give inactive permissions when isactive = false is sent', function (done) {
        });
        it('should give the permissions where the user / group is a member when user is sent in the parameters', function (done) {
        });
        it('should give the permissions where the object is sent in the parameters', function (done) {
        });
        it('should give the permissions where the action is sent in the parameters', function (done) {
        });
        it('should return both inactive and active permissions when nothing is sent', function (done) {
        });
    });

    describe('GET /permissions/{id}', function () {
        it('should only send back permissions with the id in params', function (done) {
        });
        it('should send back not found when the permissions with the id in params is not found', function (done) {
        });
    });

    describe('PUT /permissions/{id}', function () {
        it('should send back not found error when you try to modify non existent permissions', function (done) {
        });
        it('should send back error if any of the users to be added are not valid', function (done) {
        });
        it('should activate / deactivate permissions and have changes audited', function (done) {
        });
        it('should add / remove users and have changes audited', function (done) {
        });
        it('should update description and have changes audited', function (done) {
        });
    });

    describe('POST /user-groups/{id}', function () {
        it('should send back conflict when you try to create a permission with object, action that already exists', function (done) {
        });
        it('should send back error if any user/group sent in the request does not exist', function (done) {
        });
    });

    describe('DELETE /user-groups/{id}', function () {
        it('should send back not found error when you try to modify a non existent permissions', function (done) {
        });
        it('should deactivate permissions and have changes audited', function (done) {
        });
    });

    afterEach(function (done) {
        Permissions.remove({description: {$in: permissionsToClear}}, function (err, result) {
            if (err) {
                throw err;
            }
            UserGroups.remove({name: {$in: groupsToClear}}, function (err, result) {
                if (err) {
                    throw err;
                }
                Audit.remove({objectChangedType: {$in: ['Permissions', 'UserGroups', 'Users']}}, function (err, result) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
            });
        });
    });

});

