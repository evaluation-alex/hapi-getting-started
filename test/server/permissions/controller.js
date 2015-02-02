'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Users = require(relativeToServer + 'users/model');
var Permissions = require(relativeToServer + 'permissions/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Audit = require(relativeToServer + 'audit/model');

//var expect = require('chai').expect;
var tu = require('./../testutils');
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

describe('Permissions', function () {
    var rootAuthHeader = null;
    var server = null;
    var permissionsToClear = [];
    var groupsToClear = [];
    beforeEach(function (done) {
        server = tu.setupServer()
            .then(function (s) {
                server = s;
                return tu.setupRolesAndUsers();
            })
            .then(function () {
                return Users.findByEmail('root');
            })
            .then(function (root) {
                return root.loginSuccess('test', 'test');
            })
            .then(function (root) {
                rootAuthHeader = tu.authorizationHeader(root);
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();

    });

    describe('GET /permissions', function () {
        it('should give permissions when isactive = true is sent', function (done) {
            done();
        });
        it('should give inactive permissions when isactive = false is sent', function (done) {
            done();
        });
        it('should give the permissions where the user / group is a member when user is sent in the parameters', function (done) {
            done();
        });
        it('should give the permissions where the object is sent in the parameters', function (done) {
            done();
        });
        it('should give the permissions where the action is sent in the parameters', function (done) {
            done();
        });
        it('should return both inactive and active permissions when nothing is sent', function (done) {
            done();
        });
    });

    describe('GET /permissions/{id}', function () {
        it('should only send back permissions with the id in params', function (done) {
            done();
        });
        it('should send back not found when the permissions with the id in params is not found', function (done) {
            done();
        });
    });

    describe('PUT /permissions/{id}', function () {
        it('should send back not found error when you try to modify non existent permissions', function (done) {
            done();
        });
        it('should send back error if any of the users to be added are not valid', function (done) {
            done();
        });
        it('should activate / deactivate permissions and have changes audited', function (done) {
            done();
        });
        it('should add / remove users and have changes audited', function (done) {
            done();
        });
        it('should update description and have changes audited', function (done) {
            done();
        });
    });

    describe('POST /permissions/{id}', function () {
        it('should send back conflict when you try to create a permission with object, action that already exists', function (done) {
            done();
        });
        it('should send back error if any user/group sent in the request does not exist', function (done) {
            done();
        });
    });

    describe('DELETE /permissions/{id}', function () {
        it('should send back not found error when you try to modify a non existent permissions', function (done) {
            done();
        });
        it('should deactivate permissions and have changes audited', function (done) {
            done();
        });
    });

    afterEach(function (done) {
        tu.cleanup(null, groupsToClear, permissionsToClear, done);
    });

});

