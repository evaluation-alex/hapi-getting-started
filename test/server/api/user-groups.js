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
var Promise = require('bluebird');
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

describe('UserGroups', function () {
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
                .then(function (root) {
                    rootAuthHeader = authorizationHeader(root.email, root.session.key);
                })
                .then(function () {
                    done();
                });
        });
    });

    describe('GET /user-groups', function () {
        before(function (done) {
            groupsToClear.push('GetUserGroupsTestName');
            groupsToClear.push('GetUserGroupsTestMemberActive');
            groupsToClear.push('GetUserGroupsTestMemberInactive');
            groupsToClear.push('GetUserGroupsTestInactive');
            var g1 = UserGroups.create('GetUserGroupsTestName', 'GET /user-groups', 'root');
            var g2 = UserGroups.create('GetUserGroupsTestMemberActive', 'GET /user-groups', 'root');
            var g3 = UserGroups.create('GetUserGroupsTestMemberInactive', 'GET /user-groups', 'root');
            var g4 = UserGroups.create('GetUserGroupsTestInactive', 'GET /user-groups', 'root');
            Promise.join(g1, g2, g3, g4, function (g1, g2, g3, g4) {
                var p = [];
                p.push(g2.addUsers(['user1', 'user2'], 'member', 'root'));
                p.push(g3.addUsers(['user3', 'user4'], 'member', 'root'));
                p.push(g3.removeUsers(['user3'], 'member', 'root'));
                p.push(g4.deactivate('root'));
                return Promise.all(p);
            })
                .then(function () {
                    done();
                });
        });
        it('should give active groups when isactive = true is sent', function (done) {
                var request = {
                    method: 'GET',
                    url: '/user-groups?isActive="true"',
                    headers: {
                        Authorization: rootAuthHeader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        var p = JSON.parse(response.payload);
                        expect(p.data.length).to.equal(3);
                        expect(p.data[0].isActive).to.be.true();
                        expect(p.data[1].isActive).to.be.true();
                        expect(p.data[2].isActive).to.be.true();
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });
        it.skip('should give inactive groups when isactive = false is sent', function (done) {
                var request = {
                    method: 'GET',
                    url: '/user-groups?isActive="false"',
                    headers: {
                        Authorization: rootAuthHeader
                    }
                };
                server.inject(request, function (response) {
                    try {
                        expect(response.statusCode).to.equal(200);
                        var p = JSON.parse(response.payload);
                        expect(p.data.length).to.equal(1);
                        expect(p.data[0].isActive).to.be.false();
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
        });
        it('should give only the groups whose name is sent in the parameter', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should give the groups where the user is a member when user id is sent in the parameters', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should return both inactive and active groups when nothing is sent', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    describe('GET /user-groups/{id}', function () {
        it('should only send back user-group with the id in params', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should send back not found when the user with the id in params is not found', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    describe('PUT /user-groups/{id}', function () {
        it('should send back not found error when you try to modify a non existent group', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should send back error if any of the users or owners to be added are not valid', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should activate / deactivate group and have changes audited', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should add / remove users and have changes audited', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should add / remove owners and have changes audited', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should update description and have changes audited', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    describe('POST /user-groups/{id}', function () {
        it('should send back conflict when you try to create a group with name that already exists', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should send back error if any user sent in the request does not exist', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should create a group with the sender as owner, member and the list of users also sent as members of the group', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
    });

    describe('DELETE /user-groups/{id}', function () {
        it('should send back not found error when you try to modify a non existent group', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
        });
        it('should deactivate group and have changes audited', function (done) {
            try {
                done();
            } catch (err) {
                done(err);
            }
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

