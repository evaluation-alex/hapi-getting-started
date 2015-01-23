'use strict';
var Config = require('./../../../config').config({argv: []});
var Permissions = require('./../../../server/models/permissions');
var Audit = require('./../../../server/models/audit');
var UserGroups = require('./../../../server/models/user-groups');
//var expect = require('chai').expect;
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

describe.only('Permissions Model', function () {
    var permissionsToClear = [];
    var groupsToClear = [];
    var testComplete = function (notify, err) {
        if (notify) {
            if (err) {
                notify(err);
            } else {
                notify();
            }
        }
    };

    before(function (done) {
        Permissions.connect(Config.hapiMongoModels.mongodb, function (err, db) {
            if (err || !db) {
                throw err;
            }
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
                    testComplete(done, error);
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
                    testComplete(done, error);
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
                    testComplete(done, error);
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
                    testComplete(done, error);
                });
        });
        it('should only return permissions that are currently active', function (done) {
            var error = null;
            Permissions.findByDescription('search1')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(1);
                    return found[0].deactivate();
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
                    testComplete(done, error);
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
                    testComplete(done, error);
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
                    testComplete(done, error);
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
                    testComplete(done, error);
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
                    testComplete(done, error);
                });
        });
    });

    describe('Permissions.isPermitted', function () {
        it('should return true when the user is root irrespective of object / action', function (done) {
            done();
        });
        it('should return true when user has permissions directly granted', function (done) {
            done();
        });
        it('should return true when user has permissions because of a user group membership', function (done) {
            done();
        });
        it('should return false when user has no permissions', function (done) {
            done();
        });
    });

    describe('Permissions.this.addUsers', function () {
        it('should add a new entry to users when user/group is newly added', function (done) {
            done();
        });
        it('should do nothing if the user/group is already active in the group', function (done) {
            done();
        });
        it('should mark the user/group as active again when it was deactivated and added again', function (done) {
            done();
        });
    });

    describe('Permissions.this.removeUsers', function () {
        it('should do nothing if the user/group is already inactive in the group', function (done) {
            done();
        });
        it('should do nothing if the user/group is not present in the group', function (done) {
            done();
        });
        it('should mark the user/group as inactive if it is active', function (done) {
            done();
        });
    });

    describe('Permissions.this.activate/deactivate', function () {
        var activated = null, deactivated = null;
        before(function (done) {
            permissionsToClear.push('activated');
            permissionsToClear.push('notActivated');
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
                    testComplete(done, error);
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
                    testComplete(done, error);
                });
        });
    });

    describe('Permissions.this.updateDesc', function () {
        var testPerm = null;
        before(function (done) {
            permissionsToClear.push('updateDesc1');
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
                    testComplete(done, error);
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
                    testComplete(done, error);
                });
        });
    });

    describe('Permissions.this.hasPermissions', function () {
        it('returns true when the user is present and active in the users array, action matches or is * and object matches or is *', function (done) {
            done();
        });
        it('returns false if user not present or active', function (done) {
            done();
        });
        it('returns false if action does not match', function (done) {
            done();
        });
        it('returns false if object does not match', function (done) {
            done();
        });
    });

    after(function (done) {
        Permissions.remove({description: {$in: permissionsToClear}}, function (err, result) {
            if (err) {
                throw err;
            }
            UserGroups.remove({name: {$in: groupsToClear}}, function (err, result) {
                if (err) {
                    throw err;
                }
                Audit.remove({objectChangedType: {$in: ['Permissions', 'UserGroups', 'Users']}}, function (err, result) {
                    if (err) {
                        throw err;
                    }
                    done();
                });
            });
        });
    });

});
