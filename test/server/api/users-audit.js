'use strict';
var Config = require('./../../../config').config({argv: []});
var Manifest = require('./../../../manifest').manifest;
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var AuthPlugin = require('../../../server/auth');
var HapiMongoModels = require('hapi-mongo-models');
var UsersAuditPlugin = require('./../../../server/api/users-audit');
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


describe('UsersAudit', function () {
    var authheader = '';
    var authorizationHeader = function (user, password) {
        return 'Basic ' + (new Buffer(user + ':' + password)).toString('base64');
    };
    var ModelsPlugin, server, emails = [];
    beforeEach(function (done) {
        ModelsPlugin = {
            register: HapiMongoModels,
            options: JSON.parse(JSON.stringify(Manifest)).plugins['hapi-mongo-models']
        };
        var plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin, UsersAuditPlugin];
        server = new Hapi.Server();
        server.connection({port: Config.port.web});
        server.register(plugins, function (err) {
            if (err) {
                throw err;
            }
            var Users = server.plugins['hapi-mongo-models'].Users;
            emails.push('test.users@test.api');
            Users.create('test.users@test.api', 'password123')
                .then(function (newUser) {
                    newUser.loginSuccess('test', 'test').done();
                })
                .then(function () {
                    emails.push('test.users2@test.api');
                    Users.create('test.users2@test.api', 'password123')
                        .then(function (newUser2) {
                            newUser2.loginSuccess('test', 'test').done();
                            newUser2.deactivate('test').done();

                        });
                }).done(function () {
                    done();
                });
        });
    });

    describe('GET /users-audit', function () {
        it('should give audit of only the user whose email is sent in the parameter', function (done) {
            var Users = server.plugins['hapi-mongo-models'].Users;
            Users._findOne({email: 'root'})
                .then(function (foundUser) {
                    foundUser.loginSuccess('test', 'test').done();
                    authheader = authorizationHeader(foundUser.email, foundUser.session.key);
                    var request = {
                        method: 'GET',
                        url: '/users-audit?userId=test.users2@test.api',
                        headers: {
                            Authorization: authheader
                        }
                    };
                    server.inject(request, function (response) {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        expect(response.payload).to.contain('test.users2@test.api');
                        expect(response.payload).to.not.contain('test.users@test.api');
                        done();
                    });
                });
        });
    });

    afterEach(function (done) {
        if (emails.length > 0) {
            var Users = server.plugins['hapi-mongo-models'].Users;
            var UsersAudit = server.plugins['hapi-mongo-models'].UsersAudit;
            Users.remove({email: {$in: emails}}, function (err) {
                if (err) {
                    throw err;
                }
                UsersAudit.remove({userId: 'root'}, function (err) {
                    if (err) {
                        throw err;
                    }
                });
                UsersAudit.remove({userId: {$in: emails}}, function (err) {
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

