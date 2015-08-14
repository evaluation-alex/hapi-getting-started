'use strict';
/*eslint-disable no-unused-expressions*/
/*eslint-disable no-var*/
/*jshint -W079*/
let UserGroups = require('./../../../server/user-groups/model');
let Notifications = require('./../../../server/users/notifications/model');
let Audit = require('./../../../server/audit/model');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('UserGroups', () => {
    let rootAuthHeader = null;
    let server = null;
    let groupsToClear = [];
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                rootAuthHeader = res.authheader;
                done();
            })
            .catch((err) => {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    describe('GET /user-groups', () => {
        before((done) => {
            UserGroups.create('GetUserGroupsTestName', 'silver lining', 'GET /user-groups', 'root')
                .then(() => {
                    return UserGroups.create('GetUserGroupsTestMemberActive', 'silver lining', 'GET /user-groups', 'root');
                })
                .then((g2) => {
                    return g2.addMembers(['user1', 'user2'], 'root').save();
                })
                .then(() => {
                    return UserGroups.create('GetUserGroupsTestMemberInactive', 'silver lining', 'GET /user-groups', 'root');
                })
                .then((g3) => {
                    return g3.addMembers(['user4'], 'root').save();
                })
                .then(() => {
                    return UserGroups.create('GetUserGroupsTestInactive', 'silver lining', 'GET /user-groups', 'root');
                })
                .then((g4) => {
                    return g4.deactivate('root').save();
                })
                .then(() => {
                    done();
                })
                .catch((err) => {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should give active groups when isactive = true is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/user-groups?isActive="true"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(3);
                    expect(p.data[0].isActive).to.be.true;
                    expect(p.data[1].isActive).to.be.true;
                    expect(p.data[2].isActive).to.be.true;
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give inactive groups when isactive = false is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/user-groups?isActive="false"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].isActive).to.be.false;
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give only the groups whose name is sent in the parameter', (done) => {
            let request = {
                method: 'GET',
                url: '/user-groups?groupName=GetUserGroupsTestName',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].name).to.match(/GetUserGroupsTestName/);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give the groups where the user is a member when user id is sent in the parameters', (done) => {
            let request = {
                method: 'GET',
                url: '/user-groups?email=user2',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].name).to.match(/GetUserGroupsTestMemberActive/);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should return both inactive and active groups when nothing is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/user-groups',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(4);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        after((done) => {
            groupsToClear.push('GetUserGroupsTestName');
            groupsToClear.push('GetUserGroupsTestMemberActive');
            groupsToClear.push('GetUserGroupsTestMemberInactive');
            groupsToClear.push('GetUserGroupsTestInactive');
            done();
        });
    });
    describe('GET /user-groups/{id}', () => {
        let id = '';
        before((done) => {
            UserGroups.create('testGetByID', 'silver lining', 'GET /user-groups/id', 'root')
                .then((ug) => {
                    id = ug._id.toString();
                    done();
                });
        });
        it('should only send back user-group with the id in params', (done) => {
            let request = {
                method: 'GET',
                url: '/user-groups/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.name).to.equal('testGetByID');
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should send back not found when the user-group with the id in params is not found', (done) => {
            let request = {
                method: 'GET',
                url: '/user-groups/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        after((done) => {
            groupsToClear.push('testGetByID');
            done();
        });
    });
    describe('PUT /user-groups/{id}', () => {
        it('should send back not found error when you try to modify a non existent group', (done) => {
            let request = {
                method: 'PUT',
                url: '/user-groups/54c894fe1d1d4ab4032ed94e',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {}
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    groupsToClear.push('testUserGroupPutNotFound');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testUserGroupPutNotFound');
                    done(err);
                });
        });
        it('should send back error if any of the users or owners to be added are not valid', (done) => {
            let id = '';
            UserGroups.create('testGroupUserExistPUT', 'silver lining', 'test PUT /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedMembers: ['unknown'],
                            addedOwners: ['madeup']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    groupsToClear.push('testGroupUserExistPUT');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testGroupUserExistPUT');
                    done(err);
                });
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', (done) => {
            let id = '';
            UserGroups.create('testPutGroupNotOwner', 'silver lining', 'test PUT /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            description: '    test PUT /user-groups'
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    groupsToClear.push('testPutGroupNotOwner');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutGroupNotOwner');
                    done(err);
                });
        });
        it('should deactivate group and have changes audited', (done) => {
            let id = '';
            UserGroups.create('testPutGroupDeActivate', 'silver lining', 'test PUT /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            isActive: false
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutGroupDeActivate'});
                })
                .then((ug2) => {
                    expect(ug2).to.exist;
                    expect(ug2[0].isActive).to.be.false;
                    return Audit.findAudit('user-groups', ug2[0]._id, {'change.action': 'isActive'});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/isActive/);
                    groupsToClear.push('testPutGroupDeActivate');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutGroupDeActivateActivate');
                    done(err);
                });
        });
        it('should activate group and have changes audited', (done) => {
            let id = '';
            UserGroups.create('testPutGroupActivate', 'silver lining', 'test PUT /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    ug.isActive = false;
                    return ug.save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            isActive: true
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutGroupActivate'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isActive).to.be.true;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.action': 'isActive'});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/isActive/);
                    groupsToClear.push('testPutGroupActivate');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutGroupActivate');
                    done(err);
                });
        });
        it('should add users / owners and have changes audited', (done) => {
            let id = '';
            UserGroups.create('testPutGroupAddUserOwner', 'silver lining', 'test PUT /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedMembers: ['one@first.com'],
                            addedOwners: ['root']
                        }
                    };
                    server.injectThen(request)
                        .then((response) => {
                            expect(response.statusCode).to.equal(200);
                            UserGroups.find({name: 'testPutGroupAddUserOwner'})
                                .then((ug2) => {
                                    expect(ug2).to.exist;
                                    expect(ug2[0].isPresentInMembers('one@first.com')).to.be.true;
                                    expect(ug2[0].isPresentInOwners('root')).to.be.true;
                                    return Audit.findAudit('user-groups', ug2[0]._id, {'change.action': {$regex: /add/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add/);
                                    expect(foundAudit[0].change[1].action).to.match(/add/);
                                    groupsToClear.push('testPutGroupAddUserOwner');
                                    done();
                                });
                        })
                        .catch((err) => {
                            groupsToClear.push('testPutGroupAddUserOwner');
                            done(err);
                        });
                });
        });
        it('should remove members / owners and have changes audited', (done) => {
            let id = '';
            UserGroups.create('testPutGroupRemoveUserOwner', 'silver lining', 'test PUT /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    ug.members.push('root');
                    ug.owners.push('one@first.com');
                    return ug.save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('root')).to.be.true;
                    expect(ug.isPresentInOwners('one@first.com')).to.be.true;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            removedOwners: ['one@first.com'],
                            removedMembers: ['root']
                        }
                    };
                    server.injectThen(request)
                        .then((response) => {
                            expect(response.statusCode).to.equal(200);
                            UserGroups.find({name: 'testPutGroupRemoveUserOwner'})
                                .then((ug2) => {
                                    expect(ug2).to.exist;
                                    expect(ug2[0].isPresentInMembers('root')).to.be.false;
                                    expect(ug2[0].isPresentInOwners('one@first.com')).to.be.false;
                                    return Audit.findAudit('user-groups', ug2[0]._id, {'change.action': {$regex: /remove/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/remove/);
                                    expect(foundAudit[0].change[1].action).to.match(/remove/);
                                    groupsToClear.push('testPutGroupRemoveUserOwner');
                                    done();
                                });
                        })
                        .catch((err) => {
                            groupsToClear.push('testPutGroupRemoveUserOwner');
                            done(err);
                        });
                });
        });
        it('should add/remove members / owners and have changes audited and notifications sent to owners', (done) => {
            let id = '';
            UserGroups.create('testPutGroupAddRemoveUserOwner', 'silver lining', 'test PUT /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    ug.members[0] = 'root';
                    ug.owners[0] = 'one@first.com';
                    return ug.save();
                })
                .then((ug) => {
                    expect(ug.isPresentInMembers('root')).to.be.true;
                    expect(ug.isPresentInOwners('one@first.com')).to.be.true;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            removedOwners: ['one@first.com'],
                            removedMembers: ['root'],
                            addedOwners: ['root'],
                            addedMembers: ['one@first.com']
                        }
                    };
                    server.injectThen(request)
                        .then((response) => {
                            expect(response.statusCode).to.equal(200);
                            UserGroups.find({name: 'testPutGroupAddRemoveUserOwner'})
                                .then((ug2) => {
                                    expect(ug2).to.exist;
                                    expect(ug2[0].isPresentInMembers('root')).to.be.false;
                                    expect(ug2[0].isPresentInOwners('one@first.com')).to.be.false;
                                    expect(ug2[0].isPresentInOwners('root')).to.be.true;
                                    expect(ug2[0].isPresentInMembers('one@first.com')).to.be.true;
                                    return Audit.findAudit('user-groups', ug2[0]._id, {'change.action': {$regex: /add|remove/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add|remove/);
                                    expect(foundAudit[0].change[1].action).to.match(/add|remove/);
                                    expect(foundAudit[0].change[2].action).to.match(/add|remove/);
                                    expect(foundAudit[0].change[3].action).to.match(/add|remove/);
                                })
                                .then(() => {
                                    var ct = setTimeout(() => {
                                        Notifications.find({
                                            objectType: 'user-groups',
                                            objectId: UserGroups.ObjectID(id)
                                        })
                                            .then((notifications) => {
                                                expect(notifications.length).to.equal(1);
                                                expect(notifications[0].content.owners.added.length).to.equal(1);
                                                expect(notifications[0].content.owners.removed.length).to.equal(1);
                                                expect(notifications[0].content.members.added.length).to.equal(1);
                                                expect(notifications[0].content.members.removed.length).to.equal(1);
                                                return Notifications.remove({
                                                    objectType: 'user-groups',
                                                    objectId: UserGroups.ObjectID(id)
                                                });
                                            })
                                            .then((count) => {
                                                groupsToClear.push('testPutGroupAddRemoveUserOwner');
                                                expect(count).to.equal(1);
                                                done();
                                                clearTimeout(ct);
                                            });
                                    }, 2000);
                                });
                        })
                        .catch((err) => {
                            groupsToClear.push('testPutGroupAddRemoveUserOwner');
                            done(err);
                        });
                });
        });
        it('should update description and have changes audited', (done) => {
            let id = '';
            UserGroups.create('testPutGroupChangeDesc', 'silver lining', 'test PUT /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            description: 'new description'
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutGroupChangeDesc'});
                })
                .then((ug2) => {
                    expect(ug2).to.exist;
                    expect(ug2[0].description).to.equal('new description');
                    return Audit.findAudit('user-groups', ug2[0]._id, {'change.action': {$regex: /description/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/description/);
                    groupsToClear.push('testPutGroupChangeDesc');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutGroupChangeDesc');
                    done(err);
                });
        });
    });
    describe('PUT /user-groups/{id}/join', () => {
        it('should send back not found error when you try to join a non existent group', (done) => {
            let request = {
                method: 'PUT',
                url: '/user-groups/54c894fe1d1d4ab4032ed94e/join',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    groupsToClear.push('testUserGroupPutJoinNotFound');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testUserGroupPutJoinNotFound');
                    done(err);
                });
        });
        it('should add user who has joined to the needsApproval list and notify the owners', (done) => {
            let id = '';
            UserGroups.create('testPutJoinGroupAddUser', 'silver lining', 'test PUT /user-groups/join', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addOwners(['owner1', 'owner2', 'owner3'], 'test').removeOwners(['test'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/join',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutJoinGroupAddUser'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInNeedsApproval('one@first.com')).to.be.true;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.action': {$regex: /add needsApproval/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/add needsApproval/);
                })
                .then(() => {
                    var ct = setTimeout(() => {
                        Notifications.find({
                            objectType: 'user-groups',
                            objectId: UserGroups.ObjectID(id),
                            action: 'approve'
                        })
                            .then((notifications) => {
                                expect(notifications.length).to.equal(3);
                                return Notifications.remove({
                                    objectType: 'user-groups',
                                    objectId: UserGroups.ObjectID(id)
                                });
                            })
                            .then((count) => {
                                groupsToClear.push('testPutJoinGroupAddUser');
                                expect(count).to.equal(3);
                                done();
                                clearTimeout(ct);
                            });
                    }, 2000);
                })
                .catch((err) => {
                    groupsToClear.push('testPutJoinGroupAddUser');
                    done(err);
                });
        });
        it('should add to members if the group access is public and have changes audited', (done) => {
            let id = '';
            UserGroups.create('testPutJoinPublicGroupAddUser', 'silver lining', 'test PUT /user-groups/join', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.setAccess('public').addOwners(['owner1', 'owner2', 'owner3'], 'test').removeOwners(['test'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/join',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutJoinPublicGroupAddUser'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInMembers('one@first.com')).to.be.true;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.action': {$regex: /add member/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/add member/);
                })
                .then(() => {
                    var ct = setTimeout(() => {
                        Notifications.find({
                            objectType: 'user-groups',
                            objectId: UserGroups.ObjectID(id),
                            action: 'fyi'
                        })
                            .then((notifications) => {
                                expect(notifications.length).to.equal(3);
                                return Notifications.remove({
                                    objectType: 'user-groups',
                                    objectId: UserGroups.ObjectID(id)
                                });
                            })
                            .then((count) => {
                                groupsToClear.push('testPutJoinPublicGroupAddUser');
                                expect(count).to.equal(3);
                                done();
                                clearTimeout(ct);
                            });
                    }, 2000);
                })
                .catch((err) => {
                    groupsToClear.push('testPutJoinPublicGroupAddUser');
                    done(err);
                });
        });
    });
    describe('PUT /user-groups/{id}/leave', () => {
        it('should send back not found error when you try to join a non existent group', (done) => {
            let request = {
                method: 'PUT',
                url: '/user-groups/54c894fe1d1d4ab4032ed94e/leave',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    groupsToClear.push('testUserGroupPutLeaveNotFound');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testUserGroupPutLeaveNotFound');
                    done(err);
                });
        });
        it('should send error when you leave a group you are not part of', (done) => {
            let id = '';
            UserGroups.create('testPutLeaveGroupNotPart', 'silver lining', 'test PUT /user-groups/leave', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addOwners(['owner1', 'owner2', 'owner3'], 'test').removeOwners(['test'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/leave',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    groupsToClear.push('testPutLeaveGroupNotPart');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutLeaveGroupNotPart');
                    done(err);
                });
        });
        it('should leave members list and notify the owners', (done) => {
            let id = '';
            UserGroups.create('testPutLeaveGroupAddUser', 'silver lining', 'test PUT /user-groups/leave', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addOwners(['owner1', 'owner2', 'owner3'], 'test').removeOwners(['test'], 'test').addMembers(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/leave',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutLeaveGroupAddUser'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInMembers('one@first.com')).to.be.false;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.action': {$regex: /remove member/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/remove member/);
                })
                .then(() => {
                    var ct = setTimeout(() => {
                        Notifications.find({
                            objectType: 'user-groups',
                            objectId: UserGroups.ObjectID(id),
                            action: 'fyi'
                        })
                            .then((notifications) => {
                                expect(notifications.length).to.equal(3);
                                return Notifications.remove({
                                    objectType: 'user-groups',
                                    objectId: UserGroups.ObjectID(id)
                                });
                            })
                            .then((count) => {
                                groupsToClear.push('testPutLeaveGroupAddUser');
                                expect(count).to.equal(3);
                                done();
                                clearTimeout(ct);
                            });
                    }, 2000);
                })
                .catch((err) => {
                    groupsToClear.push('testPutLeaveGroupAddUser');
                    done(err);
                });
        });
    });
    describe('PUT /user-groups/{id}/approve', () => {
        it('should send back not found error when you try to approve a non existent group', (done) => {
            let request = {
                method: 'PUT',
                url: '/user-groups/54c894fe1d1d4ab4032ed94e/approve',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {}
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    groupsToClear.push('testUserGroupPutApproveNotFound');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testUserGroupPutApproveNotFound');
                    done(err);
                });
        });
        it('should send back error if any of the users being approved to join are not valid', (done) => {
            let id = '';
            UserGroups.create('testGroupUserExistPUTApprove', 'silver lining', 'test PUT /user-groups/approve', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedMembers: ['unknown']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    groupsToClear.push('testGroupUserExistPUTApprove');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testGroupUserExistPUTApprove');
                    done(err);
                });
        });
        it('should add users who have been approved to the members list and cancel the remaining approval notifications for that user only', (done) => {
            let id = '';
            UserGroups.create('testPutApproveGroupAddUser', 'silver lining', 'test PUT /user-groups/approve', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addNeedsApproval(['one@first.com', 'someotherguy'], 'test').addOwners(['owner1', 'owner2', 'owner3'], 'test').removeOwners(['test'], 'test').save();
                })
                .then(() => {
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'silver lining', 'user-groups', UserGroups.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testPutApproveGroupAddUser'}], 'unread', 'approve', 'medium', {join: 'one@first.com'}, 'test');
                })
                .then(() => {
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'silver lining', 'user-groups', UserGroups.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testPutApproveGroupAddUser'}], 'unread', 'approve', 'medium', {join: 'someotherguy'}, 'test');
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedMembers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutApproveGroupAddUser'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInMembers('one@first.com')).to.be.true;
                    expect(ug[0].isPresentInNeedsApproval('someotherguy')).to.be.true;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.action': {$regex: /add member/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/add member/);
                })
                .then(() => {
                    var ct = setTimeout(() => {
                        Notifications.find({
                            objectType: 'user-groups',
                            objectId: UserGroups.ObjectID(id),
                            state: 'cancelled',
                            action: 'approve'
                        }).then((notifications) => {
                            expect(notifications.length).to.equal(3);
                            return Notifications.remove({
                                objectType: 'user-groups',
                                objectId: UserGroups.ObjectID(id)
                            });
                        })
                            .then((count) => {
                                groupsToClear.push('testPutApproveGroupAddUser');
                                //3 cancellations and 3 just approved and 3 pending approval
                                expect(count).to.equal(9);
                                done();
                                clearTimeout(ct);
                            });
                    }, 2000);
                })
                .catch((err) => {
                    groupsToClear.push('testPutApproveGroupAddUser');
                    done(err);
                });
        });
        it('should do nothing if the approved list is empty', (done) => {
            let id = '';
            UserGroups.create('testPutApproveGroupAddUserEmpty', 'silver lining', 'test PUT /user-groups/approve', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addNeedsApproval(['one@first.com', 'someotherguy'], 'test').removeOwners(['test'], 'test').save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedMembers: []
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutApproveGroupAddUserEmpty'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInNeedsApproval('one@first.com')).to.be.true;
                    expect(ug[0].isPresentInNeedsApproval('someotherguy')).to.be.true;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.action': {$regex: /add member/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(0);
                    groupsToClear.push('testPutApproveGroupAddUserEmpty');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutApproveGroupAddUserEmpty');
                    done(err);
                });
        });
        it('should send error if the user approving is not an owner of the list', (done) => {
            let id = '';
            UserGroups.create('testPutApproveGroupNotOwner', 'silver lining', 'test PUT /user-groups/approve', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/approve',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            addedMembers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    return UserGroups.find({name: 'testPutApproveGroupNotOwner'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInMembers('one@first.com')).to.be.false;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.auction': {$regex: /add member/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(0);
                    return tu.findAndLogin('one@first.com', ['readonly']);
                })
                .then(() => {
                    groupsToClear.push('testPutApproveGroupNotOwner');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutApproveGroupNotOwner');
                    done(err);
                });
        });
    });
    describe('PUT /user-groups/{id}/reject', () => {
        it('should send back not found error when you try to reject a non existent group', (done) => {
            let request = {
                method: 'PUT',
                url: '/user-groups/54c894fe1d1d4ab4032ed94e/reject',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {}
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    groupsToClear.push('testUserGroupPutRejectNotFound');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testUserGroupPutRejectNotFound');
                    done(err);
                });
        });
        it('should send back error if any of the users being rejected to join are not valid', (done) => {
            let id = '';
            UserGroups.create('testGroupUserExistPUTReject', 'silver lining', 'test PUT /user-groups/reject', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedMembers: ['unknown']
                        }
                    };
                    server.injectThen(request)
                        .then((response) => {
                            expect(response.statusCode).to.equal(422);
                            groupsToClear.push('testGroupUserExistPUTReject');
                            done();
                        })
                        .catch((err) => {
                            groupsToClear.push('testGroupUserExistPUTReject');
                            done(err);
                        });
                });
        });
        it('should remove users who have been rejected from the needsApproval list and cancel the approval notifications', (done) => {
            let id = '';
            UserGroups.create('testPutRejectGroupAddUser', 'silver lining', 'test PUT /user-groups/reject', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addNeedsApproval(['one@first.com'], 'test').addOwners(['owner1', 'owner2', 'owner3'], 'test').removeOwners(['test'], 'test').save();
                })
                .then(() => {
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'silver lining', 'user-groups', UserGroups.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testPutRejectGroupAddUser'}], 'unread', 'approve', 'medium', {join: 'one@first.com'}, 'test');
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedMembers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutRejectGroupAddUser'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInNeedsApproval('one@first.com')).to.be.false;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.action': {$regex: /remove needsApproval/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/remove needsApproval/);
                })
                .then(() => {
                    var ct = setTimeout(() => {
                        Notifications.find({
                            objectType: 'user-groups',
                            objectId: UserGroups.ObjectID(id),
                            state: 'cancelled',
                            action: 'approve'
                        })
                            .then((notifications) => {
                                expect(notifications.length).to.equal(3);
                                return Notifications.remove({
                                    objectType: 'user-groups',
                                    objectId: UserGroups.ObjectID(id)
                                });
                            })
                            .then((count) => {
                                groupsToClear.push('testPutRejectGroupAddUser');
                                //3 for cancel and 1 for rejection to the user who applied
                                expect(count).to.equal(4);
                                done();
                                clearTimeout(ct);
                            });
                    }, 2000);
                })
                .catch((err) => {
                    groupsToClear.push('testPutRejectGroupAddUser');
                    done(err);
                });
        });
        it('should do nothing when the reject list is empty', (done) => {
            let id = '';
            UserGroups.create('testPutRejectGroupAddUserEmpty', 'silver lining', 'test PUT /user-groups/reject', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addNeedsApproval(['one@first.com'], 'test').removeOwners(['test'], 'test').save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedMembers: []
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.find({name: 'testPutRejectGroupAddUserEmpty'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInNeedsApproval('one@first.com')).to.be.true;
                    return Audit.findAudit('user-groups', ug[0]._id, {'change.action': {$regex: /remove needsApproval/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(0);
                    groupsToClear.push('testPutRejectGroupAddUserEmpty');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutRejectGroupAddUserEmpty');
                    done(err);
                });
        });
        it('should send error if the user rejecting is not an owner of the list', (done) => {
            let id = '';
            UserGroups.create('testPutRejectGroupNotOwner', 'silver lining', 'test PUT /user-groups/reject', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return ug.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/user-groups/' + id + '/reject',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            addedMembers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    return UserGroups.find({name: 'testPutRejectGroupNotOwner'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug[0].isPresentInNeedsApproval('one@first.com')).to.be.true;
                    return tu.findAndLogin('one@first.com', ['readonly']);
                })
                .then(() => {
                    groupsToClear.push('testPutRejectGroupNotOwner');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testPutRejectGroupNotOwner');
                    done(err);
                });
        });
    });
    describe('POST /user-groups', () => {
        it('should send back conflict when you try to create a group with name that already exists', (done) => {
            UserGroups.create('testDupeGroup', 'silver lining', 'test POST /user-groups', 'root')
                .then(() => {
                    let request = {
                        method: 'POST',
                        url: '/user-groups',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            name: 'testDupeGroup',
                            members: ['one@first.com'],
                            owners: ['one@first.com'],
                            description: 'test POST /user-groups'
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(409);
                    groupsToClear.push('testDupeGroup');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testDupeGroup');
                    done(err);
                });
        });
        it('should send back error if any user sent in the request does not exist', (done) => {
            let request = {
                method: 'POST',
                url: '/user-groups',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    name: 'testGroupUserExist',
                    members: ['unknown'],
                    owners: ['madeup'],
                    description: 'test POST /user-groups'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    return UserGroups.findOne({name: 'testGroupUserExist', organisation: 'silver lining'});
                })
                .then((ug) => {
                    expect(ug).to.be.undefined;
                    groupsToClear.push('testGroupUserExist');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testGroupUserExist');
                    done(err);
                });
        });
        it('should create a group with the sender as owner, member and the list of users also sent as members of the group', (done) => {
            let request = {
                method: 'POST',
                url: '/user-groups',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    name: 'testUserGroupCreate',
                    members: ['one@first.com'],
                    owners: ['one@first.com'],
                    description: 'test POST /user-groups'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(201);
                    return UserGroups.findOne({name: 'testUserGroupCreate', organisation: 'silver lining'});
                })
                .then((ug) => {
                    expect(ug).to.exist;
                    expect(ug.isPresentInOwners('one@first.com')).to.be.true;
                    expect(ug.isPresentInMembers('one@first.com')).to.be.true;
                    expect(ug.description).to.match(/test POST/);
                    groupsToClear.push('testUserGroupCreate');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testUserGroupCreate');
                    done(err);
                });
        });
    });
    describe('DELETE /user-groups/{id}', () => {
        it('should send back not found error when you try to modify a non existent group', (done) => {
            let request = {
                method: 'DELETE',
                url: '/user-groups/54c894fe1d1d4ab4032ed94e',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    groupsToClear.push('testUserGroupDeleteNotFound');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testUserGroupDeleteNotFound');
                    done(err);
                });
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', (done) => {
            let id = '';
            UserGroups.create('testDelGroupNotOwner', 'silver lining', 'test POST /user-groups', 'test')
                .then((ug) => {
                    id = ug._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'DELETE',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    groupsToClear.push('testDelGroupNotOwner');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testDelGroupNotOwner');
                    done(err);
                });
        });
        it('should deactivate group and have changes audited', (done) => {
            UserGroups.create('testDelGroup', 'silver lining', 'test POST /user-groups', 'root')
                .then((ug) => {
                    let id = ug._id.toString();
                    let request = {
                        method: 'DELETE',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return UserGroups.findOne({name: 'testDelGroup', organisation: 'silver lining'});
                })
                .then((found) => {
                    expect(found.isActive).to.be.false;
                    groupsToClear.push('testDelGroup');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('testDelGroup');
                    done(err);
                });
        });
    });
    after((done) => {
        return tu.cleanup({userGroups: groupsToClear}, done);
    });
});
/*eslint-enable no-var*/
