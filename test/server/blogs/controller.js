'use strict';
var relativeToServer = './../../../server/';

var Users = require(relativeToServer + 'users/model');
var Blogs = require(relativeToServer + 'blogs/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Audit = require(relativeToServer + 'audit/model');
var Notifications = require(relativeToServer + 'users/notifications/model');
var _ = require('lodash');
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

describe('Blogs', function () {
    var rootAuthHeader = null;
    var server = null;
    var blogsToClear = [];
    var groupsToClear = [];
    beforeEach(function (done) {
        tu.setupServer()
            .then(function (res) {
                server = res.server;
                rootAuthHeader = res.authheader;
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });

    describe('GET /blogs', function () {
        before(function (done) {
            Blogs.create('test GET /blogs is active', 'silver lining', 'test GET /blogs', ['owner1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test')
                .then(function () {
                    return Blogs.create('test GET /blogs is active = false', 'silver lining', ['owner2'], ['contributor2'], ['subscriber2'], ['subscriberGroup2'], false, 'public', true, 'test');
                })
                .then(function (p) {
                    p.isActive = false;
                    p.save();
                    done();
                });
        });
        it('should give blogs when isactive = true is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs?isActive="true"',
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
        it('should give inactive blogs when isactive = false is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs?isActive="false"',
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
        it('should give the blogs where the user sent is a member of the owners list', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs?owner=owner1',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    var patt = /owner1/i;
                    _.forEach(p.data, function (d) {
                        var match = false;
                        _.find(d.owners, function (u) {
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
        it('should return both inactive and active blogs when nothing is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs',
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
            blogsToClear.push('test GET /blogs is active');
            blogsToClear.push('test GET /blogs is active = false');
            done();
        });
    });

    describe('GET /blogs/{id}', function () {
        var id = '';
        before(function (done) {
            Blogs.create('test GET /blogs/id', 'silver lining', 'test GET /blogs/id', ['user1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test')
                .then(function (p) {
                    id = p._id.toString();
                    done();
                });
        });
        it('should only send back blog with the id in params', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.match(/blog/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back not found when the blog with the id in params is not found', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs/54d4430eed61ad701cc7a721',
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
            blogsToClear.push('test GET /blogs/id');
            done();
        });
    });

    describe('PUT /blogs/{id}', function () {
        it('should send back not found error when you try to modify non existent blogs', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/54d4430eed61ad701cc7a721',
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
            Blogs.create('test PUT /blogs invalidusers', 'silver lining', 'test PUT /blogs invalidusers', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedOwners: ['one@first.com', 'bogus']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            expect(response.payload).to.match(/bogus/);
                            blogsToClear.push('test PUT /blogs invalidusers');
                            done();
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs invalidusers');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should send back error if any of the groups to be added are not valid', function (done) {
            Blogs.create('test PUT /blogs invalidgroups', 'silver lining', 'test PUT /blogs invalidgroups', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscriberGroups: ['bogus']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            expect(response.payload).to.match(/bogus/);
                            blogsToClear.push('test PUT /blogs invalidgroups');
                            done();
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs invalidgroups');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should send back forbidden error when you try to modify a blog you are not an owner of', function (done) {
            var request = {};
            var authHeader = '';
            var id = '';
            Blogs.create('testPutBlogNotOwner', 'silver lining', 'test PUT /blogs not owner', [], [], [], [], false, 'public', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (u) {
                    return u.setRoles(['root'], 'test').loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            description: '    test PUT /blogs'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            blogsToClear.push('testPutBlogNotOwner');
                            done();
                        } catch (err) {
                            blogsToClear.push('testPutBlogNotOwner');
                            done(err);
                        }
                    });
                });
        });
        it('should activate blogs and have changes audited', function (done) {
            Blogs.create('test PUT /blogs isActive=true', 'silver lining', 'test PUT /blogs isActive=true', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    p.isActive = false;
                    p.save();
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
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
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].isActive).to.be.true();
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': 'isActive'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/isActive/);
                                    blogsToClear.push('test PUT /blogs isActive=true');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs isActive=true');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should deactivate blogs and have changes audited', function (done) {
            Blogs.create('test PUT /blogs isActive=false', 'silver lining', 'test PUT /blogs isActive=false', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
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
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].isActive).to.be.false();
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': 'isActive'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/isActive/);
                                    blogsToClear.push('test PUT /blogs isActive=false');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs isActive=false');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should add subscriber / subscriber groups and have changes audited', function (done) {
            UserGroups.create('testBlogsAddGroup', 'silver lining', 'test PUT /blogs', 'test')
                .then(function () {
                    return Blogs.create('test PUT /blogs add subscribers and subscriber groups', 'silver lining', 'test PUT /blogs add subscribers and subscriber groups', [], [], [], [], false, 'public', true, 'test');
                })
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com'],
                            addedSubscriberGroups: ['testBlogsAddGroup']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].subscribers[1]).to.equal('one@first.com');
                                    expect(found[0].subscriberGroups[0]).to.equal('testBlogsAddGroup');
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /add/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add/);
                                    expect(foundAudit[0].change[1].action).to.match(/add/);
                                    blogsToClear.push('test PUT /blogs add subscribers and subscriber groups');
                                    groupsToClear.push('testBlogsAddGroup');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs add subscribers and subscriber groups');
                            groupsToClear.push('testBlogsAddGroup');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should remove subscribers / subscriber groups and have changes audited', function (done) {
            Blogs.create('test PUT /blogs remove subscribers and sub groups', 'silver lining', 'test PUT /blogs remove subscribers and sub groups', [], [], ['toRemove'], ['toRemove'], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            removedSubscribers: ['toRemove'],
                            removedSubscriberGroups: ['toRemove']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].subscribers.length).to.equal(0);
                                    expect(found[0].subscriberGroups.length).to.equal(0);
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /remove/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/remove/);
                                    expect(foundAudit[0].change[0].action).to.match(/remove/);
                                    blogsToClear.push('test PUT /blogs remove subscribers and sub groups');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs remove subscribers and sub groups');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should update description and have changes audited', function (done) {
            Blogs.create('test PUT /blogs update desc', 'silver lining', 'test PUT /blogs update desc', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
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
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].description).to.equal('updated');
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /description/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/description/);
                                    blogsToClear.push('test PUT /blogs update desc');
                                    blogsToClear.push('updated');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs update desc');
                            blogsToClear.push('updated');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should update access and have changes audited', function (done) {
            Blogs.create('test PUT /blogs access', 'silver lining', 'test PUT /blogs access', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].access).to.equal('restricted');
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /access/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/access/);
                                    blogsToClear.push('test PUT /blogs access');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs update access');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should update needsReview and have changes audited', function (done) {
            Blogs.create('test PUT /blogs needsReview', 'silver lining', 'test PUT /blogs needsReview', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            needsReview: true
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].needsReview).to.equal(true);
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /needsReview/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/needsReview/);
                                    blogsToClear.push('test PUT /blogs needsReview');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs needsReview');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should update allowComments and have changes audited', function (done) {
            Blogs.create('test PUT /blogs allowComments', 'silver lining', 'test PUT /blogs allowComments', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            allowComments: false
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].allowComments).to.equal(false);
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /allowComments/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/allowComments/);
                                    blogsToClear.push('test PUT /blogs allowComments');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs allowComments');
                            done(err);
                        }
                    });
                })
                .done();
        });
    });

    describe('PUT /blogs/{id}/subscribe', function () {
        it('should send back not found error when you try to join a non existent blog', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/join',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    blogsToClear.push('testBlogsPutSubscribeNotFound');
                    done();
                } catch (err) {
                    blogsToClear.push('testBlogsPutSubscribeNotFound');
                    done(err);
                }
            });
        });
        it('should add user who has joined to the needsApproval list and create notifications for all the owners to approve', function (done) {
            var request = {};
            var id = '';
            Blogs.create('testPutSubscribeGroupAddUser', 'silver lining', 'test PUT /blogs/subscribe', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/join',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({title: 'testPutSubscribeGroupAddUser'})
                                .then(function (b) {
                                    expect(b).to.exist();
                                    expect(b[0]._isMemberOf('needsApproval', 'one@first.com')).to.be.true();
                                    return Audit.findAudit('blogs', 'testPutSubscribeGroupAddUser', {'change.action': {$regex: /add needsApproval/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add needsApproval/);
                                })
                                .then(function () {
                                    var ct = setTimeout(function () {
                                        Notifications._find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            action: 'approve'
                                        })
                                            .then(function (notifications) {
                                                expect(notifications.length).to.equal(3);
                                                Notifications.remove({
                                                    objectType: 'blogs',
                                                    objectId: Blogs.ObjectID(id)
                                                }, function (err, count) {
                                                    blogsToClear.push('testPutSubscribeGroupAddUser');
                                                    if (err) {
                                                        done(err);
                                                    } else {
                                                        expect(count).to.equal(3);
                                                        done();
                                                    }
                                                });
                                                clearTimeout(ct);
                                            });
                                    }, 1000);
                                });
                        } catch (err) {
                            blogsToClear.push('testPutSubscribeGroupAddUser');
                            done(err);
                        }
                    });
                });
        });
        it('should add to members if the group access is public and have changes audited and notifications sent to owners as fyi', function (done) {
            var request = {};
            var id = '';
            Blogs.create('testPutSubscribePublicGroupAddUser', 'silver lining', 'test PUT /blogs/subscribe', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'public', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/join',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({title: 'testPutSubscribePublicGroupAddUser'})
                                .then(function (b) {
                                    expect(b).to.exist();
                                    expect(b[0]._isMemberOf('subscribers', 'one@first.com')).to.be.true();
                                    return Audit.findAudit('blogs', 'testPutSubscribePublicGroupAddUser', {'change.action': {$regex: /add subscriber/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add subscriber/);
                                })
                                .then(function () {
                                    var ct = setTimeout(function () {
                                        Notifications._find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            action: 'fyi'
                                        })
                                            .then(function (notifications) {
                                                expect(notifications.length).to.equal(3);
                                                Notifications.remove({
                                                    objectType: 'blogs',
                                                    objectId: Blogs.ObjectID(id)
                                                }, function (err, count) {
                                                    blogsToClear.push('testPutSubscribePublicGroupAddUser');
                                                    if (err) {
                                                        done(err);
                                                    } else {
                                                        expect(count).to.equal(3);
                                                        done();
                                                    }
                                                });
                                                clearTimeout(ct);
                                            });
                                    }, 1000);
                                });
                        } catch (err) {
                            blogsToClear.push('testPutSubscribePublicGroupAddUser');
                            done(err);
                        }
                    });
                });
        });
    });

    describe('PUT /blogs/{id}/approve', function () {
        it('should send back not found error when you try to approve a non existent blog', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/approve',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    blogsToClear.push('testBlogsPutApproveNotFound');
                    done();
                } catch (err) {
                    blogsToClear.push('testBlogsPutApproveNotFound');
                    done(err);
                }
            });
        });
        it('should send back error if any of the users being approved to subscribe are not valid', function (done) {
            var id = '';
            Blogs.create('testBlogUserExistPUTApprove', 'silver lining', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['unknown']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            blogsToClear.push('testBlogUserExistPUTApprove');
                            done();
                        } catch (err) {
                            blogsToClear.push('testBlogUserExistPUTApprove');
                            done(err);
                        }
                    });
                });
        });
        it('should add users who have been approved to the subscribers list and cancel the remaining notifications', function (done) {
            var request = {};
            var id = '';
            Blogs.create('testBlogPutApproveAddUser', 'silver lining', 'test PUT /blogs/approve', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    return b.add(['one@first.com'], 'needApprovals', 'test').save();
                })
                .then(function () {
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'silver lining', 'blogs', Blogs.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testBlogPutApproveAddUser'}], 'unread', 'approve', 'medium', {join: 'one@first.com'}, 'test');
                })
                .then(function () {
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({title: 'testBlogPutApproveAddUser'})
                                .then(function (b) {
                                    expect(b).to.exist();
                                    expect(b[0]._isMemberOf('subscribers', 'one@first.com')).to.be.true();
                                    return Audit.findAudit('blogs', 'testBlogPutApproveAddUser', {'change.action': {$regex: /add subscriber/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add subscriber/);
                                })
                                .then(function () {
                                    var ct = setTimeout(function () {
                                        Notifications._find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            state: 'cancelled',
                                            action: 'approve'
                                        }).then(function (notifications) {
                                            expect(notifications.length).to.equal(3);
                                            Notifications.remove({
                                                objectType: 'blogs',
                                                objectId: Blogs.ObjectID(id)
                                            }, function (err, count) {
                                                blogsToClear.push('testBlogPutApproveAddUser');
                                                if (err) {
                                                    done(err);
                                                } else {
                                                    //3 cancellations and 3 approval
                                                    expect(count).to.equal(6);
                                                    done();
                                                }
                                            });
                                            clearTimeout(ct);
                                        });
                                    }, 1000);
                                });
                        } catch (err) {
                            blogsToClear.push('testBlogPutApproveAddUser');
                            done(err);
                        }
                    });
                });
        });
        it('should send error if the user approving is not an owner of the blog', function (done) {
            var request = {};
            var id = '';
            Blogs.create('testPutApproveBlogNotOwner', 'silver lining', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    return b.add(['one@first.com'], 'needApprovals', 'test').save();
                })
                .then(function () {
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (u) {
                    return u.setRoles(['root'], 'test').loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/approve',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            u.setRoles(['readonly'], 'test').save();
                            expect(response.statusCode).to.equal(401);
                            Blogs._find({title: 'testPutApproveBlogNotOwner'})
                                .then(function (b) {
                                    expect(b).to.exist();
                                    expect(b[0]._isMemberOf('subscribers', 'one@first.com')).to.be.false();
                                    return Audit.findAudit('blogs', 'testPutApproveBlogNotOwner', {'change.action': {$regex: /add subscriber/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(0);
                                    blogsToClear.push('testPutApproveBlogNotOwner');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('testPutApproveBlogNotOwner');
                            done(err);
                        }
                    });
                });
        });
    });

    describe('PUT /blogs/{id}/reject', function () {
        it('should send back not found error when you try to reject a non existent blog', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/reject',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    blogsToClear.push('testBlogPutRejectNotFound');
                    done();
                } catch (err) {
                    blogsToClear.push('testBlogPutRejectNotFound');
                    done(err);
                }
            });
        });
        it('should send back error if any of the users being rejected to join are not valid', function (done) {
            var id = '';
            Blogs.create('testBlogUserExistPUTReject', 'silver lining', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['unknown']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            blogsToClear.push('testBlogUserExistPUTReject');
                            done();
                        } catch (err) {
                            blogsToClear.push('testBlogUserExistPUTReject');
                            done(err);
                        }
                    });
                });
        });
        it('should remove users who have been rejected from the needsApproval list and cancel the approval notifications', function (done) {
            var request = {};
            var id = '';
            Blogs.create('testPutRejectBlogAddUser', 'silver lining', 'test PUT /blogs/reject', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    return b.add(['one@first.com'], 'needsApproval', 'test').save();
                })
                .then(function () {
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'silver lining', 'blogs', Blogs.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testPutRejectBlogAddUser'}], 'unread', 'approve', 'medium', {join: 'one@first.com'}, 'test');
                })
                .then(function () {
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({title: 'testPutRejectBlogAddUser'})
                                .then(function (b) {
                                    expect(b).to.exist();
                                    expect(b[0]._isMemberOf('needsApproval', 'one@first.com')).to.be.false();
                                    return Audit.findAudit('blogs', 'testPutRejectBlogAddUser', {'change.action': {$regex: /remove needsApproval/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/remove needsApproval/);
                                })
                                .then(function () {
                                    var ct = setTimeout(function () {
                                        Notifications._find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            state: 'cancelled',
                                            action: 'approve'
                                        })
                                            .then(function (notifications) {
                                                expect(notifications.length).to.equal(3);
                                                Notifications.remove({
                                                    objectType: 'blogs',
                                                    objectId: Blogs.ObjectID(id)
                                                }, function (err, count) {
                                                    blogsToClear.push('testPutRejectBlogAddUser');
                                                    if (err) {
                                                        done(err);
                                                    } else {
                                                        //3 cancellations and 1 to the user rejected
                                                        expect(count).to.equal(4);
                                                        done();
                                                    }
                                                });
                                                clearTimeout(ct);
                                            });
                                    }, 1000);
                                });
                        } catch (err) {
                            blogsToClear.push('testPutRejectBlogAddUser');
                            done(err);
                        }
                    });
                });
        });
        it('should send error if the user rejecting is not an owner of the blog', function (done) {
            var request = {};
            var id = '';
            Blogs.create('testPutRejectBlogNotOwner', 'silver lining', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    return b.add(['one@first.com'], 'needsApproval', 'test').save();
                })
                .then(function () {
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (u) {
                    return u.setRoles(['root'], 'test').loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/reject',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            u.setRoles(['readonly'], 'test').save();
                            expect(response.statusCode).to.equal(401);
                            Blogs._find({title: 'testPutRejectBlogNotOwner'})
                                .then(function (b) {
                                    expect(b).to.exist();
                                    expect(b[0]._isMemberOf('needsApproval', 'one@first.com')).to.be.true();
                                    blogsToClear.push('testPutRejectBlogNotOwner');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('testPutRejectBlogNotOwner');
                            done(err);
                        }
                    });
                });
        });
    });

    describe('POST /blogs', function () {
        it('should send back conflict when you try to create a blog with a title that already exists', function (done) {
            Blogs.create('test POST /blogs dupe', 'silver lining', 'test POST /blogs dupe', [], [], [], [], false, 'public', true, 'test')
                .then(function () {
                    var request = {
                        method: 'POST',
                        url: '/blogs',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            title: 'test POST /blogs dupe',
                            description: 'test POST /blogs dupe',
                            owners: [],
                            contributors: [],
                            subscribers: [],
                            subscriberGroups: []
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(409);
                            blogsToClear.push('test POST /blogs dupe');
                            done();
                        } catch (err) {
                            blogsToClear.push('test POST /blogs dupe');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should send back error if any user sent in the request does not exist', function (done) {
            var request = {
                method: 'POST',
                url: '/blogs',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    title: 'test POST /blogs invalid owner',
                    description: 'test POST /blogs invalid owner',
                    owners: ['unknown'],
                    contributors: [],
                    subscribers: [],
                    subscriberGroups: []
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/unknown/);
                    blogsToClear.push('test POST /blogs invalid owner');
                    done();
                } catch (err) {
                    blogsToClear.push('test POST /blogs invalid owner');
                    done(err);
                }
            });
        });
        it('should send back error if any group sent in the request does not exist', function (done) {
            var request = {
                method: 'POST',
                url: '/blogs',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    title: 'test POST /blogs invalidgroup',
                    description: 'test POST /blogs invalidgroup',
                    owners: [],
                    contributors: [],
                    subscribers: [],
                    subscriberGroups: ['madeup']
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/madeup/);
                    blogsToClear.push('test POST /blogs invalidgroup');
                    done();
                } catch (err) {
                    blogsToClear.push('test POST /blogs invalidgroup');
                    done(err);
                }
            });
        });
        it('should create blog successfully', function (done) {
            UserGroups.create('test post /blogs', 'silver lining', 'success', 'test')
                .then(function () {
                    var request = {
                        method: 'POST',
                        url: '/blogs',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            title: 'test post /blogs success',
                            description: 'test post /blogs sucess',
                            owners: ['one@first.com'],
                            contributors: [],
                            subscribers: [],
                            subscriberGroups: ['test post /blogs']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Blogs._find({title: 'test post /blogs success'})
                                .then(function (found) {
                                    expect(found).to.exist();
                                    expect(found.length).to.equal(1);
                                    expect(found[0].description).to.equal('test post /blogs sucess');
                                    expect(found[0].title).to.equal('test post /blogs success');
                                    return Audit.findAudit('blogs', 'test post /blogs success', {'change.action': 'create'});
                                })
                                .then(function (fa) {
                                    expect(fa.length).to.equal(1);
                                    groupsToClear.push('test post /blogs');
                                    blogsToClear.push('test post /blogs success');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('test post /blogs');
                            blogsToClear.push('test post /blogs success');
                            done(err);
                        }
                    });
                })
                .done();
        });
    });

    describe('DELETE /blogs/{id}', function () {
        it('should send back not found error when you try to modify a non existent blog', function (done) {
            var request = {
                method: 'DELETE',
                url: '/blogs/54d4430eed61ad701cc7a721',
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
        it('should send back forbidden error when you try to delete a blog you are not an owner of', function (done) {
            var request = {};
            var authHeader = '';
            var id = '';
            Blogs.create('testDelBlogNotOwner', 'silver lining', 'test DELETE /blogs', [], [], [], [], false, 'public', true, 'test')
                .then(function (b) {
                    id = b._id.toString();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (u) {
                    return u.setRoles(['root'], 'test').loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'DELETE',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            blogsToClear.push('testDelBlogNotOwner');
                            done();
                        } catch (err) {
                            blogsToClear.push('testDelBlogNotOwner');
                            done(err);
                        }
                    });
                });
        });
        it('should deactivate blog and have changes audited', function (done) {
            Blogs.create('test DELETE /blogs/id', 'silver lining', 'test DELETE /blogs/id', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'DELETE',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (p) {
                                    expect(p[0].isActive).to.be.false;
                                    return Audit.findAudit('blogs', p[0].title, {'change.action': 'isActive'});
                                })
                                .then(function (a) {
                                    expect(a).to.exist();
                                    expect(a[0].change[0].action).to.match(/isActive/);
                                    blogsToClear.push('test DELETE /blogs/id');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test DELETE /blogs/id');
                            done(err);
                        }
                    });
                }).done();
        });
    });

    afterEach(function (done) {
        return tu.cleanup({userGroups: groupsToClear, blogs: blogsToClear}, done);
    });

});

