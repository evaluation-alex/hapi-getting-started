'use strict';
var Config = require('./../../../config').config({argv: []});
var Manifest = require('./../../../manifest').manifest;
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var AuthPlugin = require('../../../server/auth');
var HapiMongoModels = require('hapi-mongo-models');
var UserGroupsPlugin = require('./../../../server/api/user-groups');
var Users = require('./../../../server/models/users');
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
    var groupsToClear = [];
    beforeEach(function (done) {
        ModelsPlugin = {
            register: HapiMongoModels,
            options: JSON.parse(JSON.stringify(Manifest)).plugins['hapi-mongo-models']
        };
        var plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin, UserGroupsPlugin];
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
                    groupsToClear.push('testUserGroupsREST');
                    return UserGroups.create('testUserGroupsREST', 'test user-groups REST apis', 'test');
                })
                .then(function () {
                    done();
                });
        });
    });

    describe('GET /user-groups', function () {
        it('should give active groups when isactive = true is sent', function (done) {
            done();
        });
        it('should give inactive groups when isactive = false is sent', function (done) {
            done();
        });
        it('should give only the groups whose name is sent in the parameter', function (done) {
            done();
        });
        it('should give the groups where the user is a member when user id is sent in the parameters', function (done) {
            done();
        });
        it('should return both inactive and active groups when nothing is sent', function (done) {
            done();
        });
    });

    describe('GET /user-groups/{id}', function () {
        it('should only send back user-group with the id in params', function (done) {
            done();
        });
        it('should send back not found when the user with the id in params is not found', function (done) {
            done();
        });
    });

    describe('PUT /user-groups/{id}', function () {
        it('should send back not found error when you try to modify a non existent group', function (done) {
            done();
        });
        it('should send back error if any of the users or owners to be added are not valid', function (done) {
            done();
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', function (done) {
            done();
        });
        it('should activate / deactivate group and have changes audited', function (done) {
            done();
        });
        it('should add / remove users and have changes audited', function (done) {
            done();
        });
        it('should add / remove owners and have changes audited', function (done) {
            done();
        });
        it('should update description and have changes audited', function (done) {
            done();
        });
    });

    describe('POST /user-groups/{id}', function () {
        it('should send back conflict when you try to create a group with name that already exists', function (done) {
            done();
        });
        it('should send back error if any user sent in the request does not exist', function (done) {
            done();
        });
        it('should create a group with the sender as owner, member and the list of users also sent as members of the group', function (done) {
            done();
        });
    });

    describe('DELETE /user-groups/{id}', function () {
        it('should send back not found error when you try to modify a non existent group', function (done) {
            done();
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', function (done) {
            done();
        });
        it('should deactivate group and have changes audited', function (done) {
            done();
        });
    });

    afterEach(function (done) {
        if (groupsToClear.length > 0) {
            UserGroups.remove({name: {$in: groupsToClear}}, function (err) {
                if (err) {
                    throw err;
                }
                Audit.remove({objectChangedId: {$in: groupsToClear}}, function (err) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
            });
        } else {
            done();
        }
    });

});

