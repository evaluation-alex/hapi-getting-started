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
        beforeEach(function (done) {
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
        it('should give inactive groups when isactive = false is sent', function (done) {
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
            var request = {
                method: 'GET',
                url: '/user-groups?groupName=GetUserGroupsTestName',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].name).to.match(/GetUserGroupsTestName/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give the groups where the user is a member when user id is sent in the parameters', function (done) {
            var request = {
                method: 'GET',
                url: '/user-groups?email=user2',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].name).to.match(/GetUserGroupsTestMemberActive/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should return both inactive and active groups when nothing is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/user-groups',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(4);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
    });

    describe('GET /user-groups/{id}', function () {
        var id = '';
        beforeEach(function (done) {
            groupsToClear.push('testGetByID');
            UserGroups.create('testGetByID', 'GET /user-groups/id', 'root')
                .then(function (ug) {
                    id = ug._id.toString();
                    done();
                });
        });
        it('should only send back user-group with the id in params', function (done) {
            var request = {
                method: 'GET',
                url: '/user-groups/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    expect(p.name).to.equal('testGetByID');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back not found when the user-group with the id in params is not found', function (done) {
            var request = {
                method: 'GET',
                url: '/user-groups/' + id.replace('a', 'b'),
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
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
            groupsToClear.push('testDupeGroup');
            UserGroups.create('testDupeGroup', 'test POST /user-groups', 'root')
                .then(function (ug) {
                    var request = {
                        method: 'POST',
                        url: '/user-groups',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            name: 'testDupeGroup',
                            addedMembers: ['one@first.com'],
                            addedOwners: ['one@first.com'],
                            description: 'test POST /user-groups'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(409);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
        it('should send back error if any user sent in the request does not exist', function (done) {
            groupsToClear.push('testGroupUserExist');
            var request = {
                method: 'POST',
                url: '/user-groups',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    name: 'testGroupUserExist',
                    addedMembers: ['unknown'],
                    addedOwners: ['madeup'],
                    description: 'test POST /user-groups'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(422);
                    UserGroups.findByName('testGroupUserExist')
                        .then(function (ug) {
                            expect(ug).to.be.false();
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should create a group with the sender as owner, member and the list of users also sent as members of the group', function (done) {
            groupsToClear.push('testUserGroupCreate');
            var request = {
                method: 'POST',
                url: '/user-groups',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    name: 'testUserGroupCreate',
                    addedMembers: ['one@first.com'],
                    addedOwners: ['one@first.com'],
                    description: 'test POST /user-groups'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    UserGroups.findByName('testUserGroupCreate')
                        .then(function (ug) {
                            expect(ug).to.exist();
                            expect(ug.isOwner('one@first.com')).to.be.true();
                            expect(ug.isMember('one@first.com')).to.be.true();
                            expect(ug.description).to.match(/test POST/);
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });
    });

    describe('DELETE /user-groups/{id}', function () {
        it('should send back not found error when you try to modify a non existent group', function (done) {
            groupsToClear.push('testUserGroupDeleteNotFound');
            var request = {
                method: 'DELETE',
                url: '/user-groups/54c894fe1d1d4ab4032ed94e',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', function (done) {
            groupsToClear.push('testDelGroupNotOwner');
            var request = {};
            var authHeader = '';
            var id = '';
            UserGroups.create('testDelGroupNotOwner', 'test POST /user-groups', 'test')
                .then(function (ug) {
                    id = ug._id.toString();
                    return Users.findByEmail('one@first.com');
                })
                .then(function (u) {
                    return u.updateRoles(['root'], 'test');
                })
                .then(function (u) {
                    return u.loginSuccess('test', 'test');
                })
                .then(function (u) {
                    authHeader = authorizationHeader(u.email, u.session.key);
                    request = {
                        method: 'DELETE',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: authHeader
                        }
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
        });
        it('should deactivate group and have changes audited', function (done) {
            groupsToClear.push('testDelGroup');
            UserGroups.create('testDelGroup', 'test POST /user-groups', 'root')
                .then(function (ug) {
                    var id = ug._id.toString();
                    var request = {
                        method: 'DELETE',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            UserGroups.findByName('testDelGroup')
                                .then(function (found) {
                                    expect(found).to.be.false();
                                });
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
    });

    afterEach(function (done) {
        if (groupsToClear.length > 0) {
            UserGroups.remove({name: {$in: groupsToClear}}, function (err) {
                if (err) {
                    throw err;
                }
                Audit.remove({}, function (err) {
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

