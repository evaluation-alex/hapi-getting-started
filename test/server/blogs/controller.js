'use strict';
let Blogs = require('./../../../build/server/blogs/model');
let UserGroups = require('./../../../build/server/user-groups/model');
let Audit = require('./../../../build/server/audit/model');
let Notifications = require('./../../../build/server/notifications/model');
let _ = require('lodash');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('Blogs', () => {
    let rootAuthHeader = null;
    let server = null;
    let blogsToClear = [];
    let groupsToClear = [];
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                rootAuthHeader = res.authheader;
                done();
            })
            .catch(done);
    });
    describe('GET /blogs', () => {
        before((done) => {
            Blogs.create('test GET /blogs is active', 'test GET /blogs', ['owner1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test')
                .then(() => {
                    return Blogs.create('test GET /blogs is active = false', 'test GET /blogs', ['owner2'], ['contributor2'], ['subscriber2'], ['subscriberGroup2'], false, 'public', true, 'test');
                })
                .then((p) => {
                    p.isActive = false;
                    p.__isModified = true;
                    done();
                    return p.save();
                });
        });
        it('should give blogs when isactive = true is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs?isActive="true"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(d.isActive).to.be.true;
                    });
                    done();
                })
                .catch(done);
        });
        it('should give inactive blogs when isactive = false is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs?isActive="false"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(d.isActive).to.be.false;
                    });
                    done();
                })
                .catch(done);
        });
        it('should give the blogs where the user sent is a member of the owners list', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs?owner=owner1',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    let patt = /owner1/i;
                    _.forEach(p.data, (d) => {
                        let match = false;
                        _.find(d.owners, (u) => {
                            match = match || patt.test(u);
                        });
                        expect(match).to.be.true;
                    });
                    done();
                })
                .catch(done);
        });
        it('should return both inactive and active blogs when nothing is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test GET /blogs is active');
            blogsToClear.push('test GET /blogs is active = false');
            done();
        });
    });
    describe('GET /blogs/{id}', () => {
        let id = '';
        before((done) => {
            Blogs.create('test GET /blogs/id', 'test GET /blogs/id', ['user1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test')
                .then((p) => {
                    id = p._id.toString();
                    done();
                });
        });
        it('should only send back blog with the id in params', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.match(/blog/);
                    done();
                })
                .catch(done);
        });
        it('should send back not found when the blog with the id in params is not found', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test GET /blogs/id');
            done();
        });
    });
    describe('PUT /blogs/{id}', () => {
        it('should send back not found error when you try to modify non existent blogs', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {}
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    done();
                })
                .catch(done);
        });
        it('should send back error if any of the users to be added are not valid', (done) => {
            Blogs.create('test PUT /blogs invalidusers', 'test PUT /blogs invalidusers', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedOwners: ['one@first.com', 'bogus']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/bogus/);
                    blogsToClear.push('test PUT /blogs invalidusers');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs invalidusers');
                    done(err);
                });
        });
        it('should send back error if any of the groups to be added are not valid', (done) => {
            Blogs.create('test PUT /blogs invalidgroups', 'test PUT /blogs invalidgroups', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscriberGroups: ['bogus']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/bogus/);
                    blogsToClear.push('test PUT /blogs invalidgroups');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs invalidgroups');
                    done(err);
                });
        });
        it('should send back forbidden error when you try to modify a blog you are not an owner of', (done) => {
            let id = '';
            Blogs.create('testPutBlogNotOwner', 'test PUT /blogs not owner', [], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            description: '    test PUT /blogs'
                        }
                    };
                    return server.injectThen(request);
                }).then((response) => {
                    expect(response.statusCode).to.equal(401);
                    blogsToClear.push('testPutBlogNotOwner');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutBlogNotOwner');
                    done(err);
                });
        });
        it('should activate blogs and have changes audited', (done) => {
            let id = '';
            Blogs.create('test PUT /blogs isActive=true', 'test PUT /blogs isActive=true', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    p.isActive = false;
                    p.__isModified = true;
                    id = p._id.toString();
                    return p.save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
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
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((found) => {
                    expect(found[0].isActive).to.be.true;
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': 'isActive'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/isActive/);
                    blogsToClear.push('test PUT /blogs isActive=true');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs isActive=true');
                    done(err);
                });
        });
        it('should deactivate blogs and have changes audited', (done) => {
            let id = '';
            Blogs.create('test PUT /blogs isActive=false', 'test PUT /blogs isActive=false', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    id = p._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            isActive: false
                        }
                    };
                    return server.injectThen(request);
                }).then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((found) => {
                    expect(found[0].isActive).to.be.false;
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': 'isActive'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/isActive/);
                    blogsToClear.push('test PUT /blogs isActive=false');
                    done();
                }).catch((err) => {
                    blogsToClear.push('test PUT /blogs isActive=false');
                    done(err);
                });
        });
        it('should add subscriber / subscriber groups and have changes audited', (done) => {
            let id = '';
            UserGroups.create('testBlogsAddGroup', 'test PUT /blogs', 'test')
                .then(() => {
                    return Blogs.create('test PUT /blogs add subscribers and subscriber groups', 'test PUT /blogs add subscribers and subscriber groups', [], [], [], [], false, 'public', true, 'test');
                })
                .then((p) => {
                    id = p._id.toString();
                    let request = {
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
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((found) => {
                    expect(found[0].subscribers[1]).to.equal('one@first.com');
                    expect(found[0].subscriberGroups[0]).to.equal('testBlogsAddGroup');
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': {$regex: /add/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/add/);
                    expect(foundAudit[0].change[1].action).to.match(/add/);
                    blogsToClear.push('test PUT /blogs add subscribers and subscriber groups');
                    groupsToClear.push('testBlogsAddGroup');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs add subscribers and subscriber groups');
                    groupsToClear.push('testBlogsAddGroup');
                    done(err);
                });
        });
        it('should remove subscribers / subscriber groups and have changes audited', (done) => {
            let id = '';
            Blogs.create('test PUT /blogs remove subscribers and sub groups', 'test PUT /blogs remove subscribers and sub groups', [], [], ['toRemove'], ['toRemove'], false, 'public', true, 'test')
                .then((p) => {
                    id = p._id.toString();
                    let request = {
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
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((found) => {
                    expect(found[0].subscribers.length).to.equal(0);
                    expect(found[0].subscriberGroups.length).to.equal(0);
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': {$regex: /remove/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/remove/);
                    expect(foundAudit[0].change[0].action).to.match(/remove/);
                    blogsToClear.push('test PUT /blogs remove subscribers and sub groups');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs remove subscribers and sub groups');
                    done(err);
                });
        });
        it('should add/remove subscribers / owners and have changes audited and notifications sent to owners', (done) => {
            let id = '';
            Blogs.create('test PUT /blogs add remove subscribers and owners', 'test PUT /blogs add remove subscribers and owners', ['one@first.com'], [], ['root'], [], false, 'public', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    expect(b.isPresentInSubscribers('root')).to.be.true;
                    expect(b.isPresentInOwners('one@first.com')).to.be.true;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            removedOwners: ['one@first.com'],
                            removedSubscribers: ['root'],
                            addedOwners: ['root'],
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'test PUT /blogs add remove subscribers and owners'});
                })
                .then((b2) => {
                    expect(b2).to.exist;
                    expect(b2[0].isPresentInSubscribers('root')).to.be.false;
                    expect(b2[0].isPresentInOwners('one@first.com')).to.be.false;
                    expect(b2[0].isPresentInOwners('root')).to.be.true;
                    expect(b2[0].isPresentInSubscribers('one@first.com')).to.be.true;
                    return Audit.findAudit('blogs', b2[0]._id, {'change.action': {$regex: /add|remove/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/add|remove/);
                    expect(foundAudit[0].change[1].action).to.match(/add|remove/);
                    expect(foundAudit[0].change[2].action).to.match(/add|remove/);
                    expect(foundAudit[0].change[3].action).to.match(/add|remove/);
                })
                .then(() => {
                    return Notifications.find({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id)
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(1);
                    expect(notifications[0].content.owners.added.length).to.equal(1);
                    expect(notifications[0].content.owners.removed.length).to.equal(1);
                    expect(notifications[0].content.subscribers.added.length).to.equal(1);
                    expect(notifications[0].content.subscribers.removed.length).to.equal(1);
                    return Notifications.remove({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id)
                    });
                })
                .then((count) => {
                    blogsToClear.push('test PUT /blogs add remove subscribers and owners');
                    expect(count).to.equal(1);
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs add remove subscribers and owners');
                    done(err);
                });
        });
        it('should update description and have changes audited', (done) => {
            let id = '';
            Blogs.create('test PUT /blogs update desc', 'test PUT /blogs update desc', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    id = p._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            description: 'updated'
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((found) => {
                    expect(found[0].description).to.equal('updated');
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': {$regex: /description/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/description/);
                    blogsToClear.push('test PUT /blogs update desc');
                    blogsToClear.push('updated');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs update desc');
                    blogsToClear.push('updated');
                    done(err);
                });
        });
        it('should update access and have changes audited', (done) => {
            let id = '';
            Blogs.create('test PUT /blogs access', 'test PUT /blogs access', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    id = p._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((found) => {
                    expect(found[0].access).to.equal('restricted');
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': {$regex: /access/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/access/);
                    blogsToClear.push('test PUT /blogs access');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs update access');
                    done(err);
                });
        });
        it('should update needsReview and have changes audited', (done) => {
            let id = '';
            Blogs.create('test PUT /blogs needsReview', 'test PUT /blogs needsReview', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    id = p._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            needsReview: true
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((found) => {
                    expect(found[0].needsReview).to.equal(true);
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': {$regex: /needsReview/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/needsReview/);
                    blogsToClear.push('test PUT /blogs needsReview');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs needsReview');
                    done(err);
                });
        });
        it('should update allowComments and have changes audited', (done) => {
            let id = '';
            Blogs.create('test PUT /blogs allowComments', 'test PUT /blogs allowComments', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    id = p._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            allowComments: false
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((found) => {
                    expect(found[0].allowComments).to.equal(false);
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': {$regex: /allowComments/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/allowComments/);
                    blogsToClear.push('test PUT /blogs allowComments');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test PUT /blogs allowComments');
                    done(err);
                });
        });
    });
    describe('PUT /blogs/{id}/subscribe', () => {
        it('should send back not found error when you try to join a non existent blog', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/join',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {}
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    blogsToClear.push('testBlogsPutSubscribeNotFound');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testBlogsPutSubscribeNotFound');
                    done(err);
                });
        });
        it('should add user who has joined to the needsApproval list and create notifications for all the owners to approve', (done) => {
            let id = '';
            Blogs.create('testPutSubscribeGroupAddUser', 'test PUT /blogs/subscribe', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/join',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'testPutSubscribeGroupAddUser'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.true;
                    return Audit.findAudit('blogs', b[0]._id, {'change.action': {$regex: /add needsApproval/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/add needsApproval/);
                })
                .then(() => {
                    return Notifications.find({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id),
                        action: 'approve'
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id)
                    });
                })
                .then((count) => {
                    blogsToClear.push('testPutSubscribeGroupAddUser');
                    expect(count).to.equal(3);
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutSubscribeGroupAddUser');
                    done(err);
                });
        });
        it('should add to members if the group access is public and have changes audited and notifications sent to owners as fyi', (done) => {
            let id = '';
            Blogs.create('testPutSubscribePublicGroupAddUser', 'test PUT /blogs/subscribe', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/join',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'testPutSubscribePublicGroupAddUser'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.true;
                    return Audit.findAudit('blogs', b[0]._id, {'change.action': {$regex: /add subscriber/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/add subscriber/);
                })
                .then(() => {
                    return Notifications.find({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id),
                        action: 'fyi'
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id)
                    });
                })
                .then((count) => {
                    blogsToClear.push('testPutSubscribePublicGroupAddUser');
                    expect(count).to.equal(3);
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutSubscribePublicGroupAddUser');
                    done(err);
                });
        });
    });
    describe('PUT /blogs/{id}/unsubscribe', () => {
        it('should send back not found error when you try to leave a non existent blog', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/leave',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {}
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    blogsToClear.push('testBlogsPutUnSubscribeNotFound');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testBlogsPutUnSubscribeNotFound');
                    done(err);
                });
        });
        it('should send an error when user leaving is not a subscriber', (done) => {
            let id = '';
            Blogs.create('testPutUnSubscribeGroupNotPart', 'test PUT /blogs/unsubscribe', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/leave',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    blogsToClear.push('testPutUnSubscribeGroupNotPart');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutUnSubscribeGroupNotPart');
                    done(err);
                });
        });
        it('should remove user from subscribers list and create notifications for all the owners', (done) => {
            let id = '';
            Blogs.create('testPutUnSubscribeGroupAddUser', 'test PUT /blogs/unsubscribe', ['owner1', 'owner2', 'owner3'], [], ['one@first.com'], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/leave',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'testPutUnSubscribeGroupAddUser'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.false;
                    return Audit.findAudit('blogs', b[0]._id, {'change.action': {$regex: /remove subscriber/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/remove subscriber/);
                })
                .then(() => {
                    return Notifications.find({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id),
                        action: 'fyi'
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id)
                    });
                })
                .then((count) => {
                    blogsToClear.push('testPutUnSubscribeGroupAddUser');
                    expect(count).to.equal(3);
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutUnSubscribeGroupAddUser');
                    done(err);
                });
        });
    });
    describe('PUT /blogs/{id}/approve', () => {
        it('should send back not found error when you try to approve a non existent blog', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/approve',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    addedSubscribers: ['unknown']
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    blogsToClear.push('testBlogsPutApproveNotFound');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testBlogsPutApproveNotFound');
                    done(err);
                });
        });
        it('should send back error if any of the users being approved to subscribe are not valid', (done) => {
            let id = '';
            Blogs.create('testBlogUserExistPUTApprove', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['unknown']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    blogsToClear.push('testBlogUserExistPUTApprove');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testBlogUserExistPUTApprove');
                    done(err);
                });
        });
        it('should add users who have been approved to the subscribers list and cancel the approval notifications for that user only', (done) => {
            let id = '';
            Blogs.create('testBlogPutApproveAddUser', 'test PUT /blogs/approve', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com', 'someotherguytoo'], 'test').save();
                })
                .then(() => {
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'blogs', Blogs.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testBlogPutApproveAddUser'}], 'unread', 'approve', 'medium', false, {join: 'one@first.com'}, 'test');
                })
                .then(() => {
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'blogs', Blogs.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testBlogPutApproveAddUser'}], 'unread', 'approve', 'medium', false, {join: 'someotherguytoo'}, 'test');
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'testBlogPutApproveAddUser'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.true;
                    expect(b[0].isPresentInNeedsApproval('someotherguytoo')).to.be.true;
                    return Audit.findAudit('blogs', b[0]._id, {'change.action': {$regex: /add subscriber/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/add subscriber/);
                })
                .then(() => {
                    return Notifications.find({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id),
                        state: 'cancelled',
                        action: 'approve'
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id)
                    });
                })
                .then((count) => {
                    blogsToClear.push('testBlogPutApproveAddUser');
                    //3 cancellations and 3 just approved and 3 pending approval
                    expect(count).to.equal(9);
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testBlogPutApproveAddUser');
                    done(err);
                });
        });
        it('should do nothing if the approved list is empty', (done) => {
            let id = '';
            Blogs.create('testBlogPutApproveAddUserEmpty', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com', 'someotherguytoo'], 'test').save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: []
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'testBlogPutApproveAddUserEmpty'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.true;
                    expect(b[0].isPresentInNeedsApproval('someotherguytoo')).to.be.true;
                    return Audit.findAudit('blogs', b[0]._id, {'change.action': {$regex: /add subscriber/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(0);
                    blogsToClear.push('testBlogPutApproveAddUserEmpty');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testBlogPutApproveAddUserEmpty');
                    done(err);
                });
        });
        it('should send error if the user approving is not an owner of the blog', (done) => {
            let id = '';
            Blogs.create('testPutApproveBlogNotOwner', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/approve',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    return Blogs.find({title: 'testPutApproveBlogNotOwner'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.false;
                    return Audit.findAudit('blogs', b[0]._id, {'change.action': {$regex: /add subscriber/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(0);
                    return tu.findAndLogin('one@first.com', ['readonly']);
                })
                .then(() => {
                    blogsToClear.push('testPutApproveBlogNotOwner');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutApproveBlogNotOwner');
                    done(err);
                });
        });
    });
    describe('PUT /blogs/{id}/reject', () => {
        it('should send back not found error when you try to reject a non existent blog', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/reject',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    addedSubscribers: ['unknown']
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    blogsToClear.push('testBlogPutRejectNotFound');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testBlogPutRejectNotFound');
                    done(err);
                });
        });
        it('should send back error if any of the users being rejected to join are not valid', (done) => {
            let id = '';
            Blogs.create('testBlogUserExistPUTReject', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['unknown']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    blogsToClear.push('testBlogUserExistPUTReject');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testBlogUserExistPUTReject');
                    done(err);
                });
        });
        it('should remove users who have been rejected from the needsApproval list and cancel the approval notifications', (done) => {
            let id = '';
            Blogs.create('testPutRejectBlogAddUser', 'test PUT /blogs/reject', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'blogs', Blogs.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testPutRejectBlogAddUser'}], 'unread', 'approve', 'medium', false, {join: 'one@first.com'}, 'test');
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'testPutRejectBlogAddUser'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.false;
                    return Audit.findAudit('blogs', b[0]._id, {'change.action': {$regex: /remove needsApproval/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/remove needsApproval/);
                })
                .then(() => {
                    return Notifications.find({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id),
                        state: 'cancelled',
                        action: 'approve'
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'blogs',
                        objectId: Blogs.ObjectID(id)
                    });
                })
                .then((count) => {
                    blogsToClear.push('testPutRejectBlogAddUser');
                    //3 cancellations and 1 to the user rejected
                    expect(count).to.equal(4);
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutRejectBlogAddUser');
                    done(err);
                });
        });
        it('should do nothing if the reject list is empty', (done) => {
            let id = '';
            Blogs.create('testPutRejectBlogAddUserEmpty', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: []
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'testPutRejectBlogAddUserEmpty'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.true;
                    return Audit.findAudit('blogs', b[0]._id, {'change.action': {$regex: /remove needsApproval/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit.length).to.equal(0);
                    blogsToClear.push('testPutRejectBlogAddUserEmpty');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutRejectBlogAddUserEmpty');
                    done(err);
                });
        });
        it('should send error if the user rejecting is not an owner of the blog', (done) => {
            let id = '';
            Blogs.create('testPutRejectBlogNotOwner', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/reject',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com']
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    return Blogs.find({title: 'testPutRejectBlogNotOwner'});
                })
                .then((b) => {
                    expect(b).to.exist;
                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.true;
                    return tu.findAndLogin('one@first.com', ['readonly']);
                })
                .then(() => {
                    blogsToClear.push('testPutRejectBlogNotOwner');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testPutRejectBlogNotOwner');
                    done(err);
                });
        });
    });
    describe('POST /blogs', () => {
        it('should send back conflict when you try to create a blog with a title that already exists', (done) => {
            Blogs.create('test POST /blogs dupe', 'test POST /blogs dupe', [], [], [], [], false, 'public', true, 'test')
                .then(() => {
                    let request = {
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
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(409);
                    blogsToClear.push('test POST /blogs dupe');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test POST /blogs dupe');
                    done(err);
                });
        });
        it('should send back error if any user sent in the request does not exist', (done) => {
            let request = {
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
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/unknown/);
                    blogsToClear.push('test POST /blogs invalid owner');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test POST /blogs invalid owner');
                    done(err);
                });
        });
        it('should send back error if any group sent in the request does not exist', (done) => {
            let request = {
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
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/madeup/);
                    blogsToClear.push('test POST /blogs invalidgroup');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test POST /blogs invalidgroup');
                    done(err);
                });
        });
        it('should create blog successfully', (done) => {
            UserGroups.create('test post /blogs', 'success', 'test')
                .then(() => {
                    let request = {
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
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({title: 'test post /blogs success'});
                })
                .then((found) => {
                    expect(found).to.exist;
                    expect(found.length).to.equal(1);
                    expect(found[0].description).to.equal('test post /blogs sucess');
                    expect(found[0].title).to.equal('test post /blogs success');
                    return Audit.findAudit('blogs', found[0]._id, {'change.action': 'create'});
                })
                .then((fa) => {
                    expect(fa.length).to.equal(1);
                    groupsToClear.push('test post /blogs');
                    blogsToClear.push('test post /blogs success');
                    done();
                })
                .catch((err) => {
                    groupsToClear.push('test post /blogs');
                    blogsToClear.push('test post /blogs success');
                    done(err);
                });
        });
    });
    describe('DELETE /blogs/{id}', () => {
        it('should send back not found error when you try to modify a non existent blog', (done) => {
            let request = {
                method: 'DELETE',
                url: '/blogs/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    done();
                })
                .catch(done);
        });
        it('should send back forbidden error when you try to delete a blog you are not an owner of', (done) => {
            let id = '';
            Blogs.create('testDelBlogNotOwner', 'test DELETE /blogs', [], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'DELETE',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    blogsToClear.push('testDelBlogNotOwner');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testDelBlogNotOwner');
                    done(err);
                });
        });
        it('should deactivate blog and have changes audited', (done) => {
            let id = '';
            Blogs.create('test DELETE /blogs/id', 'test DELETE /blogs/id', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    id = p._id.toString();
                    let request = {
                        method: 'DELETE',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Blogs.find({_id: Blogs.ObjectID(id)});
                })
                .then((p2) => {
                    expect(p2[0].isActive).to.be.false;
                    return Audit.findAudit('blogs', p2[0]._id, {'change.action': 'isActive'});
                })
                .then((a) => {
                    expect(a).to.exist;
                    expect(a[0].change[0].action).to.match(/isActive/);
                    blogsToClear.push('test DELETE /blogs/id');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('test DELETE /blogs/id');
                    done(err);
                });
        });
    });
    after((done) => {
        return tu.cleanup({userGroups: groupsToClear, blogs: blogsToClear}, done);
    });
});
