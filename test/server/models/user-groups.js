'use strict';
var Config = require('./../../../config').config({argv: []});
var UserGroups = require('./../../../server/models/user-groups');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Audit = require('./../../../server/models/audit');
var _ = require('lodash');
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

describe('UserGroups Model', function () {
    var groupsToCleanup = [];
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
        UserGroups.connect(Config.hapiMongoModels.mongodb, function (err, db) {
            if (err || !db) {
                throw err;
            }
            done();
        });
    });

    describe('UserGroups.create', function () {
        it('should create a new document when it succeeds, the creator should be owner and member and have appropriate audit entries', function (done) {
            var error = null;
            groupsToCleanup.push('test.group@test.api');
            UserGroups.create('test.group@test.api', 'creating groups', 'test')
                .then(function (userGroup) {
                    expect(userGroup).to.exist();
                    expect(userGroup).to.be.an.instanceof(UserGroups);
                    expect(userGroup.name).to.contain('test.group@test.api');
                    expect(userGroup.isMember('test')).to.be.true();
                    expect(userGroup.isOwner('test')).to.be.true();
                })
                .then(function () {
                    return Audit.findUserGroupsAudit({name: 'test.group@test.api', action: 'create'});
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
                    testComplete(done, null);
                });
        });
        it('should not allow two groups with the name', function (done) {
            var error = null;
            groupsToCleanup.push('test.dupe@test.api');
            UserGroups.create('test.dupe@test.api', 'testing dupes', 'test')
                .then(function (userGroup) {
                    return UserGroups.create('test.dupe@test.api', 'testing dupes', 'test')
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
                    testComplete(done, error);
                });
        });
    });

    describe('UserGroups.findByName', function () {
        before(function (done) {
            groupsToCleanup.push('test.search@test.api');
            UserGroups.create('test.search@test.api', 'testing search', 'test')
                .done(function () {
                    done();
                });
        });
        it('should return a user group that matches the name', function (done) {
            var error = null;
            UserGroups.findByName('test.search@test.api')
                .then(function (ug) {
                    expect(ug).to.exist();
                    expect(ug.name).to.equal('test.search@test.api');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should return false when nothing matches', function (done) {
            var error = null;
            UserGroups.findByName('test.find@test.api')
                .then(function (ug) {
                    expect(ug).to.be.false();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should only return a user group that is currently active', function (done) {
            var error = null;
            UserGroups.findByName('test.search@test.api')
                .then(function (ug) {
                    return ug.deactivate();
                })
                .then(function () {
                    return UserGroups.findByName('test.search@test.api');
                })
                .then(function (ug2) {
                    expect(ug2).to.be.false();
                })
                .then(function () {
                    return UserGroups._findOne({name: 'test.search@test.api', isActive: false});
                })
                .then(function (ug3) {
                    expect(ug3).to.exist();
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

    describe('UserGroups.findGroupsForUser', function () {
        before(function (done) {
            groupsToCleanup.push('test.search.user@test.api');
            groupsToCleanup.push('test.search2.user@test.api');
            UserGroups.create('test.search.user@test.api', 'testing findGroupForUser', 'test2')
                .then(function (ug) {
                    ug.members.push({email: 'someUser', isActive: true, isMember: true, isOwner: false});
                    ug.members.push({email: 'anotherUser', isActive: true, isMember: true, isOwner: false});
                    UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function () {
                    return UserGroups.create('test.search2.user@test.api', 'testing2 findGroupForUser', 'test2');
                })
                .then(function (ug2) {
                    ug2.members.push({email: 'someUser', isActive: true, isMember: false, isOwner: true});
                    ug2.members.push({email: 'anotherUser', isActive: true, isMember: true, isOwner: false});
                    UserGroups._findByIdAndUpdate(ug2._id, ug2);
                })
                .done(function () {
                    done();
                });
        });
        it('should return user groups array with groups that have the user as a member', function (done) {
            var error = null;
            UserGroups.findGroupsForUser('test2')
                .then(function (ug) {
                    expect(ug.length).to.equal(2);
                    expect(ug[0].isOwner('test2')).to.be.true();
                    expect(ug[0].isMember('test2')).to.be.true();
                    expect(ug[1].isOwner('test2')).to.be.true();
                    expect(ug[1].isMember('test2')).to.be.true();
                })
                .then(function () {
                    return UserGroups.findGroupsForUser('someUser');
                })
                .then(function (ug2) {
                    expect(ug2).to.exist();
                    expect(ug2.length).to.equal(1);
                    expect(ug2[0].name).to.equal('test.search.user@test.api');
                    expect(ug2[0].isMember('someUser')).to.be.true();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should return groups only where the user is active', function (done) {
            var error = null;
            UserGroups.findByName('test.search2.user@test.api')
                .then(function (ug) {
                    var m = _.findWhere(ug.members, {email: 'anotherUser'});
                    m.isMember = false;
                    m.isActive = false;
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function () {
                    return UserGroups.findGroupsForUser('anotherUser');
                })
                .then(function (ug2) {
                    expect(ug2.length).to.equal(1);
                    expect(ug2[0].name).to.equal('test.search.user@test.api');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should return an empty array when user is not part of any group', function (done) {
            var error = null;
            UserGroups.findGroupsForUser('bogus')
                .then(function (ug) {
                    expect(ug.length).to.equal(0);
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

    describe('UserGroups.isValid', function () {
        it ('should return with a not found message when group does not exist', function (done) {
            var error = null;
            UserGroups.isValid(BaseModel.ObjectID(null), 'unknown')
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.equal('not found');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it ('should return with not an owner when the owner argument is not an owner (active or otherwise)', function (done) {
            var error = null;
            groupsToCleanup.push('isValidTest');
            UserGroups.create('isValidTest', 'isValidTest', 'test5')
                .then(function(ug) {
                    return UserGroups.isValid(ug._id, 'unknown');
                })
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.equal('not an owner');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it ('should return valid when the group exists and the owner is an active owner', function (done) {
            var error = null;
            groupsToCleanup.push('isValidTest2');
            UserGroups.create('isValidTest2', 'isValidTest2', 'test5')
                .then(function(ug) {
                    return UserGroups.isValid(ug._id, 'test5');
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
                    testComplete(done, error);
                });
        });
        it ('should return valid when the group exists and we pass root as owner', function (done) {
            var error = null;
            groupsToCleanup.push('isValidTest3');
            UserGroups.create('isValidTest3', 'isValidTest3', 'test5')
                .then(function(ug) {
                    return UserGroups.isValid(ug._id, 'root');
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
                    testComplete(done, error);
                });
        });
    });

    describe('UserGroups.this.addUsers', function () {
        it('should do nothing if the user is already present as a member and you add user as a member', function (done) {
            groupsToCleanup.push('addUsersTest1');
            var error = null;
            UserGroups.create('addUsersTest1', 'UserGroups.this.addMemberAlreadyPresent', 'test3')
                .then(function (ug) {
                    ug.members.push({email: 'alreadyMember', isActive: true, isOwner: false, isMember: true});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('alreadyMember')).to.be.true();
                    return ug.addUsers(['alreadyMember'], 'member', 'test3');
                })
                .then(function (ug) {
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should do nothing if the user is already present as a owner and you add user as a owner', function (done) {
            groupsToCleanup.push('addUsersTest2');
            var error = null;
            UserGroups.create('addUsersTest2', 'UserGroups.this.addOwnerAlreadyPresent', 'test3')
                .then(function (ug) {
                    ug.members.push({email: 'alreadyOwner', isActive: true, isOwner: true, isMember: false});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isOwner('alreadyOwner')).to.be.true();
                    return ug.addUsers(['alreadyOwner'], 'owner', 'test3');
                })
                .then(function (ug) {
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should do nothing if the user is already present as owner AND member and you add as owner AND member', function (done) {
            groupsToCleanup.push('addUsersTest3');
            var error = null;
            UserGroups.create('addUsersTest3', 'UserGroups.this.addOwnerAndMemberAlreadyPresent', 'test3')
                .then(function (ug) {
                    return ug.addUsers(['test3'], 'both', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isOwner('test3')).to.be.true();
                    expect(ug.isMember('test3')).to.be.true();
                    return ug;
                })
                .then(function (ug) {
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should add the user as a owner who was not already present and added with the owner role', function (done) {
            groupsToCleanup.push('addUsersTest4');
            var error = null;
            UserGroups.create('addUsersTest4', 'UserGroups.this.addOwnerNotPresent', 'test3')
                .then(function (ug) {
                    return ug.addUsers(['newOwner'], 'owner', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isOwner('newOwner')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].newValues).to.equal('newOwner');
                    expect(ugaudit[0].action).to.equal('add user isOwner:true,isMember:false');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should add the user as a member who was not already present and added with the member role', function (done) {
            groupsToCleanup.push('addUsersTest5');
            var error = null;
            UserGroups.create('addUsersTest5', 'UserGroups.this.addMemberNotPresent', 'test3')
                .then(function (ug) {
                    return ug.addUsers(['newMember'], 'member', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isMember('newMember')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].newValues).to.equal('newMember');
                    expect(ugaudit[0].action).to.equal('add user isOwner:false,isMember:true');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should add the user as a member and owner who was not already present and added with the member and owner / both role', function (done) {
            groupsToCleanup.push('addUsersTest6.0');
            groupsToCleanup.push('addUsersTest6.1');
            var error = null;
            UserGroups.create('addUsersTest6.0', 'UserGroups.this.addMemberOwnerNotPresent', 'test3')
                .then(function (ug) {
                    return ug.addUsers(['newMemberOwner'], 'memberowner', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isMember('newMemberOwner')).to.be.true();
                    expect(ug.isOwner('newMemberOwner')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].newValues).to.equal('newMemberOwner');
                    expect(ugaudit[0].action).to.equal('add user isOwner:true,isMember:true');
                })
                .then(function () {
                    return UserGroups.create('addUsersTest6.1', 'UserGroups.this.addBothNotPresent', 'test3');
                })
                .then(function (ug) {
                    return ug.addUsers(['newBoth'], 'both', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isMember('newBoth')).to.be.true();
                    expect(ug.isOwner('newBoth')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].newValues).to.equal('newBoth');
                    expect(ugaudit[0].action).to.equal('add user isOwner:true,isMember:true');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should mark the user as a member if it was previously in the list either as owner or member and now added as member', function (done) {
            groupsToCleanup.push('addUsersTest7.0');
            groupsToCleanup.push('addUsersTest7.1');
            var error = null;
            UserGroups.create('addUsersTest7.0', 'UserGroups.this.addMemberAlreadyPresent', 'test3')
                .then(function (ug) {
                    ug.members.push({email: 'alreadyOwnerNowMember', isOwner: true, isMember: false, isActive: true});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isOwner('alreadyOwnerNowMember')).to.be.true();
                    return ug.addUsers(['alreadyOwnerNowMember'], 'member', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isMember('alreadyOwnerNowMember')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].action).to.equal('add user members.alreadyOwnerNowMember.isMember');
                })
                .then(function () {
                    return UserGroups.create('addUsersTest7.1', 'UserGroups.this.memberInactive', 'test3');
                })
                .then(function (ug) {
                    ug.members.push({email: 'disabledMember', isOwner: false, isMember: false, isActive: false});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('disabledMember')).to.be.false();
                    return ug.addUsers(['disabledMember'], 'member', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isMember('disabledMember')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(2);
                    expect(ugaudit[0].action).to.match(/^add user members.disabledMember/);
                    expect(ugaudit[1].action).to.match(/^add user members.disabledMember/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should mark the user as a owner if it was previously in the list either as owner or member and now added as owner', function (done) {
            groupsToCleanup.push('addUsersTest8.0');
            groupsToCleanup.push('addUsersTest8.1');
            var error = null;
            UserGroups.create('addUsersTest8.0', 'UserGroups.this.addOwnerAlreadyPresent', 'test3')
                .then(function (ug) {
                    ug.members.push({email: 'alreadyMemberNowOwner', isOwner: false, isMember: true, isActive: true});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('alreadyMemberNowOwner')).to.be.true();
                    return ug.addUsers(['alreadyMemberNowOwner'], 'owner', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isOwner('alreadyMemberNowOwner')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].action).to.equal('add user members.alreadyMemberNowOwner.isOwner');
                })
                .then(function () {
                    return UserGroups.create('addUsersTest8.1', 'UserGroups.this.ownerInactive', 'test3');
                })
                .then(function (ug) {
                    ug.members.push({email: 'disabledOwner', isOwner: false, isMember: false, isActive: false});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isOwner('disabledOwner')).to.be.false();
                    return ug.addUsers(['disabledOwner'], 'owner', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isOwner('disabledOwner')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(2);
                    expect(ugaudit[0].action).to.match(/^add user members.disabledOwner/);
                    expect(ugaudit[1].action).to.match(/^add user members.disabledOwner/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should mark the user as a owner and member if it was previously in the list either as owner or member and now added as both', function (done) {
            groupsToCleanup.push('addUsersTest9');
            var error = null;
            UserGroups.create('addUsersTest9', 'UserGroups.this.addBothAlreadyPresent', 'test3')
                .then(function (ug) {
                    ug.members.push({email: 'disabled', isOwner: false, isMember: false, isActive: false});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('disabled')).to.be.false();
                    expect(ug.isOwner('disabled')).to.be.false();
                    return ug.addUsers(['disabled'], 'both', 'test3');
                })
                .then(function (ug) {
                    expect(ug.isMember('disabled')).to.be.true();
                    expect(ug.isOwner('disabled')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^add user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(3);
                    expect(ugaudit[0].action).to.match(/^add user members.disabled/);
                    expect(ugaudit[1].action).to.match(/^add user members.disabled/);
                    expect(ugaudit[2].action).to.match(/^add user members.disabled/);
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

    describe('UserGroups.this.removeUsers', function () {
        it('should do nothing if the user is not already present as a member and you remove user as a member', function (done) {
            groupsToCleanup.push('removeUsersTest1');
            var error = null;
            UserGroups.create('removeUsersTest1', 'UserGroups.this.removeMemberNotPresent', 'test4')
                .then(function (ug) {
                    ug.members.push({email: 'notMemberButOwner', isActive: true, isOwner: true, isMember: false});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('notMemberButOwner')).to.be.false();
                    expect(ug.isOwner('notMemberButOwner')).to.be.true();
                    return ug.removeUsers(['notMemberButOwner'], 'member', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('notMemberButOwner')).to.be.false();
                    expect(ug.isOwner('notMemberButOwner')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should do nothing if the user is not already present as a owner and you remove user as a owner', function (done) {
            groupsToCleanup.push('removeUsersTest2');
            var error = null;
            UserGroups.create('removeUsersTest2', 'UserGroups.this.removeOwnerNotPresent', 'test4')
                .then(function (ug) {
                    ug.members.push({email: 'notOwnerButMember', isActive: true, isOwner: false, isMember: true});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('notOwnerButMember')).to.be.true();
                    expect(ug.isOwner('notOwnerButMember')).to.be.false();
                    return ug.removeUsers(['notOwnerButMember'], 'owner', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('notOwnerButMember')).to.be.true();
                    expect(ug.isOwner('notOwnerButMember')).to.be.false();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should do nothing if the user is not present as owner OR member and you remove as owner AND member', function (done) {
            groupsToCleanup.push('removeUsersTest3');
            var error = null;
            UserGroups.create('removeUsersTest3', 'UserGroups.this.removeBothNotPresent', 'test4')
                .then(function (ug) {
                    ug.members.push({email: 'neither', isActive: false, isOwner: false, isMember: false});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('neither')).to.be.false();
                    expect(ug.isOwner('neither')).to.be.false();
                    return ug.removeUsers(['neither'], 'owner', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('neither')).to.be.false();
                    expect(ug.isOwner('neither')).to.be.false();
                    return ug.removeUsers(['neither'], 'member', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('neither')).to.be.false();
                    expect(ug.isOwner('neither')).to.be.false();
                    return ug.removeUsers(['neither'], 'both', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('neither')).to.be.false();
                    expect(ug.isOwner('neither')).to.be.false();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should deactivate the users owner role if already present the owner role', function (done) {
            groupsToCleanup.push('removeUsersTest4.0');
            groupsToCleanup.push('removeUsersTest4.1');
            var error = null;
            UserGroups.create('removeUsersTest4.0', 'UserGroups.this.removeOwner', 'test4')
                .then(function (ug) {
                    ug.members.push({email: 'owner', isActive: true, isOwner: true, isMember: false});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('owner')).to.be.false();
                    expect(ug.isOwner('owner')).to.be.true();
                    return ug.removeUsers(['owner'], 'owner', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('owner')).to.be.false();
                    expect(ug.isOwner('owner')).to.be.false();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(2);
                    expect(ugaudit[0].action).to.match(/^remove user members.owner/);
                    expect(ugaudit[1].action).to.match(/^remove user members.owner/);
                })
                .then(function () {
                    return UserGroups.create('removeUsersTest4.1', 'UserGroups.this.removeOwner2', 'test4');
                })
                .then(function (ug) {
                    ug.members.push({email: 'owner2', isActive: true, isOwner: true, isMember: true});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('owner2')).to.be.true();
                    expect(ug.isOwner('owner2')).to.be.true();
                    return ug.removeUsers(['owner2'], 'owner', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('owner2')).to.be.true();
                    expect(ug.isOwner('owner2')).to.be.false();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].action).to.equal('remove user members.owner2.isOwner');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    testComplete(done, error);
                });
        });
        it('should deactivate the user as a member if already present with the member role', function (done) {
            groupsToCleanup.push('removeUsersTest5.0');
            groupsToCleanup.push('removeUsersTest5.1');
            var error = null;
            UserGroups.create('removeUsersTest5.0', 'UserGroups.this.removeMember', 'test4')
                .then(function (ug) {
                    ug.members.push({email: 'member', isActive: true, isOwner: false, isMember: true});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('member')).to.be.true();
                    expect(ug.isOwner('member')).to.be.false();
                    return ug.removeUsers(['member'], 'member', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('member')).to.be.false();
                    expect(ug.isOwner('member')).to.be.false();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(2);
                    expect(ugaudit[0].action).to.match(/^remove user members.member/);
                    expect(ugaudit[1].action).to.match(/^remove user members.member/);
                })
                .then(function () {
                    return UserGroups.create('removeUsersTest5.1', 'UserGroups.this.removeMember2', 'test4');
                })
                .then(function (ug) {
                    ug.members.push({email: 'member2', isActive: true, isOwner: true, isMember: true});
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    expect(ug.isMember('member2')).to.be.true();
                    expect(ug.isOwner('member2')).to.be.true();
                    return ug.removeUsers(['member2'], 'member', 'test4');
                })
                .then(function (ug) {
                    expect(ug.isMember('member2')).to.be.false();
                    expect(ug.isOwner('member2')).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^remove user/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].action).to.equal('remove user members.member2.isMember');
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

    describe('UserGroups.this.activate/deactivate', function () {
        it('should do nothing if the user group is already inactive/active and you deactivate/activate', function (done) {
            groupsToCleanup.push('activateGroupDoNothing');
            groupsToCleanup.push('deactivateGroupDoNothing');
            var error = null;
            UserGroups.create('activateGroupDoNothing', 'UserGroups.this.activate', 'test5')
                .then(function (ug) {
                    return ug.reactivate('test5');
                })
                .then(function (ug) {
                    expect(ug.isActive).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^isActive/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
                })
                .then(function () {
                    return UserGroups.create('deactivateGroupDoNothing', 'UserGroups.this.deactivate', 'test5');
                })
                .then(function (ug) {
                    ug.isActive = false;
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    return ug.deactivate('test5');
                })
                .then(function (ug) {
                    expect(ug.isActive).to.be.false();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^isActive/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
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
            groupsToCleanup.push('activateGroup');
            groupsToCleanup.push('deactivateGroup');
            var error = null;
            UserGroups.create('deactivateGroup', 'UserGroups.this.deactivate', 'test5')
                .then(function (ug) {
                    return ug.deactivate('test5');
                })
                .then(function (ug) {
                    expect(ug.isActive).to.be.false();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^isActive/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].action).to.equal('isActive');
                })
                .then(function () {
                    return UserGroups.create('activateGroup', 'UserGroups.this.reactivate', 'test5');
                })
                .then(function (ug) {
                    ug.isActive = false;
                    return UserGroups._findByIdAndUpdate(ug._id, ug);
                })
                .then(function (ug) {
                    return ug.reactivate('test5');
                })
                .then(function (ug) {
                    expect(ug.isActive).to.be.true();
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^isActive/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].action).to.equal('isActive');
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

    describe('UserGroups.this.updateDesc', function () {
        it('should do nothing if there is no change in the description', function (done) {
            groupsToCleanup.push('updateDesc1');
            var error = null;
            UserGroups.create('updateDesc1', 'UserGroups.this.updateDesc', 'test6')
                .then(function (ug) {
                    return ug.updateDesc(ug.description, 'test6');
                })
                .then(function (ug) {
                    expect(ug.description).to.equal('UserGroups.this.updateDesc');
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^change desc/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(0);
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
            groupsToCleanup.push('updateDesc2');
            var error = null;
            UserGroups.create('updateDesc2', 'UserGroups.this.updateDesc', 'test6')
                .then(function (ug) {
                    return ug.updateDesc(ug.description + 'new', 'test6');
                })
                .then(function (ug) {
                    expect(ug.description).to.equal('UserGroups.this.updateDescnew');
                    return Audit.findUserGroupsAudit({name: ug.name, action: {$regex: /^change desc/}});
                })
                .then(function (ugaudit) {
                    expect(ugaudit.length).to.equal(1);
                    expect(ugaudit[0].action).to.equal('change desc');
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

    after(function (done) {
        UserGroups.remove({name: {$in: groupsToCleanup}}, function (err, result) {
            if (err) {
                throw err;
            }
            var query = {objectChangedId: {$in: groupsToCleanup}};
            Audit.remove(query, function (err, result) {
                if (err) {
                    throw err;
                }
                done();
            });
        });
    });

});
