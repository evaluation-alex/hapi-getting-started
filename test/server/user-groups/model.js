'use strict';
var relativeToServer = './../../../server/';

var UserGroups = require(relativeToServer + 'user-groups/model');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Audit = require(relativeToServer + 'audit/model');
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

describe('UserGroups Model', function () {
    var groupsToCleanup = [];
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function() {
                done();
            });
    });

    describe('UserGroups.create', function () {
        it('should create a new document when it succeeds, the creator should be owner and member and have appropriate audit entries', function (done) {
            var error = null;
            UserGroups.create('test.group@test.api', 'silver lining', 'creating groups', 'test')
                .then(function (userGroup) {
                    expect(userGroup).to.exist();
                    expect(userGroup).to.be.an.instanceof(UserGroups);
                    expect(userGroup.name).to.contain('test.group@test.api');
                    expect(userGroup._isMemberOf('members', 'test')).to.be.true();
                    expect(userGroup._isMemberOf('owners', 'test')).to.be.true();
                })
                .then(function () {
                    return Audit.findAudit('user-groups', 'test.group@test.api', {'change.action': 'create'});
                })
                .then(function (ugAudit) {
                    expect(ugAudit.length).to.equal(1);
                    expect(ugAudit[0].objectChangedId).to.equal('test.group@test.api');
                })
                .catch(function (err) {
                    error = err;
                    expect(err).to.not.exist();
                })
                .done(function () {
                    groupsToCleanup.push('test.group@test.api');
                    tu.testComplete(done, null);
                });
        });
        it('should not allow two groups with the name', function (done) {
            var error = null;
            UserGroups.create('test.dupe@test.api', 'silver lining', 'testing dupes', 'test')
                .then(function () {
                    return UserGroups.create('test.dupe@test.api', 'silver lining', 'testing dupes', 'test')
                        .then(function (dupeGroup) {
                            expect(dupeGroup).to.not.exist();
                        })
                        .catch(function (err) {
                            expect(err).to.exist();
                            expect(err).to.be.an.instanceof(Error);
                        });
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('test.dupe@test.api');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('UserGroups.isValid', function () {
        it ('should return with a not found message when group does not exist', function (done) {
            var error = null;
            UserGroups.isValid(BaseModel.ObjectID(null), 'unknown', ['owners'])
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.equal('not found');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it ('should return with not an owner when the owner argument is not an owner (active or otherwise)', function (done) {
            var error = null;
            UserGroups.create('isValidTest', 'silver lining', 'isValidTest', 'test5')
                .then(function(ug) {
                    return UserGroups.isValid(ug._id, 'unknown', ['owners']);
                })
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.match(/not permitted/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('isValidTest');
                    tu.testComplete(done, error);
                });
        });
        it ('should return valid when the group exists and the owner is an active owner', function (done) {
            var error = null;
            UserGroups.create('isValidTest2', 'silver lining', 'isValidTest2', 'test5')
                .then(function(ug) {
                    return UserGroups.isValid(ug._id, 'test5', ['owners']);
                })
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.equal('valid');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('isValidTest2');
                    tu.testComplete(done, error);
                });
        });
        it ('should return valid when the group exists and we pass root as owner', function (done) {
            var error = null;
            UserGroups.create('isValidTest3', 'silver lining', 'isValidTest3', 'test5')
                .then(function(ug) {
                    return UserGroups.isValid(ug._id, 'root', ['owners']);
                })
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.equal('valid');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('isValidTest3');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Users.areValid', function () {
        it('should return empty array when nothing is sent', function (done) {
            var error = null;
            UserGroups.areValid([], 'silver lining')
                .then(function (result) {
                    expect(result).to.be.empty();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return an object with as many entries as names sent, appropriately populated', function(done) {
            var error = null;
            UserGroups.create('test UserGroups.areValid', 'silver lining', 'test', 'test')
                .then(function () {
                    return UserGroups.areValid(['test UserGroups.areValid', 'bogus'], 'silver lining');
                })
                .then(function (result) {
                    expect(result).to.exist();
                    expect(result['test UserGroups.areValid']).to.be.true();
                    expect(result.bogus).to.be.false();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    groupsToCleanup.push('test UserGroups.areValid');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('UserGroups.this.addUsers', function () {
        it('should do nothing if the user is already present as a member and you add user as a member', function (done) {
            var error = null;
            UserGroups.create('addUsersTest1', 'silver lining', 'UserGroups.this.addMemberAlreadyPresent', 'test3')
                .then(function (ug) {
                    ug.members.push('alreadyMember');
                    return ug.save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'alreadyMember')).to.be.true();
                    return ug.add(['alreadyMember'], 'members', 'test3').save();
                })
                .then(function (ug) {
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^add member/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('addUsersTest1');
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user is already present as a owner and you add user as a owner', function (done) {
            var error = null;
            UserGroups.create('addUsersTest2', 'silver lining', 'UserGroups.this.addOwnerAlreadyPresent', 'test3')
                .then(function (ug) {
                    ug.owners.push('alreadyOwner');
                    return ug.save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('owners', 'alreadyOwner')).to.be.true();
                    return ug.add(['alreadyOwner'], 'owners', 'test3').save();
                })
                .then(function (ug) {
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^add owner/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('addUsersTest2');
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user is already present as owner AND member and you add as owner AND member', function (done) {
            var error = null;
            UserGroups.create('addUsersTest3', 'silver lining', 'UserGroups.this.addOwnerAndMemberAlreadyPresent', 'test3')
                .then(function (ug) {
                    return ug.add(['test3'], 'owners', 'test4').add(['test3'], 'members', 'test4').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('owners', 'test3')).to.be.true();
                    expect(ug._isMemberOf('members', 'test3')).to.be.true();
                    return ug;
                })
                .then(function (ug) {
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^add/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('addUsersTest3');
                    tu.testComplete(done, error);
                });
        });
        it('should add the user as a owner who was not already present and added with the owner role', function (done) {
            var error = null;
            UserGroups.create('addUsersTest4', 'silver lining', 'UserGroups.this.addOwnerNotPresent', 'test3')
                .then(function (ug) {
                    return ug.add(['newOwner'], 'owners', 'test3').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('owners', 'newOwner')).to.be.true();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^add owner/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].newValues).to.equal('newOwner');
                    expect(ugaudit[0].change[0].action).to.match(/add owner/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('addUsersTest4');
                    tu.testComplete(done, error);
                });
        });
        it('should add the user as a member who was not already present and added with the member role', function (done) {
            var error = null;
            UserGroups.create('addUsersTest5', 'silver lining', 'UserGroups.this.addMemberNotPresent', 'test3')
                .then(function (ug) {
                    return ug.add(['newMember'], 'members', 'test3').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'newMember')).to.be.true();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^add member/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].newValues).to.equal('newMember');
                    expect(ugaudit[0].change[0].action).to.match(/add member/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('addUsersTest5');
                    tu.testComplete(done, error);
                });
        });
        it('should add the user as a member and owner who was not already present and added with the member and owner / both role', function (done) {
            var error = null;
            UserGroups.create('addUsersTest6.0', 'silver lining', 'UserGroups.this.addMemberOwnerNotPresent', 'test3')
                .then(function (ug) {
                    return ug.add(['newMemberOwner'], 'owners', 'test3').add(['newMemberOwner'], 'members', 'test3').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'newMemberOwner')).to.be.true();
                    expect(ug._isMemberOf('owners', 'newMemberOwner')).to.be.true();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^add/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].newValues).to.equal('newMemberOwner');
                    expect(ugaudit[0].change[1].newValues).to.equal('newMemberOwner');
                })
                .then(function () {
                    return UserGroups.create('addUsersTest6.1', 'silver lining', 'UserGroups.this.addBothNotPresent', 'test3');
                })
                .then(function (ug) {
                    return ug.add(['newBoth'], 'owners', 'test3').add(['newBoth'], 'members', 'test3').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'newBoth')).to.be.true();
                    expect(ug._isMemberOf('owners', 'newBoth')).to.be.true();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^add/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].newValues).to.equal('newBoth');
                    expect(ugaudit[0].change[0].newValues).to.equal('newBoth');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('addUsersTest6.0');
                    groupsToCleanup.push('addUsersTest6.1');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('UserGroups.this.removeUsers', function () {
        it('should do nothing if the user is not already present as a member and you remove user as a member', function (done) {
            var error = null;
            UserGroups.create('removeUsersTest1', 'silver lining', 'UserGroups.this.removeMemberNotPresent', 'test4')
                .then(function (ug) {
                    ug.owners.push('notMemberButOwner');
                    return ug.save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'notMemberButOwner')).to.be.false();
                    expect(ug._isMemberOf('owners', 'notMemberButOwner')).to.be.true();
                    return ug.remove(['notMemberButOwner'], 'members', 'test4').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'notMemberButOwner')).to.be.false();
                    expect(ug._isMemberOf('owners', 'notMemberButOwner')).to.be.true();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('removeUsersTest1');
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user is not already present as a owner and you remove user as a owner', function (done) {
            var error = null;
            UserGroups.create('removeUsersTest2', 'silver lining', 'UserGroups.this.removeOwnerNotPresent', 'test4')
                .then(function (ug) {
                    ug.members.push('notOwnerButMember');
                    return ug.save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'notOwnerButMember')).to.be.true();
                    expect(ug._isMemberOf('owners', 'notOwnerButMember')).to.be.false();
                    return ug.remove(['notOwnerButMember'], 'owners', 'test4').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'notOwnerButMember')).to.be.true();
                    expect(ug._isMemberOf('owners', 'notOwnerButMember')).to.be.false();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('removeUsersTest2');
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user is not present as owner OR member and you remove as owner AND member', function (done) {
            var error = null;
            UserGroups.create('removeUsersTest3', 'UserGroups.this.removeBothNotPresent', 'test4')
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'neither')).to.be.false();
                    expect(ug._isMemberOf('owners', 'neither')).to.be.false();
                    return ug.remove(['neither'], 'owners', 'test4').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'neither')).to.be.false();
                    expect(ug._isMemberOf('owners', 'neither')).to.be.false();
                    return ug.remove(['neither'], 'members', 'test4').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'neither')).to.be.false();
                    expect(ug._isMemberOf('owners', 'neither')).to.be.false();
                    return ug.remove(['neither'], 'ownermember', 'test4').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'neither')).to.be.false();
                    expect(ug._isMemberOf('owners', 'neither')).to.be.false();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('removeUsersTest3');
                    tu.testComplete(done, error);
                });
        });
        it('should remove the users owner role if already present the owner role', function (done) {
            var error = null;
            UserGroups.create('removeUsersTest4.0', 'silver lining', 'UserGroups.this.removeOwner', 'test4')
                .then(function (ug) {
                    ug.owners.push('owners');
                    return ug.save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'owners')).to.be.false();
                    expect(ug._isMemberOf('owners', 'owners')).to.be.true();
                    return ug.remove(['owners'], 'owners', 'test4').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'owners')).to.be.false();
                    expect(ug._isMemberOf('owners', 'owners')).to.be.false();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^remove owner/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.match(/^remove owner/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('removeUsersTest4.0');
                    groupsToCleanup.push('removeUsersTest4.1');
                    tu.testComplete(done, error);
                });
        });
        it('should deactivate the user as a member if already present with the member role', function (done) {
            var error = null;
            UserGroups.create('removeUsersTest5.0', 'silver lining', 'UserGroups.this.removeMember', 'test4')
                .then(function (ug) {
                    ug.members.push('members');
                    return ug.save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'members')).to.be.true();
                    expect(ug._isMemberOf('owners', 'members')).to.be.false();
                    return ug.remove(['members'], 'members', 'test4').save();
                })
                .then(function (ug) {
                    expect(ug._isMemberOf('members', 'members')).to.be.false();
                    expect(ug._isMemberOf('owners', 'members')).to.be.false();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^remove member/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.match(/^remove member/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('removeUsersTest5.0');
                    groupsToCleanup.push('removeUsersTest5.1');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('UserGroups.this.activate/deactivate', function () {
        it('should do nothing if the user group is already inactive/active and you deactivate/activate', function (done) {
            var error = null;
            UserGroups.create('activateGroupDoNothing', 'silver lining', 'UserGroups.this.activate', 'test5')
                .then(function (ug) {
                    return ug.reactivate('test5').save();
                })
                .then(function (ug) {
                    expect(ug.isActive).to.be.true();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .then(function () {
                    return UserGroups.create('deactivateGroupDoNothing', 'silver lining', 'UserGroups.this.deactivate', 'test5');
                })
                .then(function (ug) {
                    ug.isActive = false;
                    return ug.save();
                })
                .then(function (ug) {
                    return ug.deactivate('test5').save();
                })
                .then(function (ug) {
                    expect(ug.isActive).to.be.false();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('activateGroupDoNothing');
                    groupsToCleanup.push('deactivateGroupDoNothing');
                    tu.testComplete(done, error);
                });
        });
        it('should mark the group as inactive / active when you deactivate / activate', function (done) {
            var error = null;
            UserGroups.create('deactivateGroup', 'silver lining', 'UserGroups.this.deactivate', 'test5')
                .then(function (ug) {
                    return ug.deactivate('test5').save();
                })
                .then(function (ug) {
                    expect(ug.isActive).to.be.false();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.equal('isActive');
                })
                .then(function () {
                    return UserGroups.create('activateGroup', 'silver lining', 'UserGroups.this.reactivate', 'test5');
                })
                .then(function (ug) {
                    ug.isActive = false;
                    return ug.save();
                })
                .then(function (ug) {
                    return ug.reactivate('test5').save();
                })
                .then(function (ug) {
                    expect(ug.isActive).to.be.true();
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.equal('isActive');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('activateGroup');
                    groupsToCleanup.push('deactivateGroup');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('UserGroups.this.setDescription', function () {
        it('should do nothing if there is no change in the description', function (done) {
            var error = null;
            UserGroups.create('updateDesc1', 'silver lining', 'UserGroups.this.updateDesc', 'test6')
                .then(function (ug) {
                    return ug.setDescription(ug.description, 'test6').save();
                })
                .then(function (ug) {
                    expect(ug.description).to.equal('UserGroups.this.updateDesc');
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^description/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('updateDesc1');
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new description', function (done) {
            var error = null;
            UserGroups.create('updateDesc2', 'silver lining', 'UserGroups.this.updateDesc', 'test6')
                .then(function (ug) {
                    return ug.setDescription(ug.description + 'new', 'test6').save();
                })
                .then(function (ug) {
                    expect(ug.description).to.equal('UserGroups.this.updateDescnew');
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^description/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.equal('description');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('updateDesc2');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('UserGroups.this.setAccess', function () {
        it('should do nothing if there is no change in the access', function (done) {
            var error = null;
            UserGroups.create('updateAccess1', 'silver lining', 'UserGroups.this.setAccess', 'test6')
                .then(function (ug) {
                    return ug.setAccess('restricted', 'test6').save();
                })
                .then(function (ug) {
                    expect(ug.access).to.equal('restricted');
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^access/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('updateAccess1');
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new access control', function (done) {
            var error = null;
            UserGroups.create('updateAccess2', 'silver lining', 'UserGroups.this.setAccess', 'test6')
                .then(function (ug) {
                    return ug.setAccess('public', 'test6').save();
                })
                .then(function (ug) {
                    expect(ug.access).to.equal('public');
                    return Audit.findAudit('user-groups', ug.name, {'change.action': {$regex: /^access/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.equal('access');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    groupsToCleanup.push('updateAccess2');
                    tu.testComplete(done, error);
                });
        });
    });

    after(function (done) {
        return tu.cleanup({userGroups: groupsToCleanup}, done);
    });

});
