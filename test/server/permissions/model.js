'use strict';
var relativeToServer = './../../../server/';

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
var expect = Code.expect;

describe('Permissions Model', function () {
    var permissionsToClear = [];
    var groupsToClear = [];

    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                done();
            });
    });

    describe('Permissions.create', function () {
        it('should create a new document and audit entry when it succeeds', function (done) {
            var error = null;
            Permissions.create('newPermission', 'silver lining', ['testUser1'], [], 'someAction', 'someObject', 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Permissions);
                    return Audit.findAudit('Permissions',  p._id, {});
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
                    permissionsToClear.push('newPermission');
                    tu.testComplete(done, error);
                });
        });
        it('should not allow two objects with the same action, object set on it', function (done) {
            var error = null;
            Permissions.create('dupePermission', 'silver lining', ['testUser2'], [], 'dupeAction', 'dupeObject', 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Permissions);
                })
                .then(function () {
                    Permissions.create('dupePermission', 'silver lining', ['testUser2'], [], 'dupeAction', 'dupeObject', 'test')
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
                    permissionsToClear.push('dupePermission');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Permissions.findByDescription', function () {
        before(function (done) {
            var p1 = Permissions.create('search1', 'silver lining',  ['testUser2'], [], 'action1', 'object1', 'test5');
            var p2 = Permissions.create('search2', 'silver lining', ['testUser2'], [], 'action2', 'object2', 'test5');
            var p3 = Permissions.create('search3', 'silver lining', ['testUser2'], [], 'action3', 'object3', 'test5');
            Promise.join(p1, p2, p3)
                .then(function () {
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
                    found[0].isActive = false;
                    return found[0]._save();
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
        after(function(done) {
            permissionsToClear.push('search1');
            permissionsToClear.push('search2');
            permissionsToClear.push('search3');
            done();
        });
    });

    describe('Permissions.findAllPermissionsForUser', function () {
        before(function (done) {
            UserGroups.create('permissionsTest1', 'silver lining', 'testing permissions for users', 'permissionedUser')
                .then(function (u1) {
                    return u1.add(['testUserActive'], 'ownermember', 'test5')._save();
                })
                .then(function () {
                    return UserGroups.create('permissionsTest2', 'silver lining', 'testing permissions for users', 'permissionedUser');
                })
                .then(function (u2) {
                    return u2.add(['testUserActive'], 'ownermember', 'test5')._save();
                })
                .then(function (u2) {
                    return u2.add(['testUserInactive'], 'owner', 'test5')._save();
                })
                .then(function () {
                    return Permissions.create('findForUser1', 'silver lining', ['directlyPermissioned', 'testUserInactive'], ['permissionsTest1', 'permissionsTest2'], 'action4', 'object1', 'test5');
                })
                .then(function () {
                    return Permissions.create('findForUser2', 'silver lining', [], ['permissionsTest1', 'permissionsTest2'], 'action4', 'object2', 'test5');
                })
                .then(function () {
                    done();
                });
        });
        it('should return permissions array with permissions with user groups the user is part of', function (done) {
            var error = null;
            Permissions.findAllPermissionsForUser('permissionedUser', 'silver lining')
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
            Permissions.findAllPermissionsForUser('directlyPermissioned', 'silver lining')
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
            Permissions.findAllPermissionsForUser('testUserInactive', 'silver lining')
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
            Permissions.findAllPermissionsForUser('bogus', 'silver lining')
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
        after(function (done) {
            groupsToClear.push('permissionsTest1');
            groupsToClear.push('permissionsTest2');
            permissionsToClear.push('findForUser1');
            permissionsToClear.push('findForUser2');
            done();
        });
    });

    describe('Permissions.isPermitted', function () {
        before(function (done) {
            UserGroups.create('permittedTestGroup', 'silver lining', 'testing permissions.isPermitted', 'permittedUser')
                .then(function () {
                    return Permissions.create('isPermittedTest', 'silver lining', ['directlyPermitted'], ['permittedTestGroup'], 'action6', 'object6', 'test5');
                })
                .then(function() {
                    return Permissions.create('isPermittedTest2', 'silver lining', ['luckyfellow'], [], '*', '*', 'test5');
                })
                .then(function() {
                    done();
                })
                .catch(function(err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should return true when the action is * or is object is * irrespective of action / object passed', function (done) {
            var error = null;
            Permissions.isPermitted('luckyfellow', 'silver lining', 'action6', 'object6')
                .then(function (perms) {
                    expect(perms).to.be.true();
                    return Permissions.isPermitted('luckyfellow', 'silver lining', '*', 'object6');
                })
                .then(function (perms) {
                    expect(perms).to.be.true();
                    return Permissions.isPermitted('luckyfellow', 'silver lining', 'anything', '*');
                })
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
        it('should return true when the user is root irrespective of object / action', function (done) {
            var error = null;
            Permissions.isPermitted('root', 'silver lining', 'action6', 'object6')
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
            Permissions.isPermitted('directlyPermitted', 'silver lining', 'action6', 'object6')
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
            Permissions.isPermitted('permittedUser', 'silver lining', 'action6', 'object6')
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
            Permissions.isPermitted('unknown', 'silver lining', 'action6', 'object6')
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
        after (function(done) {
            groupsToClear.push('permittedTestGroup');
            permissionsToClear.push('isPermittedTest');
            permissionsToClear.push('isPermittedTest2');
            done();
        });
    });

    describe('Permissions.this.addUsers', function () {
        before(function (done) {
            UserGroups.create('testPermissionsAddUsers', 'silver lining', 'testing permissions.addUsers', 'test5')
                .then(function() {
                    return Permissions.create('addUsers1', 'silver lining', ['directlyPermitted'], ['testPermissionsAddUsers'], 'action7', 'object7', 'test5');
                })
                .then(function() {
                    return Permissions.create('addUsers2', 'silver lining', ['directlyPermitted'], ['testPermissionsAddUsers'], 'action8', 'object8', 'test5');
                })
                .then(function () {
                    return Permissions.create('addUsers3', 'silver lining', ['directlyPermitted'], ['testPermissionsAddUsers'], 'action9', 'object9', 'test5');
                })
                .then(function() {
                    done();
                })
                .catch(function(err) {
                    if(err) {
                        done(err);
                    }
                });
        });
        it('should add a new entry to users when user/group is newly added', function (done) {
            var error = null;
            Permissions.findByDescription('addUsers1')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].add(['newUserGroup'], 'group', 'test5')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.groups, 'newUserGroup')).to.exist();
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^add group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^add group/);
                    return Permissions.findByDescription('addUsers1');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].add(['newUser'], 'user', 'test5')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, 'newUser')).to.exist();
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^add user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^add user/);
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
                    return found[0].add(['testPermissionsAddUsers'], 'group', 'test5')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.groups, 'testPermissionsAddUsers')).to.exist();
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^add group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Permissions.findByDescription('addUsers2');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].add(['directlyPermitted'], 'user', 'test5')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, 'directlyPermitted')).to.exist();
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^add user/}});
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
        after(function (done) {
            groupsToClear.push('testPermissionsAddUsers');
            permissionsToClear.push('addUsers1');
            permissionsToClear.push('addUsers2');
            permissionsToClear.push('addUsers3');
            done();
        });
    });

    describe('Permissions.this.removeUsers', function () {
        before(function (done) {
            Permissions.create('removeUsers1', 'silver lining', ['directlyPermittedActive'], ['testPermissionsRemoveUsers'], 'action10', 'object10', 'test5')
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should do nothing if the user/group is not present in the group', function (done) {
            var error = null;
            Permissions.findByDescription('removeUsers1')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].remove(['unknownGroup'], 'group', 'test5')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.groups, 'unknownGroup')).to.not.exist();
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^remove group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Permissions.findByDescription('removeUsers1');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].remove(['unknownUser'], 'user', 'test5')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, 'unknownUser')).to.not.exist();
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^remove user/}});
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
        it('should remove user/group if present', function (done) {
            var error = null;
            Permissions.findByDescription('removeUsers1')
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].remove(['testPermissionsRemoveUsers'], 'group', 'test5')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.groups, 'testPermissionsRemoveUsers')).to.not.exist();
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^remove group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^remove group/);
                    return Permissions.findByDescription('removeUsers1');
                })
                .then(function (found) {
                    expect(found.length).to.equal(1);
                    return found[0].remove(['directlyPermittedActive'], 'user', 'test5')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.users, 'directlyPermittedActive')).to.not.exist();
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^remove user/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^remove user/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            permissionsToClear.push('removeUsers1');
            done();
        });
    });

    describe('Permissions.this.activate/deactivate', function () {
        var activated = null, deactivated = null;
        before(function (done) {
            var p1 = Permissions.create('activated', 'silver lining', ['testUser1'], [], 'someOtherAction', 'someOtherObject', 'test');
            var p2 = Permissions.create('deactivated', 'silver lining', ['testUser1'], [], 'someNewAction', 'someNewObject', 'test');
            Promise.join(p1, p2, function (p11, p12) {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate('test')._save();
                Audit.remove({objectChangedId: deactivated._id}, function (err) {
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
            activated.reactivate('test')._save()
                .then(function (a) {
                    expect(a.isActive).to.be.true();
                    return Audit.findAudit('Permissions',  a._id, {action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .then(function () {
                    return deactivated.deactivate('test')._save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.false();
                    return Audit.findAudit('Permissions',  d._id, {action: {$regex: /^isActive/}});
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
            activated.deactivate('test')._save()
                .then(function (a) {
                    expect(a.isActive).to.be.false();
                    return Audit.findAudit('Permissions',  a._id, {action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.equal('isActive');
                })
                .then(function () {
                    return deactivated.reactivate('test')._save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.true();
                    return Audit.findAudit('Permissions',  d._id, {action: {$regex: /^isActive/}});
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
        after(function (done) {
            permissionsToClear.push('activated');
            permissionsToClear.push('deactivated');
            done();
        });
    });

    describe('Permissions.this.updateDesc', function () {
        var testPerm = null;
        before(function (done) {
            Permissions.create('updateDesc1', 'silver lining', ['testUser1'], [], 'descAction', 'descObject', 'test')
                .then(function (p) {
                    testPerm = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the description', function (done) {
            var error = null;
            testPerm.updateDesc(testPerm.description, 'test6')._save()
                .then(function (p) {
                    expect(p.description).to.equal('updateDesc1');
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^change desc/}});
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
            testPerm.updateDesc('newDescription', 'test6')._save()
                .then(function (p) {
                    expect(p.description).to.equal('newDescription');
                    return Audit.findAudit('Permissions',  p._id, {action: {$regex: /^change desc/}});
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
        after(function (done) {
            permissionsToClear.push('updateDesc1');
            permissionsToClear.push('newDescription');
            done();
        });
    });

    after(function (done) {
        return tu.cleanup({userGroups: groupsToClear, permissions: permissionsToClear}, done);
    });
});
