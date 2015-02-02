'use strict';
var relativeToServer = './../../../server/';
var Users = require(relativeToServer + 'users/model');
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
    beforeEach(function (done) {
        server = tu.setupServer()
            .then(function (s) {
                server = s;
                return tu.setupRolesAndUsers();
            })
            .then(function () {
                emails.push('test.users@test.api');
                return Users.create('test.users@test.api', 'password123');
            })
            .then(function (newUser) {
                newUser.loginSuccess('test', 'test').done();
            })
            .then(function () {
                emails.push('test.users2@test.api');
                return Users.create('test.users2@test.api', 'password123');
            })
            .then(function (newUser2) {
                newUser2.loginSuccess('test', 'test').done();
                newUser2.deactivate('test').done();
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
        it('should give audit of only the user whose email is sent in the parameter', function (done) {
            Users._findOne({email: 'root'})
                .then(function (foundUser) {
                    foundUser.loginSuccess('test', 'test').done();
                    authheader = tu.authorizationHeader(foundUser);
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
        });
    });

    afterEach(function (done) {
        tu.cleanup(emails, null, null, done);
    });
});
