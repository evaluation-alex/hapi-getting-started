'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let UserGroups = require('./../../../build/user-groups/model');
let Audit = require('./../../../build/audit/model');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('UserGroups DAO', () => {
    let groupsToCleanup = [];
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    describe('UserGroups.create', () => {
        it('should create a new document when it succeeds, the creator should be owner and member and have appropriate audit entries', (done) => {
            let error = null;
            UserGroups.create('test.group@test.api', 'silver lining', 'creating groups', 'test')
                .then((userGroup) => {
                    expect(userGroup).to.exist;
                    expect(userGroup).to.be.an.instanceof(UserGroups);
                    expect(userGroup.name).to.contain('test.group@test.api');
                    expect(userGroup.isPresentInMembers('test')).to.be.true;
                    expect(userGroup.isPresentInOwners('test')).to.be.true;
                    return Audit.findAudit('user-groups', userGroup._id, {'change.action': 'create'});
                })
                .then((ugAudit) => {
                    expect(ugAudit.length).to.equal(1);
                })
                .catch((err) => {
                    error = err;
                    expect(err).to.not.exist;
                })
                .done(() => {
                    groupsToCleanup.push('test.group@test.api');
                    tu.testComplete(done, error);
                });
        });
        it('should not allow two groups with the name', (done) => {
            let error = null;
            UserGroups.create('test.dupe@test.api', 'silver lining', 'testing dupes', 'test')
                .then(() => {
                    return UserGroups.create('test.dupe@test.api', 'silver lining', 'testing dupes', 'test')
                        .then((dupeGroup) => {
                            expect(dupeGroup).to.not.exist;
                        })
                        .catch((err) => {
                            expect(err).to.exist;
                            expect(err).to.be.an.instanceof(Error);
                        });
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('test.dupe@test.api');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('UserGroups.areValid', () => {
        it('should return empty array when nothing is sent', (done) => {
            let error = null;
            UserGroups.areValid([], 'silver lining')
                .then((result) => {
                    expect(result).to.be.empty;
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should return an object with as many entries as names sent, appropriately populated', (done) => {
            let error = null;
            UserGroups.create('test UserGroups.areValid', 'silver lining', 'test', 'test')
                .then(() => {
                    return UserGroups.areValid(['test UserGroups.areValid', 'bogus'], 'silver lining');
                })
                .then((result) => {
                    expect(result).to.exist;
                    expect(result['test UserGroups.areValid']).to.be.true;
                    expect(result.bogus).to.be.false;
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    groupsToCleanup.push('test UserGroups.areValid');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('UserGroups.this.addUsers', () => {
        it('should do nothing if the user is already present as a member and you add user as a member', (done) => {
            let error = null;
            UserGroups.create('addUsersTest1', 'silver lining', 'UserGroups.this.addMemberAlreadyPresent', 'test3')
                .then((ug) => {
                    ug.members.push('alreadyMember');
                    return ug.save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('alreadyMember')).to.be.true;
                    return ug.addMembers(['alreadyMember'], 'test3').save();
                })
                .then((ug) => {
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^add member/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('addUsersTest1');
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user is already present as a owner and you add user as a owner', (done) => {
            let error = null;
            UserGroups.create('addUsersTest2', 'silver lining', 'UserGroups.this.addOwnerAlreadyPresent', 'test3')
                .then((ug) => {
                    ug.owners.push('alreadyOwner');
                    return ug.save();
                })
                .then((ug) => {
                    expect(ug.isPresentInOwners('alreadyOwner')).to.be.true;
                    return ug.addOwners(['alreadyOwner'], 'test3').save();
                })
                .then((ug) => {
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^add owner/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('addUsersTest2');
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user is already present as owner AND member and you add as owner AND member', (done) => {
            let error = null;
            UserGroups.create('addUsersTest3', 'silver lining', 'UserGroups.this.addOwnerAndMemberAlreadyPresent', 'test3')
                .then((ug) => {
                    return ug.addOwners(['test3'], 'test4').addMembers(['test3'], 'test4').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInOwners('test3')).to.be.true;
                    expect(ug.isPresentInMembers('test3')).to.be.true;
                    return ug;
                })
                .then((ug) => {
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^add/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('addUsersTest3');
                    tu.testComplete(done, error);
                });
        });
        it('should add the user as a owner who was not already present and added with the owner role', (done) => {
            let error = null;
            UserGroups.create('addUsersTest4', 'silver lining', 'UserGroups.this.addOwnerNotPresent', 'test3')
                .then((ug) => {
                    return ug.addOwners(['newOwner'], 'test3').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInOwners('newOwner')).to.be.true;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^add owner/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].newValues).to.equal('newOwner');
                    expect(ugaudit[0].change[0].action).to.match(/add owner/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('addUsersTest4');
                    tu.testComplete(done, error);
                });
        });
        it('should add the user as a member who was not already present and added with the member role', (done) => {
            let error = null;
            UserGroups.create('addUsersTest5', 'silver lining', 'UserGroups.this.addMemberNotPresent', 'test3')
                .then((ug) => {
                    return ug.addMembers(['newMember'], 'test3').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('newMember')).to.be.true;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^add member/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].newValues).to.equal('newMember');
                    expect(ugaudit[0].change[0].action).to.match(/add member/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('addUsersTest5');
                    tu.testComplete(done, error);
                });
        });
        it('should add the user as a member and owner who was not already present and added with the member and owner / both role', (done) => {
            let error = null;
            UserGroups.create('addUsersTest6.0', 'silver lining', 'UserGroups.this.addMemberOwnerNotPresent', 'test3')
                .then((ug) => {
                    return ug.addOwners(['newMemberOwner'], 'test3').addMembers(['newMemberOwner'], 'test3').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('newMemberOwner')).to.be.true;
                    expect(ug.isPresentInOwners('newMemberOwner')).to.be.true;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^add/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].newValues).to.equal('newMemberOwner');
                    expect(ugaudit[0].change[1].newValues).to.equal('newMemberOwner');
                })
                .then(() => {
                    return UserGroups.create('addUsersTest6.1', 'silver lining', 'UserGroups.this.addBothNotPresent', 'test3');
                })
                .then((ug) => {
                    return ug.addOwners(['newBoth'], 'test3').addMembers(['newBoth'], 'test3').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('newBoth')).to.be.true;
                    expect(ug.isPresentInOwners('newBoth')).to.be.true;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^add/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].newValues).to.equal('newBoth');
                    expect(ugaudit[0].change[0].newValues).to.equal('newBoth');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('addUsersTest6.0');
                    groupsToCleanup.push('addUsersTest6.1');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('UserGroups.this.removeUsers', () => {
        it('should do nothing if the user is not already present as a member and you remove user as a member', (done) => {
            let error = null;
            UserGroups.create('removeUsersTest1', 'silver lining', 'UserGroups.this.removeMemberNotPresent', 'test4')
                .then((ug) => {
                    ug.owners.push('notMemberButOwner');
                    return ug.save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('notMemberButOwner')).to.be.false;
                    expect(ug.isPresentInOwners('notMemberButOwner')).to.be.true;
                    return ug.removeMembers(['notMemberButOwner'], 'test4').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('notMemberButOwner')).to.be.false;
                    expect(ug.isPresentInOwners('notMemberButOwner')).to.be.true;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^remove user/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('removeUsersTest1');
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user is not already present as a owner and you remove user as a owner', (done) => {
            let error = null;
            UserGroups.create('removeUsersTest2', 'silver lining', 'UserGroups.this.removeOwnerNotPresent', 'test4')
                .then((ug) => {
                    ug.members.push('notOwnerButMember');
                    return ug.save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('notOwnerButMember')).to.be.true;
                    expect(ug.isPresentInOwners('notOwnerButMember')).to.be.false;
                    return ug.removeOwners(['notOwnerButMember'], 'test4').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('notOwnerButMember')).to.be.true;
                    expect(ug.isPresentInOwners('notOwnerButMember')).to.be.false;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^remove user/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('removeUsersTest2');
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user is not present as owner OR member and you remove as owner AND member', (done) => {
            let error = null;
            UserGroups.create('removeUsersTest3', 'UserGroups.this.removeBothNotPresent', 'test4')
                .then((ug) => {
                    expect(ug.isPresentInMembers('neither')).to.be.false;
                    expect(ug.isPresentInOwners('neither')).to.be.false;
                    return ug.removeMembers(['neither'], 'test4').removeOwners(['neither'], 'test4').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('neither')).to.be.false;
                    expect(ug.isPresentInOwners('neither')).to.be.false;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^remove/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('removeUsersTest3');
                    tu.testComplete(done, error);
                });
        });
        it('should remove the users owner role if already present the owner role', (done) => {
            let error = null;
            UserGroups.create('removeUsersTest4.0', 'silver lining', 'UserGroups.this.removeOwner', 'test4')
                .then((ug) => {
                    ug.owners.push('owners');
                    return ug.save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('owners')).to.be.false;
                    expect(ug.isPresentInOwners('owners')).to.be.true;
                    return ug.removeOwners(['owners'], 'test4').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('owners')).to.be.false;
                    expect(ug.isPresentInOwners('owners')).to.be.false;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^remove owner/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.match(/^remove owner/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('removeUsersTest4.0');
                    groupsToCleanup.push('removeUsersTest4.1');
                    tu.testComplete(done, error);
                });
        });
        it('should deactivate the user as a member if already present with the member role', (done) => {
            let error = null;
            UserGroups.create('removeUsersTest5.0', 'silver lining', 'UserGroups.this.removeMember', 'test4')
                .then((ug) => {
                    ug.members.push('members');
                    return ug.save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('members')).to.be.true;
                    expect(ug.isPresentInOwners('members')).to.be.false;
                    return ug.removeMembers(['members'], 'test4').save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('members')).to.be.false;
                    expect(ug.isPresentInOwners('members')).to.be.false;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^remove member/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.match(/^remove member/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('removeUsersTest5.0');
                    groupsToCleanup.push('removeUsersTest5.1');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('UserGroups.this.activate/deactivate', () => {
        it('should do nothing if the user group is already inactive/active and you deactivate/activate', (done) => {
            let error = null;
            UserGroups.create('activateGroupDoNothing', 'silver lining', 'UserGroups.this.activate', 'test5')
                .then((ug) => {
                    return ug.reactivate('test5').save();
                })
                .then((ug) => {
                    expect(ug.isActive).to.be.true;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .then(() => {
                    return UserGroups.create('deactivateGroupDoNothing', 'silver lining', 'UserGroups.this.deactivate', 'test5');
                })
                .then((ug) => {
                    ug.isActive = false;
                    return ug.save();
                })
                .then((ug) => {
                    return ug.deactivate('test5').save();
                })
                .then((ug) => {
                    expect(ug.isActive).to.be.false;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('activateGroupDoNothing');
                    groupsToCleanup.push('deactivateGroupDoNothing');
                    tu.testComplete(done, error);
                });
        });
        it('should mark the group as inactive / active when you deactivate / activate', (done) => {
            let error = null;
            UserGroups.create('deactivateGroup', 'silver lining', 'UserGroups.this.deactivate', 'test5')
                .then((ug) => {
                    return ug.deactivate('test5').save();
                })
                .then((ug) => {
                    expect(ug.isActive).to.be.false;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.equal('isActive');
                })
                .then(() => {
                    return UserGroups.create('activateGroup', 'silver lining', 'UserGroups.this.reactivate', 'test5');
                })
                .then((ug) => {
                    ug.isActive = false;
                    return ug.save();
                })
                .then((ug) => {
                    return ug.reactivate('test5').save();
                })
                .then((ug) => {
                    expect(ug.isActive).to.be.true;
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.equal('isActive');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('activateGroup');
                    groupsToCleanup.push('deactivateGroup');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('UserGroups.this.setDescription', () => {
        it('should do nothing if there is no change in the description', (done) => {
            let error = null;
            UserGroups.create('updateDesc1', 'silver lining', 'UserGroups.this.updateDesc', 'test6')
                .then((ug) => {
                    return ug.setDescription(ug.description, 'test6').save();
                })
                .then((ug) => {
                    expect(ug.description).to.equal('UserGroups.this.updateDesc');
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^description/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('updateDesc1');
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new description', (done) => {
            let error = null;
            UserGroups.create('updateDesc2', 'silver lining', 'UserGroups.this.updateDesc', 'test6')
                .then((ug) => {
                    return ug.setDescription(ug.description + 'new', 'test6').save();
                })
                .then((ug) => {
                    expect(ug.description).to.equal('UserGroups.this.updateDescnew');
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^description/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.equal('description');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('updateDesc2');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('UserGroups.this.setAccess', () => {
        it('should do nothing if there is no change in the access', (done) => {
            let error = null;
            UserGroups.create('updateAccess1', 'silver lining', 'UserGroups.this.setAccess', 'test6')
                .then((ug) => {
                    return ug.setAccess('restricted', 'test6').save();
                })
                .then((ug) => {
                    expect(ug.access).to.equal('restricted');
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^access/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('updateAccess1');
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new access control', (done) => {
            let error = null;
            UserGroups.create('updateAccess2', 'silver lining', 'UserGroups.this.setAccess', 'test6')
                .then((ug) => {
                    return ug.setAccess('public', 'test6').save();
                })
                .then((ug) => {
                    expect(ug.access).to.equal('public');
                    return Audit.findAudit('user-groups', ug._id, {'change.action': {$regex: /^access/}});
                })
                .then((ugaudit) => {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].change[0].action).to.equal('access');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    groupsToCleanup.push('updateAccess2');
                    tu.testComplete(done, error);
                });
        });
    });
    after((done) => {
        return tu.cleanup({userGroups: groupsToCleanup}, done);
    });
});
