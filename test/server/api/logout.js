'use strict';
var Config = require('./../../../config').config({argv: []});
var Manifest = require('./../../../manifest').manifest;
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var HapiMongoModels = require('hapi-mongo-models');
var AuthPlugin = require('../../../server/auth');
var LogoutPlugin = require('../../../server/api/logout');
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


describe('Logout', function () {
    var ModelsPlugin, server, emails = [];
    var authorizationHeader = function (user, password) {
        return 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
    };

    beforeEach(function (done) {
        ModelsPlugin = {
            register: HapiMongoModels,
            options: JSON.parse(JSON.stringify(Manifest)).plugins['hapi-mongo-models']
        };
        var plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin, LogoutPlugin];
        server = new Hapi.Server();
        server.connection({port: Config.port.web});
        server.register(plugins, function (err) {
            if (err) {
                throw err;
            }
            done();
        });
    });

    it('returns an error when no authorization is passed', function (done) {
        var request = {
            method: 'DELETE',
            url: '/logout'
        };
        server.inject(request, function (response) {
            expect(response.statusCode).to.equal(401);
            done();
        });
    });

    it('returns a not found when user does not exist', function (done) {
        var request = {
            method: 'DELETE',
            url: '/logout',
            headers: {
                Authorization: authorizationHeader('test.not.created@logout.api', '123')
            }
        };
        emails.push('test.not.created@logout.api');
        server.inject(request, function (response) {
            expect(response.statusCode).to.equal(401);
            done();
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
                request.headers.Authorization = authorizationHeader(foundUser.email, foundUser.session.key);
                foundUser.logout('test', 'test').done();
            })
            .done();
        server.inject(request, function (response) {
            expect(response.statusCode).to.equal(401);
            Users._findOne({email: 'one@first.com'})
                .then(function (foundUser) {
                    foundUser.loginSuccess('test', 'test').done();
                })
                .done();
            done();
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
                request.headers.Authorization = authorizationHeader(foundUser.email, foundUser.session.key);
                server.inject(request, function (response) {
                    expect(response.statusCode).to.equal(200);
                    Users._findOne({email: 'one@first.com'})
                        .then(function (foundUser) {
                            expect(foundUser.session).to.not.exist();
                            foundUser.loginSuccess('test', 'test').done();
                        })
                        .done();
                    done();
                });
            }).done();
    });

    afterEach(function (done) {
        if (emails.length > 0) {
            var UsersAudit = server.plugins['hapi-mongo-models'].UsersAudit;
            UsersAudit.remove({userId: {$in: emails}}, function (err) {
                if (err) {
                    throw err;
                }
                done();
            });
        } else {
            done();
        }
    });
});
