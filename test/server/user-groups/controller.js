'use strict';
var relativeToServer = './../../../server/';

var Users = require(relativeToServer + 'users/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
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
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('UserGroups', function () {
    var rootAuthHeader = null;
    var server = null;
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
                return root.loginSuccess('test', 'test')._save();
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

    describe('GET /user-groups', function () {
        before(function (done) {
            UserGroups.create('GetUserGroupsTestName', 'GET /user-groups', 'root')
                .then(function () {
                    return UserGroups.create('GetUserGroupsTestMemberActive', 'GET /user-groups', 'root');
                })
                .then(function (g2) {
                    return g2.add(['user1', 'user2'], 'member', 'root')._save();
                })
                .then(function () {
                    return UserGroups.create('GetUserGroupsTestMemberInactive', 'GET /user-groups', 'root');
                })
                .then(function (g3) {
                    return g3.add(['user4'], 'member', 'root')._save();
                })
                .then(function () {
                    return UserGroups.create('GetUserGroupsTestInactive', 'GET /user-groups', 'root');
                })
                .then(function (g4) {
                    return g4.deactivate('root')._save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
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
        after(function (done) {
            groupsToClear.push('GetUserGroupsTestName');
            groupsToClear.push('GetUserGroupsTestMemberActive');
            groupsToClear.push('GetUserGroupsTestMemberInactive');
            groupsToClear.push('GetUserGroupsTestInactive');
            done();
        });
    });

    describe('GET /user-groups/{id}', function () {
        var id = '';
        before(function (done) {
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
                url: '/user-groups/' + id.replace('a', '0').replace('b', '0').replace('c', '0').replace('d', '0').replace('e', '0').replace('f', '0'),
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
            groupsToClear.push('testGetByID');
            done();
        });
    });

    describe('PUT /user-groups/{id}', function () {
        it('should send back not found error when you try to modify a non existent group', function (done) {
            var request = {
                method: 'PUT',
                url: '/user-groups/54c894fe1d1d4ab4032ed94e',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    groupsToClear.push('testUserGroupPutNotFound');
                    done();
                } catch (err) {
                    groupsToClear.push('testUserGroupPutNotFound');
                    done(err);
                }
            });
        });
        it('should send back error if any of the users or owners to be added are not valid', function (done) {
            var id = '';
            UserGroups.create('testGroupUserExistPUT', 'test PUT /user-groups', 'test')
                .then(function (ug) {
                    id = ug._id.toString();
                    var request = {
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
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            groupsToClear.push('testGroupUserExistPUT');
                            done();
                        } catch (err) {
                            groupsToClear.push('testGroupUserExistPUT');
                            done(err);
                        }
                    });
                });
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', function (done) {
            var request = {};
            var authHeader = '';
            var id = '';
            UserGroups.create('testPutGroupNotOwner', 'test PUT /user-groups', 'test')
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
                    authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            description: '    test PUT /user-groups'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            groupsToClear.push('testPutGroupNotOwner');
                            done();
                        } catch (err) {
                            groupsToClear.push('testPutGroupNotOwner');
                            done(err);
                        }
                    });
                });
        });
        it('should deactivate group and have changes audited', function (done) {
            var request = {};
            var id = '';
            UserGroups.create('testPutGroupDeActivate', 'test PUT /user-groups', 'test')
                .then(function (ug) {
                    id = ug._id.toString();
                    request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            isActive: false
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            UserGroups._find({name: 'testPutGroupDeActivate'})
                                .then(function (ug) {
                                    expect(ug).to.exist();
                                    expect(ug[0].isActive).to.be.false();
                                    return Audit.findAudit('UserGroups', 'testPutGroupDeActivate', {action: 'isActive'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/isActive/);
                                    groupsToClear.push('testPutGroupDeActivate');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('testPutGroupDeActivateActivate');
                            done(err);
                        }
                    });
                });
        });
        it('should activate group and have changes audited', function (done) {
            var request = {};
            var id = '';
            UserGroups.create('testPutGroupActivate', 'test PUT /user-groups', 'test')
                .then(function (ug) {
                    id = ug._id.toString();
                    ug.isActive = false;
                    return ug._save();
                })
                .then(function () {
                    request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            isActive: true
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            UserGroups._find({name: 'testPutGroupActivate'})
                                .then(function (ug) {
                                    expect(ug).to.exist();
                                    expect(ug[0].isActive).to.be.true();
                                    return Audit.findAudit('UserGroups', 'testPutGroupActivate', {action: 'isActive'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/isActive/);
                                    groupsToClear.push('testPutGroupActivate');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('testPutGroupActivate');
                            done(err);
                        }
                    });
                });
        });
        it('should add users / owners and have changes audited', function (done) {
            var request = {};
            var id = '';
            UserGroups.create('testPutGroupAddUserOwner', 'test PUT /user-groups', 'test')
                .then(function (ug) {
                    id = ug._id.toString();
                    request = {
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
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            UserGroups._find({name: 'testPutGroupAddUserOwner'})
                                .then(function (ug) {
                                    expect(ug).to.exist();
                                    expect(ug[0].isMember('one@first.com')).to.be.true();
                                    expect(ug[0].isOwner('root')).to.be.true();
                                    return Audit.findAudit('UserGroups', 'testPutGroupAddUserOwner', {action: {$regex: /add member/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/add member/);
                                    return Audit.findAudit('UserGroups', 'testPutGroupAddUserOwner', {action: {$regex: /add owner/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/add owner/);
                                    groupsToClear.push('testPutGroupAddUserOwner');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('testPutGroupAddUserOwner');
                            done(err);
                        }
                    });
                });
        });
        it('should remove members / owners and have changes audited', function (done) {
            var request = {};
            var id = '';
            UserGroups.create('testPutGroupRemoveUserOwner', 'test PUT /user-groups', 'test')
                .then(function (ug) {
                    id = ug._id.toString();
                    ug.members.push('root');
                    ug.owners.push('one@first.com');
                    return ug._save();
                })
                .then(function (ug) {
                    expect(ug.isMember('root')).to.be.true();
                    expect(ug.isOwner('one@first.com')).to.be.true();
                    request = {
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
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            UserGroups._find({name: 'testPutGroupRemoveUserOwner'})
                                .then(function (ug) {
                                    expect(ug).to.exist();
                                    expect(ug[0].isMember('root')).to.be.false();
                                    expect(ug[0].isOwner('one@first.com')).to.be.false();
                                    return Audit.findAudit('UserGroups', 'testPutGroupRemoveUserOwner', {action: {$regex: /remove member/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/remove member/);
                                    return Audit.findAudit('UserGroups', 'testPutGroupRemoveUserOwner', {action: {$regex: /remove owner/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/remove owner/);
                                    groupsToClear.push('testPutGroupRemoveUserOwner');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('testPutGroupRemoveUserOwner');
                            done(err);
                        }
                    });
                });
        });
        it('should update description and have changes audited', function (done) {
            var request = {};
            var id = '';
            UserGroups.create('testPutGroupChangeDesc', 'test PUT /user-groups', 'test')
                .then(function (ug) {
                    id = ug._id.toString();
                    request = {
                        method: 'PUT',
                        url: '/user-groups/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            description: 'new description'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            UserGroups._find({name: 'testPutGroupChangeDesc'})
                                .then(function (ug) {
                                    expect(ug).to.exist();
                                    expect(ug[0].description).to.equal('new description');
                                    return Audit.findAudit('UserGroups', 'testPutGroupChangeDesc', {action: {$regex: /change desc/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/change desc/);
                                    groupsToClear.push('testPutGroupChangeDesc');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('testPutGroupChangeDesc');
                            done(err);
                        }
                    });
                });
        });
    });

    describe('POST /user-groups', function () {
        it('should send back conflict when you try to create a group with name that already exists', function (done) {
            UserGroups.create('testDupeGroup', 'test POST /user-groups', 'root')
                .then(function () {
                    var request = {
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
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(409);
                            groupsToClear.push('testDupeGroup');
                            done();
                        } catch (err) {
                            groupsToClear.push('testDupeGroup');
                            done(err);
                        }
                    });
                });
        });
        it('should send back error if any user sent in the request does not exist', function (done) {
            var request = {
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
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(422);
                    UserGroups.findByName('testGroupUserExist')
                        .then(function (ug) {
                            expect(ug).to.be.false();
                            groupsToClear.push('testGroupUserExist');
                            done();
                        });
                } catch (err) {
                    groupsToClear.push('testGroupUserExist');
                    done(err);
                }
            });
        });
        it('should create a group with the sender as owner, member and the list of users also sent as members of the group', function (done) {
            var request = {
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
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(201);
                    UserGroups.findByName('testUserGroupCreate')
                        .then(function (ug) {
                            expect(ug).to.exist();
                            expect(ug.isOwner('one@first.com')).to.be.true();
                            expect(ug.isMember('one@first.com')).to.be.true();
                            expect(ug.description).to.match(/test POST/);
                            groupsToClear.push('testUserGroupCreate');
                            done();
                        });
                } catch (err) {
                    groupsToClear.push('testUserGroupCreate');
                    done(err);
                }
            });
        });
    });

    describe('DELETE /user-groups/{id}', function () {
        it('should send back not found error when you try to modify a non existent group', function (done) {
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
                    groupsToClear.push('testUserGroupDeleteNotFound');
                    done();
                } catch (err) {
                    groupsToClear.push('testUserGroupDeleteNotFound');
                    done(err);
                }
            });
        });
        it('should send back forbidden error when you try to modify a group you are not an owner of', function (done) {
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
                    authHeader = tu.authorizationHeader(u);
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
                            groupsToClear.push('testDelGroupNotOwner');
                            done();
                        } catch (err) {
                            groupsToClear.push('testDelGroupNotOwner');
                            done(err);
                        }
                    });
                });
        });
        it('should deactivate group and have changes audited', function (done) {
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
                                    groupsToClear.push('testDelGroup');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('testDelGroup');
                            done(err);
                        }
                    });
                });
        });
    });

    afterEach(function (done) {
        return tu.cleanup({userGroups: groupsToClear}, done);
    });

});

