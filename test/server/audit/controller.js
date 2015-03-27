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
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Audit', function () {
    var authheader = '';
    var server = null;
    var emails = [];
    beforeEach(function (done) {
        tu.setupServer()
            .then(function (res) {
                server = res.server;
                authheader = res.authheader;
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
                Users.create('test.users@test.api', 'silver lining', 'password123', 'en')
                    .then(function (newUser) {
                        return newUser.loginSuccess('test', 'test').save();
                    })
                    .then(function () {
                        return Users.create('test.users2@test.api', 'silver lining', 'password123', 'en');
                    })
                    .then(function (newUser2) {
                        return newUser2.loginSuccess('test', 'test').save();
                    }).then(function (newUser2) {
                        newUser2.deactivate('test').save();
                        emails.push('test.users2@test.api');
                        emails.push('test.users@test.api');
                        done();
                    })
                    .catch(function (err) {
                        emails.push('test.users2@test.api');
                        emails.push('test.users@test.api');
                        done(err);
                    })
                    .done();
            });
            it('should give audit of only the user whose email is sent in the parameter', function (done) {
                var request = {
                    method: 'GET',
                    url: '/audit?objectChangedId=test.users2@test.api&objectType=users',
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
                    url: '/audit?by=test&objectType=users',
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
            it('should give audit of all changes', function (done) {
                var request = {
                    method: 'GET',
                    url: '/audit',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });
    });

    afterEach(function (done) {
        return tu.cleanup({users: emails}, done);
    });

});

