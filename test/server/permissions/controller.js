'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Users = require(relativeToServer + 'users/model');
var Permissions = require(relativeToServer + 'permissions/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Audit = require(relativeToServer + 'audit/model');
var _ = require('lodash');
var Promise = require('bluebird');
var BaseModel = require('hapi-mongo-models').BaseModel;
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
        after(function (done) {
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
            var request = {
                method: 'PUT',
                url: '/permissions/54d4430eed61ad701cc7a721',
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
        it('should send back error if any of the users to be added are not valid', function (done) {
            Permissions.create('test PUT /permissions invalidusers', [], [], 'action3', 'object3', 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/permissions/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedUsers: ['one@first.com', 'bogus']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            expect(response.payload).to.match(/bogus/);
                            permissionsToClear.push('test PUT /permissions invalidusers');
                            done();
                        } catch (err) {
                            permissionsToClear.push('test PUT /permissions invalidusers');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should send back error if any of the groups to be added are not valid', function (done) {
            Permissions.create('test PUT /permissions invalidgroups', [], [], 'action4', 'object4', 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/permissions/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedGroups: ['bogus']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            expect(response.payload).to.match(/bogus/);
                            permissionsToClear.push('test PUT /permissions invalidgroups');
                            done();
                        } catch (err) {
                            permissionsToClear.push('test PUT /permissions invalidgroups');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should activate permissions and have changes audited', function (done) {
            Permissions.create('test PUT /permissions isActive=true', [], [], 'action5', 'object5', 'test')
                .then(function (p) {
                    p.isActive = false;
                    p._save();
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/permissions/' + id,
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
                            Permissions._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].isActive).to.be.true();
                                    return Audit.findAudit('Permissions', BaseModel.ObjectID(id), {action: 'isActive'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/isActive/);
                                    permissionsToClear.push('test PUT /permissions isActive=true');
                                    done();
                                });
                        } catch (err) {
                            permissionsToClear.push('test PUT /permissions isActive=true');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should deactivate permissions and have changes audited', function (done) {
            Permissions.create('test PUT /permissions isActive=false', [], [], 'action6', 'object6', 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/permissions/' + id,
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
                            Permissions._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].isActive).to.be.false();
                                    return Audit.findAudit('Permissions', BaseModel.ObjectID(id), {action: 'isActive'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/isActive/);
                                    permissionsToClear.push('test PUT /permissions isActive=false');
                                    done();
                                });
                        } catch (err) {
                            permissionsToClear.push('test PUT /permissions isActive=false');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should add users / groups and have changes audited', function (done) {
            UserGroups.create('testPermissionsAddGroup', 'test PUT /permissions', 'test')
                .then(function (u) {
                    return Permissions.create('test PUT /permissions add users and groups', [], [], 'action6', 'object6', 'test');
                })
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/permissions/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedUsers: ['one@first.com'],
                            addedGroups: ['testPermissionsAddGroup']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Permissions._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].users[0]).to.equal('one@first.com');
                                    expect(found[0].groups[0]).to.equal('testPermissionsAddGroup');
                                    return Audit.findAudit('Permissions', BaseModel.ObjectID(id), {action: {$regex: /add/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(2);
                                    expect(foundAudit[0].action).to.match(/add/);
                                    expect(foundAudit[1].action).to.match(/add/);
                                    permissionsToClear.push('test PUT /permissions add users and groups');
                                    groupsToClear.push('testPermissionsAddGroup');
                                    done();
                                });
                        } catch (err) {
                            permissionsToClear.push('test PUT /permissions add users and groups');
                            groupsToClear.push('testPermissionsAddGroup');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should remove users / groups and have changes audited', function (done) {
            Permissions.create('test PUT /permissions remove users and groups', ['toRemove'], ['toRemove'], 'action7', 'object7', 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/permissions/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            removedUsers: ['toRemove'],
                            removedGroups: ['toRemove']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Permissions._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].users.length).to.equal(0);
                                    expect(found[0].groups.length).to.equal(0);
                                    return Audit.findAudit('Permissions', BaseModel.ObjectID(id), {action: {$regex: /remove/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(2);
                                    expect(foundAudit[0].action).to.match(/remove/);
                                    expect(foundAudit[1].action).to.match(/remove/);
                                    permissionsToClear.push('test PUT /permissions remove users and groups');
                                    done();
                                });
                        } catch (err) {
                            permissionsToClear.push('test PUT /permissions remove users and groups');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should update description and have changes audited', function (done) {
            Permissions.create('test PUT /permissions update desc', [], [], 'action8', 'object8', 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/permissions/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            description: 'updated'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Permissions._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].description).to.equal('updated');
                                    return Audit.findAudit('Permissions', BaseModel.ObjectID(id), {action: {$regex: /change desc/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/change desc/);
                                    permissionsToClear.push('test PUT /permissions update desc');
                                    permissionsToClear.push('updated');
                                    done();
                                });
                        } catch (err) {
                            permissionsToClear.push('test PUT /permissions update desc');
                            permissionsToClear.push('updated');
                            done(err);
                        }
                    });
                })
                .done();
        });
    });

    describe('POST /permissions/{id}', function () {
        it('should send back conflict when you try to create a permission with object, action that already exists', function (done) {
            Permissions.create('test POST /permissions dupe', [], [], 'action9', 'object9', 'test')
                .then(function (p) {
                    var request = {
                        method: 'POST',
                        url: '/permissions',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            description: 'test POST /permissions dupe',
                            groups: [],
                            users: [],
                            action: 'action9',
                            object: 'object9'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(409);
                            permissionsToClear.push('test POST /permissions dupe');
                            done();
                        } catch (err) {
                            permissionsToClear.push('test POST /permissions dupe');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should send back error if any user sent in the request does not exist', function (done) {
            var request = {
                method: 'POST',
                url: '/permissions',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    description: 'test POST /permissions invaliduser',
                    groups: [],
                    users: ['unknown'],
                    action: 'action10',
                    object: 'object10'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/unknown/);
                    permissionsToClear.push('test POST /permissions invaliduser');
                    done();
                } catch (err) {
                    permissionsToClear.push('test POST /permissions invaliduser');
                    done(err);
                }
            });
        });
        it('should send back error if any group sent in the request does not exist', function (done) {
            var request = {
                method: 'POST',
                url: '/permissions',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    description: 'test POST /permissions invalidgroup',
                    groups: ['madeup'],
                    users: [],
                    action: 'action11',
                    object: 'object11'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/madeup/);
                    permissionsToClear.push('test POST /permissions invalidgroup');
                    done();
                } catch (err) {
                    permissionsToClear.push('test POST /permissions invalidgroup');
                    done(err);
                }
            });
        });
        it('should create permissions successfully', function (done) {
            UserGroups.create('testPerms', 'success', 'test')
                .then(function (u) {
                    var request = {
                        method: 'POST',
                        url: '/permissions',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            description: 'test POST /permissions success',
                            users: ['one@first.com'],
                            groups: ['testPerms'],
                            action: 'action12',
                            object: 'object12'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Permissions._find({description: 'test POST /permissions success'})
                                .then(function (found) {
                                    expect(found).to.exist();
                                    expect(found.length).to.equal(1);
                                    expect(found[0].description).to.equal('test POST /permissions success');
                                    return Audit.findAudit('Permissions', found[0]._id, {action: 'create'});
                                })
                                .then(function (fa) {
                                    expect(fa.length).to.equal(1);
                                    groupsToClear.push('testPerms');
                                    permissionsToClear.push('test POST /permissions success');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('testPerms');
                            permissionsToClear.push('test POST /permissions success');
                            done(err);
                        }
                    });
                })
                .done();
        });
    });

    describe('DELETE /permissions/{id}', function () {
        it('should send back not found error when you try to modify a non existent permissions', function (done) {
            var request = {
                method: 'DELETE',
                url: '/permissions/54d4430eed61ad701cc7a721',
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
        it('should deactivate permissions and have changes audited', function (done) {
            Permissions.create('test DELETE /permissions/id', ['user1'], ['group1'], 'action2', 'object3')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'DELETE',
                        url: '/permissions/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Permissions._find({_id: BaseModel.ObjectID(id)})
                                .then(function (p) {
                                    expect(p[0].isActive).to.be.false;
                                    return Audit.findAudit('Permissions', BaseModel.ObjectID(id), {action: 'isActive'});
                                })
                                .then(function (a) {
                                    expect(a).to.exist();
                                    expect(a[0].action).to.match(/isActive/);
                                    permissionsToClear.push('test DELETE /permissions/id');
                                    done();
                                });
                        } catch (err) {
                            permissionsToClear.push('test DELETE /permissions/id');
                            done(err);
                        }
                    });
                }).done();
        });
    });

    afterEach(function (done) {
        return tu.cleanup(null, groupsToClear, permissionsToClear, done);
    });

});

