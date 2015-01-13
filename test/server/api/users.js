'use strict';
var Config = require('./../../../config').config({argv: []});
var Manifest = require('./../../../manifest').manifest;
var Hapi = require('hapi');
var HapiAuthBasic = require('hapi-auth-basic');
var AuthPlugin = require('../../../server/auth');
var HapiMongoModels = require('hapi-mongo-models');
var UsersPlugin = require('./../../../server/api/users');
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
    var ModelsPlugin, server, emails = [];
    beforeEach(function (done) {
        ModelsPlugin = {
            register: HapiMongoModels,
            options: JSON.parse(JSON.stringify(Manifest)).plugins['hapi-mongo-models']
        };
        var plugins = [HapiAuthBasic, ModelsPlugin, AuthPlugin, UsersPlugin];
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
                    done();
                });
        });
    });

    it('should send back a not authorized when user is not logged in', function (done) {
        var Users = server.plugins['hapi-mongo-models'].Users;
        var authheader = '';
        Users._findOne({email: 'test.users@test.api'})
            .then(function (foundUser) {
                authheader = authorizationHeader(foundUser.email, foundUser.session.key);
                foundUser.logout('test', 'test');
            })
            .then(function () {
                var request = {
                    method: 'GET',
                    url: '/users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    expect(response.statusCode).to.equal(401);
                    done();
                });
            });
    });

    it('should send back a not authorized when user does not have permissions to view', function (done) {
        var Users = server.plugins['hapi-mongo-models'].Users;
        var authheader = '';
        Users._findOne({email: 'test.users@test.api'})
            .then(function (foundUser) {
                authheader = authorizationHeader(foundUser.email, foundUser.session.key);
                foundUser.updateRoles([], 'test');
            })
            .then(function () {
                var request = {
                    method: 'GET',
                    url: '/users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    expect(response.statusCode).to.equal(401);
                    done();
                });
            });
    });

    it('should send back users when requestor has permissions and is authenticated, Users:GET /users', function (done) {
        var Users = server.plugins['hapi-mongo-models'].Users;
        var authheader = '';
        Users._findOne({email: 'one@first.com'})
            .then(function (foundUser) {
                foundUser.loginSuccess('test', 'test').done();
                authheader = authorizationHeader(foundUser.email, foundUser.session.key);
            })
            .then(function () {
                var request = {
                    method: 'GET',
                    url: '/users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, function (response) {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist();
                    done();
                });
            });
    });

    describe('GET /users', function () {
        var authheader = '';
        beforeEach(function (done) {
            var Users = server.plugins['hapi-mongo-models'].Users;
            Users._findOne({email: 'one@first.com'})
                .then(function (foundUser) {
                    foundUser.loginSuccess('test', 'test').done();
                    authheader = authorizationHeader(foundUser.email, foundUser.session.key);
                });
            emails.push('test.users2@test.api');
            Users.create('test.users2@test.api', 'password123')
                .then(function (newUser) {
                    newUser.loginSuccess('test', 'test').done();
                    newUser.deactivate('test').done();
                    done();
                });
        });
        it('should give active users when isactive = true is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/users?isActive=true',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                expect(response.payload).to.exist();
                expect(response.payload).to.not.contain('test.users2@test.api');
                done();
            });
        });
        it('should give inactive users when isactive = false is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/users?isActive=false',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                expect(response.payload).to.exist();
                expect(response.payload).to.contain('test.users2@test.api');
                done();
            });
        });
        it('should give only the user whose email is sent in the parameter', function (done) {
            var request = {
                method: 'GET',
                url: '/users?email=one@first.com',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                expect(response.payload).to.exist();
                expect(response.payload).to.not.contain('test.users2@test.api');
                expect(response.payload).to.contain('one@first.com');
                done();
            });
        });
        it('should return both inactive and active users when nothing is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/users',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                expect(response.payload).to.exist();
                expect(response.payload).to.contain('test.users2@test.api');
                expect(response.payload).to.contain('one@first.com');
                done();
            });
        });
    });

    describe('GET /users/{id}', function () {
        var authheader = '';
        var id = '';
        beforeEach(function(done) {
            var Users = server.plugins['hapi-mongo-models'].Users;
            Users._findOne({email: 'one@first.com'})
                .then(function (foundUser) {
                    foundUser.loginSuccess('test', 'test').done();
                    authheader = authorizationHeader(foundUser.email, foundUser.session.key);
                    id = foundUser._id.toString();
                    done();
                });
        });
        it('should only send back user with the id in params', function (done) {
            var request = {
                method: 'GET',
                url: '/users/'+id,
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                expect(response.payload).to.exist();
                expect(response.payload).to.contain(id);
                done();
            });
        });
        it('should send back not found when the user with the id in params is not found', function (done) {
            var request = {
                method: 'GET',
                url: '/users/abcdefabcdefabcdefabcdef',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(404);
                done();
            });
        });
    });

    describe('PUT /users/{id}', function () {
        var authheader = '';
        var id = '';
        beforeEach(function (done) {
            var Users = server.plugins['hapi-mongo-models'].Users;
            Users._findOne({email: 'root'})
                .then(function (foundUser) {
                    foundUser.loginSuccess('test', 'test').done();
                    authheader = authorizationHeader(foundUser.email, foundUser.session.key);
                });
            emails.push('test.users2@test.api');
            Users.create('test.users2@test.api', 'password123')
                .then(function (newUser) {
                    newUser.loginSuccess('test', 'test').done();
                    id = newUser._id.toString();
                    done();
                });
        });
        it('should update is active, session should be deactivated and changes audited', function (done) {
            var request = {
                method: 'PUT',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                },
                payload: {
                    isActive: false
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                var Users = server.plugins['hapi-mongo-models'].Users;
                var UsersAudit = server.plugins['hapi-mongo-models'].UsersAudit;
                Users._findOne({_id: server.plugins['hapi-mongo-models'].BaseModel.ObjectID(id)})
                    .then(function (foundUser) {
                        expect(foundUser.isActive).to.be.false();
                        expect(foundUser.session).to.not.exist();
                        UsersAudit._findOne({userId: foundUser.email, action:'deactivate'})
                            .then(function(foundAudit) {
                                expect(foundAudit).to.exist();
                                done();
                            })
                            .done();
                    })
                    .done();
            });
        });
        it('should update roles, session should be deactivated and changes audited', function (done) {
            var request = {
                method: 'PUT',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                },
                payload: {
                    roles: ['readonly', 'limitedupd']
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                var Users = server.plugins['hapi-mongo-models'].Users;
                var UsersAudit = server.plugins['hapi-mongo-models'].UsersAudit ;
                Users._findOne({_id: server.plugins['hapi-mongo-models'].BaseModel.ObjectID(id)})
                    .then(function (foundUser) {
                        expect(foundUser.roles).to.include(['readonly', 'limitedupd']);
                        expect(foundUser.session).to.not.exist();
                        UsersAudit._findOne({userId: foundUser.email, action:'update roles'})
                            .then(function(foundAudit) {
                                expect(foundAudit).to.exist();
                                done();
                            })
                            .done();
                    })
                    .done();
            });
        });
        it('should update password, session should be deactivated and changes audited', function (done) {
            var request = {
                method: 'PUT',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                },
                payload: {
                    password: 'newpassword'
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                var Users = server.plugins['hapi-mongo-models'].Users;
                var UsersAudit = server.plugins['hapi-mongo-models'].UsersAudit ;
                Users._findOne({_id: server.plugins['hapi-mongo-models'].BaseModel.ObjectID(id)})
                    .then(function (foundUser) {
                        expect(foundUser.session).to.not.exist();
                        UsersAudit._findOne({userId: foundUser.email, action:'reset password'})
                            .then(function(foundAudit) {
                                expect(foundAudit).to.exist();
                                done();
                            })
                            .done();
                    })
                    .done();
            });
        });
        it('should update roles, password and is active, session should be deactivated and all changes audited', function (done) {
            var request = {
                method: 'PUT',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                },
                payload: {
                    isActive: true,
                    roles: ['readonly'],
                    password: 'newpassword'
                }
            };
            server.inject(request, function (response) {
                expect(response.statusCode).to.equal(200);
                var Users = server.plugins['hapi-mongo-models'].Users;
                Users._findOne({_id: server.plugins['hapi-mongo-models'].BaseModel.ObjectID(id)})
                    .then(function (foundUser) {
                        expect(foundUser.session).to.not.exist();
                        expect(foundUser.roles).to.include(['readonly']);
                        expect(foundUser.isActive).to.be.true();
                        done();
                    })
                    .done();
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
                UsersAudit.remove({userId: 'one@first.com'}, function (err) {
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

