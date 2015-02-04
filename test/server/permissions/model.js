'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Permissions = require(relativeToServer + 'permissions/model');
var Audit = require(relativeToServer + 'audit/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var _ = require('lodash');
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Promise = require('bluebird');
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

describe('Permissions Model', function () {
    var permissionsToClear = [];
    var groupsToClear = [];

    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function() {
                done();
            });
    });

    describe('Permissions.create', function () {
        it('should create a new document and audit entry when it succeeds', function (done) {
            permissionsToClear.push('newPermission');
            var error = null;
            Permissions.create('newPermission', [{
                user: 'testUser1',
                type: 'user',
                isActive: true
            }], 'someAction', 'someObject', 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Permissions);
                    return Audit.findPermissionsAudit({_id: p._id});
                })
                .then(function (paudit) {
                    expect(paudit).to.exist();
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0]).to.be.instanceof(Audit);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should not allow two objects with the same action, object set on it', function (done) {
            var error = null;
            permissionsToClear.push('dupePermission');
            Permissions.create('dupePermission', [{
                user: 'testUser2 ',
                type: 'user',
                isActive: true
            }], 'dupeAction', 'dupeObject', 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Permissions);
                })
                .then(function () {
                    Permissions.create('dupePermission', [{
                        user: 'testUser1',
                        type: 'user',
                        isActive: true
                    }], 'dupeAction', 'dupeObject', 'test')
                        .then(function (p) {
                            expect(p).to.not.exist();
                        })
                        .catch(function (err) {
                            expect(err).to.exist();
                        });
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Permissions.findByDescription', function () {
        before(function (done) {
            var userToInclude = [{
                user: 'testUser2 ',
                type: 'user',
                isActive: true
            }];
            permissionsToClear.push('search1');
            permissionsToClear.push('search2');
            permissionsToClear.push('search3');
            var p1 = Permissions.create('search1', userToInclude, 'action1', 'object1', 'test5');
            var p2 = Permissions.create('search2', userToInclude, 'action2', 'object2', 'test5');
            var p3 = Permissions.create('search3', userToInclude, 'action3', 'object3', 'test5');
            Promise.join(p1, p2, p3)
                .then(function (p11, p12, p13) {
                    done();
                });
        });
        it('should return a permissions array with permissions that matches the description', function (done) {
            var error = null;
            Permissions.findByDescription('search')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(3);
                    expect(found[0].description).to.match(/search/);
                    expect(found[1].description).to.match(/search/);
                    expect(found[2].description).to.match(/search/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return an empty array when nothing matches', function (done) {
            var error = null;
            Permissions.findByDescription('wontfind')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should only return permissions that are currently active', function (done) {
            var error = null;
            Permissions.findByDescription('search1')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(1);
                    return found[0].deactivate('test');
                })
                .then(function () {
                    return Permissions.findByDescription('search');
                })
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(2);
                    expect(found[0].description).to.match(/search/);
                    expect(found[1].description).to.match(/search/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Permissions.findAllPermissionsForUser', function () {
        before(function (done) {
            groupsToClear.push('permissionsTest1');
            groupsToClear.push('permissionsTest2');
            var u1 = UserGroups.create('permissionsTest1', 'testing permissions for users', 'permissionedUser');
            var u2 = UserGroups.create('permissionsTest2', 'testing permissions for users', 'permissionedUser');
            permissionsToClear.push('findForUser1');
            permissionsToClear.push('findForUser2');
            var userToInclude = [{
                user: 'permissionsTest1',
                type: 'group',
                isActive: true
            }, {
                user: 'permissionsTest2',
                type: 'group',
                isActive: true
            }];
            var p1 = Permissions.create('findForUser1', userToInclude, 'action4', 'object1', 'test5');
            var p2 = Permissions.create('findForUser2', userToInclude, 'action5', 'object2', 'test5');
            Promise.join(u1, u2, p1, p2, function (u11, u21, p11, p21) {
                var p111 = p11.addUsers(['directlyPermissioned'], 'user', 'test5');
                var p112 = p11.addUsers(['testUserInactive'], 'user', 'test5');
                var u111 = u11.addUsers(['testUserActive', 'testUserInactive'], 'both', 'test5');
                var u211 = u21.addUsers(['testUserActive', 'testUserInactive'], 'both', 'test5');
                var u112 = u11.removeUsers(['testUserInactive'], 'member', 'test5');
                var u212 = u21.removeUsers(['testUserInactive'], 'member', 'test5');
                return Promise.join(p111, p112, u111, u211, u112, u212);
            })
                .then(function () {
                    done();
                });
        });
        it('should return permissions array with permissions with user groups the user is part of', function (done) {
            var error = null;
            Permissions.findAllPermissionsForUser('permissionedUser')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(2);
                    expect(found[0].description).to.match(/findForUser/);
                    expect(found[1].description).to.match(/findForUser/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return permissions array with permissions that directly have the user', function (done) {
            var error = null;
            Permissions.findAllPermissionsForUser('directlyPermissioned')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(1);
                    expect(found[0].description).to.match(/findForUser1/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return permissions only where the user is active in the group permissioned', function (done) {
            var error = null;
            Permissions.findAllPermissionsForUser('testUserInactive')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(1);
                    expect(found[0].description).to.match(/findForUser1/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return an empty array when user has no permissions', function (done) {
            var error = null;
            Permissions.findAllPermissionsForUser('bogus')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Permissions.isPermitted', function () {
        before(function (done) {
            groupsToClear.push('permittedTestGroup');
            permissionsToClear.push('isPermittedTest');
            var u1 = UserGroups.create('permittedTestGroup', 'testing permissions.isPermitted', 'permittedUser');
            var userToInclude = [{
                user: 'permittedTestGroup',
                type: 'group',
                isActive: true
            }, {
                user: 'directlyPermitted',
                type: 'user',
                isActive: true
            }];
            var p1 = Permissions.create('isPermittedTest', userToInclude, 'action6', 'object6', 'test5');
            Promise.join(u1, p1, function (u11, p11) {
                done();
            });
        });
        it('should return true when the user is root irrespective of object / action', function (done) {
            var error = null;
            Permissions.isPermitted('root', 'action6', 'object6')
                .then(function (perms) {
                    expect(perms).to.be.true();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return true when user has permissions directly granted', function (done) {
            var error = null;
            Permissions.isPermitted('directlyPermitted', 'action6', 'object6')
                .then(function (perms) {
                    expect(perms).to.be.true();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return true when user has permissions because of a user group membership', function (done) {
            var error = null;
            Permissions.isPermitted('permittedUser', 'action6', 'object6')
                .then(function (perms) {
                    expect(perms).to.be.true();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return false when user has no permissions', function (done) {
            var error = null;
            Permissions.isPermitted('unknown', 'action6', 'object6')
                .then(function (perms) {
                    expect(perms).to.be.false();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Permissions.this.addUsers', function () {
        before(function (done) {
            groupsToClear.push('testPermissionsAddUsers');
            permissionsToClear.push('addUsers1');
            permissionsToClear.push('addUsers2');
            permissionsToClear.push('addUsers3');
            var u1 = UserGroups.create('testPermissionsAddUsers', 'testing permissions.addUsers', 'test5');
            var userToInclude = [{
                user: 'testPermissionsAddUsers',
                type: 'group',
                isActive: true
            }, {
                user: 'directlyPermitted',
                type: 'user',
                isActive: true
            }];
            var p1 = Permissions.create('addUsers1', userToInclude, 'action7', 'object7', 'test5');
            var p2 = Permissions.create('addUsers2', userToInclude, 'action8', 'object8', 'test5');
            var p3 = Permissions.create('addUsers3', userToInclude, 'action9', 'object9', 'test5');
            Promise.join(u1, p1, p2, p3, function (u11, p11, p21, p31) {
                done();
            });
        });
        it('should add a new entry to users when user/group is newly added', function (done) {
            var error = null;
            Permissions.findByDescription('addUsers1')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].addUsers(['newUserGroup'], 'group', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'newUserGroup', isActive: true})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^add user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^add user/);
                    return Permissions.findByDescription('addUsers1');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].addUsers(['newUser'], 'user', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'newUser', isActive: true})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^add user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(2);
                    expect(paudit[0].action).to.match(/^add user/);
                    expect(paudit[1].action).to.match(/^add user/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user/group is already active in the group', function (done) {
            var error = null;
            Permissions.findByDescription('addUsers2')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].addUsers(['testPermissionsAddUsers'], 'group', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'testPermissionsAddUsers', isActive: true})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^add user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Permissions.findByDescription('addUsers2');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].addUsers(['directlyPermitted'], 'user', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'directlyPermitted', isActive: true})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^add user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should mark the user/group as active again when it was deactivated and added again', function (done) {
            var error = null;
            Permissions.findByDescription('addUsers3')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    found[0].users.forEach(function (u) {
                        u.isActive = false;
                    });
                    return Permissions._findByIdAndUpdate(found[0]._id, found[0]);
                })
                .then(function (p) {
                    return p.addUsers(['testPermissionsAddUsers'], 'group', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'testPermissionsAddUsers', isActive: true})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^add user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^add user users/);
                    return Permissions.findByDescription('addUsers3');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].addUsers(['directlyPermitted'], 'user', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'directlyPermitted', isActive: true})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^add user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(2);
                    expect(paudit[0].action).to.match(/^add user users/);
                    expect(paudit[1].action).to.match(/^add user users/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Permissions.this.removeUsers', function () {
        before(function (done) {
            permissionsToClear.push('removeUsers1');
            var userToInclude = [{
                user: 'testPermissionsRemoveUsers',
                type: 'group',
                isActive: true
            }, {
                user: 'directlyPermittedActive',
                type: 'user',
                isActive: true
            },{
                user: 'testPermissionsRemoveUsers2',
                type: 'group',
                isActive: false
            }, {
                user: 'directlyPermittedInactive',
                type: 'user',
                isActive: false
            }];
            var p1 = Permissions.create('removeUsers1', userToInclude, 'action10', 'object10', 'test5');
            Promise.join(p1, function (p11) {
                done();
            });
        });
        it('should do nothing if the user/group is already inactive in the group', function (done) {
            var error = null;
            Permissions.findByDescription('removeUsers1')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].removeUsers(['testPermissionsRemoveUsers2'], 'group', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'testPermissionsRemoveUsers2', isActive: false})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^remove user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Permissions.findByDescription('removeUsers1');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].removeUsers(['directlyPermittedInactive'], 'user', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'directlyPermittedInactive', isActive: false})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^remove user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user/group is not present in the group', function (done) {
            var error = null;
            Permissions.findByDescription('removeUsers1')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].removeUsers(['unknownGroup'], 'group', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'unknownGroup'})).to.not.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^remove user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Permissions.findByDescription('removeUsers1');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].removeUsers(['unknownUser'], 'user', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'unknownUser'})).to.not.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^remove user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should mark the user/group as inactive if it is active', function (done) {
            var error = null;
            Permissions.findByDescription('removeUsers1')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].removeUsers(['testPermissionsRemoveUsers'], 'group', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'testPermissionsRemoveUsers', isActive: false})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^remove user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^remove user users/);
                    return Permissions.findByDescription('removeUsers1');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].removeUsers(['directlyPermittedActive'], 'user', 'test5');
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, {user: 'directlyPermittedActive', isActive: false})).to.exist();
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^remove user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(2);
                    expect(paudit[0].action).to.match(/^remove user users/);
                    expect(paudit[1].action).to.match(/^remove user users/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Permissions.this.activate/deactivate', function () {
        var activated = null, deactivated = null;
        before(function (done) {
            permissionsToClear.push('activated');
            permissionsToClear.push('deactivated');
            var p1 = Permissions.create('activated', [{
                user: 'testUser1',
                type: 'user',
                isActive: true
            }], 'someOtherAction', 'someOtherObject', 'test');
            var p2 = Permissions.create('deactivated', [{
                user: 'testUser1',
                type: 'user',
                isActive: true
            }], 'someNewAction', 'someNewObject', 'test');
            Promise.join(p1, p2, function (p11, p12) {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate();
                Audit.remove({objectChangedId: deactivated._id}, function (err, res) {
                    if (err) {
                    }
                });
            })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if the permission is already inactive/active and you deactivate/activate', function (done) {
            var error = null;
            activated.reactivate('test')
                .then(function (a) {
                    expect(a.isActive).to.be.true();
                    return Audit.findPermissionsAudit({_id: a._id, action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .then(function () {
                    return deactivated.deactivate('test');
                })
                .then(function (d) {
                    expect(d.isActive).to.be.false();
                    return Audit.findPermissionsAudit({_id: d._id, action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should mark the group as inactive / active when you deactivate / activate', function (done) {
            var error = null;
            activated.deactivate('test')
                .then(function (a) {
                    expect(a.isActive).to.be.false();
                    return Audit.findPermissionsAudit({_id: a._id, action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.equal('isActive');
                })
                .then(function () {
                    return deactivated.reactivate('test');
                })
                .then(function (d) {
                    expect(d.isActive).to.be.true();
                    return Audit.findPermissionsAudit({_id: d._id, action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.equal('isActive');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Permissions.this.updateDesc', function () {
        var testPerm = null;
        before(function (done) {
            permissionsToClear.push('updateDesc1');
            permissionsToClear.push('newDescription');
            Permissions.create('updateDesc1', [{
                user: 'testUser1',
                type: 'user',
                isActive: true
            }], 'descAction', 'descObject', 'test')
                .then(function (p) {
                    testPerm = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the description', function (done) {
            var error = null;
            testPerm.updateDesc(testPerm.description, 'test6')
                .then(function (p) {
                    expect(p.description).to.equal('updateDesc1');
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^change desc/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new description', function (done) {
            var error = null;
            testPerm.updateDesc('newDescription', 'test6')
                .then(function (p) {
                    expect(p.description).to.equal('newDescription');
                    return Audit.findPermissionsAudit({_id: p._id, action: {$regex: /^change desc/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].newValues).to.equal('newDescription');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    after(function (done) {
        tu.cleanup(null, groupsToClear, permissionsToClear, done);
    });
});
