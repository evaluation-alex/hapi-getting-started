'use strict';
var Hapi = require('hapi');
var LogoutPlugin = require('../../../server/api/logout');
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


describe('Logout', function () {
    var server = null;
    var emails = [];

    beforeEach(function (done) {
        var plugins = [LogoutPlugin];
        server = tu.setupServer(plugins)
            .then(function (s) {
                server = s;
                tu.setupRolesAndUsers();
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });

    it('returns an error when no authorization is passed', function (done) {
        var request = {
            method: 'DELETE',
            url: '/logout'
        };
        server.inject(request, function (response) {
            try {
                expect(response.statusCode).to.equal(401);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('returns a not found when user does not exist', function (done) {
        var request = {
            method: 'DELETE',
            url: '/logout',
            headers: {
                Authorization: tu.authorizationHeader2('test.not.created@logout.api', '123')
            }
        };
        emails.push('test.not.created@logout.api');
        server.inject(request, function (response) {
            try {
                expect(response.statusCode).to.equal(401);
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('returns a not found when user has already logged out', function (done) {
        var request = {
            method: 'DELETE',
            url: '/logout',
            headers: {
                Authorization: ''
            }
        };
        emails.push('one@first.com');
        var Users = server.plugins['hapi-mongo-models'].Users;
        Users._findOne({email: 'one@first.com'})
            .then(function (foundUser) {
                foundUser.loginSuccess('test', 'test').done();
                request.headers.Authorization = tu.authorizationHeader(foundUser);
                foundUser.logout('test', 'test').done();
            })
            .done();
        server.inject(request, function (response) {
            try {
                expect(response.statusCode).to.equal(401);
                Users._findOne({email: 'one@first.com'})
                    .then(function (foundUser) {
                        foundUser.loginSuccess('test', 'test').done();
                    })
                    .done();
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    it('removes the authenticated user session successfully', function (done) {
        var Users = server.plugins['hapi-mongo-models'].Users;
        Users._findOne({email: 'one@first.com'})
            .then(function (foundUser) {
                var request = {
                    method: 'DELETE',
                    url: '/logout',
                    headers: {
                        Authorization: ''
                    }
                };
                foundUser.loginSuccess('test', 'test').done();
                request.headers.Authorization = tu.authorizationHeader(foundUser);
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        Users._findOne({email: 'one@first.com'})
                            .then(function (foundUser) {
                                expect(foundUser.session).to.not.exist();
                                foundUser.loginSuccess('test', 'test').done();
                            })
                            .done();
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            }).done();
    });

    afterEach(function (done) {
        tu.cleanup(emails, null, null, done);
    });
});
