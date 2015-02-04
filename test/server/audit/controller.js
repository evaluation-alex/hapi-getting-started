'use strict';
var relativeToServer = './../../../server/';
var Users = require(relativeToServer + 'users/model');
var Permissions = require(relativeToServer + 'permissions/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Promise = require('bluebird');
//var expect = require('chai').expect;
var Code = require('code');   // assertion library
var Lab = require('lab');
var tu = require('./../testutils');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Audit', function () {
    var authheader = '';
    var server = null;
    var emails = [];
    var permissionsToClear = [];
    var groupsToClear = [];
    beforeEach(function (done) {
        tu.setupServer()
            .then(function (s) {
                server = s;
                return tu.setupRolesAndUsers();
            })
            .then(function () {
                return Users._findOne({email: 'root'});
            })
            .then(function (foundUser) {
                return foundUser.loginSuccess('test', 'test');
            })
            .then(function (foundUser) {
                authheader = tu.authorizationHeader(foundUser);
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });

    describe('GET /audit', function () {
        describe('users', function () {
            beforeEach(function (done) {
                emails.push('test.users@test.api');
                Users.create('test.users@test.api', 'password123')
                    .then(function (newUser) {
                        return newUser.loginSuccess('test', 'test');
                    })
                    .then(function () {
                        emails.push('test.users2@test.api');
                        return Users.create('test.users2@test.api', 'password123');
                    })
                    .then(function (newUser2) {
                        return newUser2.loginSuccess('test', 'test');
                    }).then(function (newUser2) {
                        newUser2.deactivate('test');
                        done();
                    })
                    .catch(function (err) {
                        if (err) {
                            done(err);
                        }
                    })
                    .done();
            });
            it('should give audit of only the user whose email is sent in the parameter', function (done) {
                var request = {
                    method: 'GET',
                    url: '/audit?objectChangedId=test.users2@test.api&objectType=Users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        expect(response.payload).to.contain('test.users2@test.api');
                        expect(response.payload).to.not.contain('test.users@test.api');
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
            it('should give audit of all changes done by user', function (done) {
                var request = {
                    method: 'GET',
                    url: '/audit?by=test&objectType=Users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        expect(response.payload).to.contain('test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });

        describe('permissions', function () {
        });

        describe('user-groups', function () {

        });
    });


    afterEach(function (done) {
        tu.cleanup(emails, groupsToClear, permissionsToClear, done);
    });

});

