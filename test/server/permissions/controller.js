'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Users = require(relativeToServer + 'users/model');
var Permissions = require(relativeToServer + 'permissions/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Audit = require(relativeToServer + 'audit/model');
var _ = require('lodash');
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
        before(function (done) {
            Permissions.create('test GET /permissions is active', ['user1'], ['group1'], 'action1', 'object1')
                .then(function (p) {
                    return Permissions.create('test GET /permissions is active = false', ['user2'], ['group2'], 'action2', 'object1');
                })
                .then(function (p) {
                    p.isActive = false;
                    p._save();
                    done();
                });
        });
        it('should give permissions when isactive = true is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions?isActive="true"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(d.isActive).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give inactive permissions when isactive = false is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions?isActive="false"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(d.isActive).to.be.false();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give the permissions where the user sent is a member of the users list', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions?user=user1',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    var patt = /user1/i;
                    _.forEach(p.data, function (d) {
                        var match = false;
                        _.find(d.users, function (u) {
                            match = match || patt.test(u);
                        });
                        expect(match).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give the permissions where the group sent is a member of the groups list', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions?group=group2',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    var patt = /group2/i;
                    _.forEach(p.data, function (d) {
                        var match = false;
                        _.find(d.groups, function (u) {
                            match = match || patt.test(u);
                        });
                        expect(match).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give the permissions where the object is sent in the parameters', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions?object=object',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(d.object).to.match(/object/i);
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give the permissions where the action is sent in the parameters', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions?action=action1',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(d.action).to.match(/action/i);
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should return both inactive and active permissions when nothing is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        after (function (done) {
            permissionsToClear.push('test GET /permissions is active');
            permissionsToClear.push('test GET /permissions is active = false');
            done();
        });
    });

    describe('GET /permissions/{id}', function () {
        var id = '';
        before(function (done) {
            Permissions.create('test GET /permissions/id', ['user1'], ['group1'], 'action1', 'object2')
                .then(function (p) {
                    id = p._id.toString();
                    done();
                });
        });
        it('should only send back permissions with the id in params', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.match(/permissions/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back not found when the permissions with the id in params is not found', function (done) {
            var request = {
                method: 'GET',
                url: '/permissions/' + id.replace('a', '0').replace('b', '0').replace('c', '0').replace('d', '0').replace('e', '0').replace('f', '0'),
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
        after(function (done) {
            permissionsToClear.push('test GET /permissions/id');
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
        it('should send back error if any of the groups to be added are not valid', function (done) {
            done();
        });
        it('should activate permissions and have changes audited', function (done) {
            done();
        });
        it('should deactivate permissions and have changes audited', function (done) {
            done();
        });
        it('should add users / groups and have changes audited', function (done) {
            done();
        });
        it('should remove users / groups and have changes audited', function (done) {
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
        it('should send back error if any user sent in the request does not exist', function (done) {
            done();
        });
        it('should send back error if any group sent in the request does not exist', function (done) {
            done();
        });
        it('should create permissions successfully', function (done) {
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

