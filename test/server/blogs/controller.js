'use strict';
let relativeToServer = './../../../server/';
let Blogs = require(relativeToServer + 'blogs/model');
let UserGroups = require(relativeToServer + 'user-groups/model');
let Audit = require(relativeToServer + 'audit/model');
let Notifications = require(relativeToServer + 'users/notifications/model');
let _ = require('lodash');
let tu = require('./../testutils');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Blogs', () => {
    let rootAuthHeader = null;
    let server = null;
    let blogsToClear = [];
    let groupsToClear = [];
    before({timeout: 60000000}, (done) => {
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
    describe('GET /blogs', () => {
        before((done) => {
            Blogs.create('test GET /blogs is active', 'silver lining', 'test GET /blogs', ['owner1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test')
                .then(() => {
                    return Blogs.create('test GET /blogs is active = false', 'silver lining', ['owner2'], ['contributor2'], ['subscriber2'], ['subscriberGroup2'], false, 'public', true, 'test');
                })
                .then((p) => {
                    p.isActive = false;
                    p.save();
                    done();
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
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(d.isActive).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give inactive blogs when isactive = false is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs?isActive="false"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(d.isActive).to.be.false();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give the blogs where the user sent is a member of the owners list', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs?owner=owner1',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    let patt = /owner1/i;
                    _.forEach(p.data, (d) => {
                        let match = false;
                        _.find(d.owners, (u) => {
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
        it('should return both inactive and active blogs when nothing is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    done();
                } catch (err) {
                    done(err);
                }
            });
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
            Blogs.create('test GET /blogs/id', 'silver lining', 'test GET /blogs/id', ['user1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test')
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
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.match(/blog/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back not found when the blog with the id in params is not found', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
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
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back error if any of the users to be added are not valid', (done) => {
            Blogs.create('test PUT /blogs invalidusers', 'silver lining', 'test PUT /blogs invalidusers', [], [], [], [], false, 'public', true, 'test')
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
                    server.inject(request, (response) => {
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
        it('should send back error if any of the groups to be added are not valid', (done) => {
            Blogs.create('test PUT /blogs invalidgroups', 'silver lining', 'test PUT /blogs invalidgroups', [], [], [], [], false, 'public', true, 'test')
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
                    server.inject(request, (response) => {
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
        it('should send back forbidden error when you try to modify a blog you are not an owner of', (done) => {
            let request = {};
            let authHeader = '';
            let id = '';
            Blogs.create('testPutBlogNotOwner', 'silver lining', 'test PUT /blogs not owner', [], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    authHeader = u.authheader;
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
                    server.inject(request, (response) => {
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
        it('should activate blogs and have changes audited', (done) => {
            Blogs.create('test PUT /blogs isActive=true', 'silver lining', 'test PUT /blogs isActive=true', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    p.isActive = false;
                    p.save();
                    let id = p._id.toString();
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((found) => {
                                    expect(found[0].isActive).to.be.true();
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': 'isActive'});
                                })
                                .then((foundAudit) => {
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
        it('should deactivate blogs and have changes audited', (done) => {
            Blogs.create('test PUT /blogs isActive=false', 'silver lining', 'test PUT /blogs isActive=false', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((found) => {
                                    expect(found[0].isActive).to.be.false();
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': 'isActive'});
                                })
                                .then((foundAudit) => {
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
        it('should add subscriber / subscriber groups and have changes audited', (done) => {
            UserGroups.create('testBlogsAddGroup', 'silver lining', 'test PUT /blogs', 'test')
                .then(() => {
                    return Blogs.create('test PUT /blogs add subscribers and subscriber groups', 'silver lining', 'test PUT /blogs add subscribers and subscriber groups', [], [], [], [], false, 'public', true, 'test');
                })
                .then((p) => {
                    let id = p._id.toString();
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((found) => {
                                    expect(found[0].subscribers[1]).to.equal('one@first.com');
                                    expect(found[0].subscriberGroups[0]).to.equal('testBlogsAddGroup');
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /add/}});
                                })
                                .then((foundAudit) => {
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
        it('should remove subscribers / subscriber groups and have changes audited', (done) => {
            Blogs.create('test PUT /blogs remove subscribers and sub groups', 'silver lining', 'test PUT /blogs remove subscribers and sub groups', [], [], ['toRemove'], ['toRemove'], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((found) => {
                                    expect(found[0].subscribers.length).to.equal(0);
                                    expect(found[0].subscriberGroups.length).to.equal(0);
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /remove/}});
                                })
                                .then((foundAudit) => {
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
        it('should add/remove subscribers / owners and have changes audited and notifications sent to owners', (done) => {
            let request = {};
            let id = '';
            Blogs.create('test PUT /blogs add remove subscribers and owners', 'silver lining', 'test PUT /blogs add remove subscribers and owners', ['one@first.com'], [], ['root'], [], false, 'public', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    expect(b.isPresentInSubscribers('root')).to.be.true();
                    expect(b.isPresentInOwners('one@first.com')).to.be.true();
                    request = {
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({title: 'test PUT /blogs add remove subscribers and owners'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInSubscribers('root')).to.be.false();
                                    expect(b[0].isPresentInOwners('one@first.com')).to.be.false();
                                    expect(b[0].isPresentInOwners('root')).to.be.true();
                                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.true();
                                    return Audit.findAudit('blogs', 'test PUT /blogs add remove subscribers and owners', {'change.action': {$regex: /add|remove/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add|remove/);
                                    expect(foundAudit[0].change[1].action).to.match(/add|remove/);
                                    expect(foundAudit[0].change[2].action).to.match(/add|remove/);
                                    expect(foundAudit[0].change[3].action).to.match(/add|remove/);
                                })
                                .then(() => {
                                    let ct = setTimeout(() => {
                                        Notifications.find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id)
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
                                            }).then((count) => {
                                                blogsToClear.push('test PUT /blogs add remove subscribers and owners');
                                                expect(count).to.equal(1);
                                                done();
                                                clearTimeout(ct);
                                            });
                                    }, 1000);
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs add remove subscribers and owners');
                            done(err);
                        }
                    });
                });
        });
        it('should update description and have changes audited', (done) => {
            Blogs.create('test PUT /blogs update desc', 'silver lining', 'test PUT /blogs update desc', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((found) => {
                                    expect(found[0].description).to.equal('updated');
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /description/}});
                                })
                                .then((foundAudit) => {
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
        it('should update access and have changes audited', (done) => {
            Blogs.create('test PUT /blogs access', 'silver lining', 'test PUT /blogs access', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((found) => {
                                    expect(found[0].access).to.equal('restricted');
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /access/}});
                                })
                                .then((foundAudit) => {
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
        it('should update needsReview and have changes audited', (done) => {
            Blogs.create('test PUT /blogs needsReview', 'silver lining', 'test PUT /blogs needsReview', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((found) => {
                                    expect(found[0].needsReview).to.equal(true);
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /needsReview/}});
                                })
                                .then((foundAudit) => {
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
        it('should update allowComments and have changes audited', (done) => {
            Blogs.create('test PUT /blogs allowComments', 'silver lining', 'test PUT /blogs allowComments', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((found) => {
                                    expect(found[0].allowComments).to.equal(false);
                                    return Audit.findAudit('blogs', found[0].title, {'change.action': {$regex: /allowComments/}});
                                })
                                .then((foundAudit) => {
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
    describe('PUT /blogs/{id}/subscribe', () => {
        it('should send back not found error when you try to join a non existent blog', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/join',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, (response) => {
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
        it('should add user who has joined to the needsApproval list and create notifications for all the owners to approve', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testPutSubscribeGroupAddUser', 'silver lining', 'test PUT /blogs/subscribe', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/join',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({title: 'testPutSubscribeGroupAddUser'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.true();
                                    return Audit.findAudit('blogs', 'testPutSubscribeGroupAddUser', {'change.action': {$regex: /add needsApproval/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add needsApproval/);
                                })
                                .then(() => {
                                    let ct = setTimeout(() => {
                                        Notifications.find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            action: 'approve'
                                        })
                                            .then((notifications) => {
                                                expect(notifications.length).to.equal(3);
                                                return Notifications.remove({
                                                    objectType: 'blogs',
                                                    objectId: Blogs.ObjectID(id)
                                                });
                                            }).then((count) => {
                                                blogsToClear.push('testPutSubscribeGroupAddUser');
                                                expect(count).to.equal(3);
                                                done();
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
        it('should add to members if the group access is public and have changes audited and notifications sent to owners as fyi', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testPutSubscribePublicGroupAddUser', 'silver lining', 'test PUT /blogs/subscribe', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/join',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({title: 'testPutSubscribePublicGroupAddUser'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.true();
                                    return Audit.findAudit('blogs', 'testPutSubscribePublicGroupAddUser', {'change.action': {$regex: /add subscriber/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add subscriber/);
                                })
                                .then(() => {
                                    let ct = setTimeout(() => {
                                        Notifications.find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            action: 'fyi'
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
    describe('PUT /blogs/{id}/unsubscribe', () => {
        it('should send back not found error when you try to leave a non existent blog', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/leave',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(404);
                    blogsToClear.push('testBlogsPutUnSubscribeNotFound');
                    done();
                } catch (err) {
                    blogsToClear.push('testBlogsPutUnSubscribeNotFound');
                    done(err);
                }
            });
        });
        it('should send an error when user leaving is not a subscriber', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testPutUnSubscribeGroupNotPart', 'silver lining', 'test PUT /blogs/unsubscribe', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/leave',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(401);
                            blogsToClear.push('testPutUnSubscribeGroupNotPart');
                            done();
                        } catch (err) {
                            blogsToClear.push('testPutUnSubscribeGroupNotPart');
                            done(err);
                        }
                    });
                });
        });
        it('should remove user from subscribers list and create notifications for all the owners', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testPutUnSubscribeGroupAddUser', 'silver lining', 'test PUT /blogs/unsubscribe', ['owner1', 'owner2', 'owner3'], [], ['one@first.com'], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/leave',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({title: 'testPutUnSubscribeGroupAddUser'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.false();
                                    return Audit.findAudit('blogs', 'testPutUnSubscribeGroupAddUser', {'change.action': {$regex: /remove subscriber/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/remove subscriber/);
                                })
                                .then(() => {
                                    let ct = setTimeout(() => {
                                        Notifications.find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            action: 'fyi'
                                        })
                                            .then((notifications) => {
                                                expect(notifications.length).to.equal(3);
                                                return Notifications.remove({
                                                    objectType: 'blogs',
                                                    objectId: Blogs.ObjectID(id)
                                                });
                                            }).then((count) => {
                                                blogsToClear.push('testPutUnSubscribeGroupAddUser');
                                                expect(count).to.equal(3);
                                                done();
                                                clearTimeout(ct);
                                            });
                                    }, 1000);
                                });
                        } catch (err) {
                            blogsToClear.push('testPutUnSubscribeGroupAddUser');
                            done(err);
                        }
                    });
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
                }
            };
            server.inject(request, (response) => {
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
        it('should send back error if any of the users being approved to subscribe are not valid', (done) => {
            let id = '';
            Blogs.create('testBlogUserExistPUTApprove', 'silver lining', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
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
                    server.inject(request, (response) => {
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
        it('should add users who have been approved to the subscribers list and cancel the approval notifications for that user only', (done) => {
            let id = '';
            Blogs.create('testBlogPutApproveAddUser', 'silver lining', 'test PUT /blogs/approve', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com', 'someotherguytoo'], 'test').save();
                })
                .then(() => {
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'silver lining', 'blogs', Blogs.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testBlogPutApproveAddUser'}], 'unread', 'approve', 'medium', {join: 'one@first.com'}, 'test');
                })
                .then(() => {
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'silver lining', 'blogs', Blogs.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testBlogPutApproveAddUser'}], 'unread', 'approve', 'medium', {join: 'someotherguytoo'}, 'test');
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({title: 'testBlogPutApproveAddUser'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.true();
                                    expect(b[0].isPresentInNeedsApproval('someotherguytoo')).to.be.true();
                                    return Audit.findAudit('blogs', 'testBlogPutApproveAddUser', {'change.action': {$regex: /add subscriber/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/add subscriber/);
                                })
                                .then(() => {
                                    let ct = setTimeout(() => {
                                        Notifications.find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            state: 'cancelled',
                                            action: 'approve'
                                        }).then((notifications) => {
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
        it('should do nothing if the approved list is empty', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testBlogPutApproveAddUserEmpty', 'silver lining', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com', 'someotherguytoo'], 'test').save();
                })
                .then(() => {
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/approve',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: []
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({title: 'testBlogPutApproveAddUserEmpty'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.true();
                                    expect(b[0].isPresentInNeedsApproval('someotherguytoo')).to.be.true();
                                    return Audit.findAudit('blogs', 'testBlogPutApproveAddUserEmpty', {'change.action': {$regex: /add subscriber/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(0);
                                    blogsToClear.push('testBlogPutApproveAddUserEmpty');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('testBlogPutApproveAddUserEmpty');
                            done(err);
                        }
                    });
                });
        });
        it('should send error if the user approving is not an owner of the blog', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testPutApproveBlogNotOwner', 'silver lining', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
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
                    server.inject(request, (response) => {
                        try {
                            u.user.setRoles(['readonly'], 'test').save();
                            expect(response.statusCode).to.equal(401);
                            Blogs.find({title: 'testPutApproveBlogNotOwner'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInSubscribers('one@first.com')).to.be.false();
                                    return Audit.findAudit('blogs', 'testPutApproveBlogNotOwner', {'change.action': {$regex: /add subscriber/}});
                                })
                                .then((foundAudit) => {
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
    describe('PUT /blogs/{id}/reject', () => {
        it('should send back not found error when you try to reject a non existent blog', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54c894fe1d1d4ab4032ed94e/reject',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, (response) => {
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
        it('should send back error if any of the users being rejected to join are not valid', (done) => {
            let id = '';
            Blogs.create('testBlogUserExistPUTReject', 'silver lining', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
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
                    server.inject(request, (response) => {
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
        it('should remove users who have been rejected from the needsApproval list and cancel the approval notifications', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testPutRejectBlogAddUser', 'silver lining', 'test PUT /blogs/reject', ['owner1', 'owner2', 'owner3'], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['owner1', 'owner2', 'owner3'], 'silver lining', 'blogs', Blogs.ObjectID(id), ['{{title}} has new subscribers that need approval', {title: 'testPutRejectBlogAddUser'}], 'unread', 'approve', 'medium', {join: 'one@first.com'}, 'test');
                })
                .then(() => {
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({title: 'testPutRejectBlogAddUser'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.false();
                                    return Audit.findAudit('blogs', 'testPutRejectBlogAddUser', {'change.action': {$regex: /remove needsApproval/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.match(/remove needsApproval/);
                                })
                                .then(() => {
                                    let ct = setTimeout(() => {
                                        Notifications.find({
                                            objectType: 'blogs',
                                            objectId: Blogs.ObjectID(id),
                                            state: 'cancelled',
                                            action: 'approve'
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
        it('should do nothing if the reject list is empty', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testPutRejectBlogAddUserEmpty', 'silver lining', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + id + '/reject',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: []
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({title: 'testPutRejectBlogAddUserEmpty'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.true();
                                    return Audit.findAudit('blogs', 'testPutRejectBlogAddUserEmpty', {'change.action': {$regex: /remove needsApproval/}});
                                })
                                .then((foundAudit) => {
                                    expect(foundAudit.length).to.equal(0);
                                    blogsToClear.push('testPutRejectBlogAddUserEmpty');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('testPutRejectBlogAddUserEmpty');
                            done(err);
                        }
                    });
                });
        });
        it('should send error if the user rejecting is not an owner of the blog', (done) => {
            let request = {};
            let id = '';
            Blogs.create('testPutRejectBlogNotOwner', 'silver lining', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return b.addNeedsApproval(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
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
                    server.inject(request, (response) => {
                        try {
                            u.user.setRoles(['readonly'], 'test').save();
                            expect(response.statusCode).to.equal(401);
                            Blogs.find({title: 'testPutRejectBlogNotOwner'})
                                .then((b) => {
                                    expect(b).to.exist();
                                    expect(b[0].isPresentInNeedsApproval('one@first.com')).to.be.true();
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
    describe('POST /blogs', () => {
        it('should send back conflict when you try to create a blog with a title that already exists', (done) => {
            Blogs.create('test POST /blogs dupe', 'silver lining', 'test POST /blogs dupe', [], [], [], [], false, 'public', true, 'test')
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
                    server.inject(request, (response) => {
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
            server.inject(request, (response) => {
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
            server.inject(request, (response) => {
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
        it('should create blog successfully', (done) => {
            UserGroups.create('test post /blogs', 'silver lining', 'success', 'test')
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
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Blogs.find({title: 'test post /blogs success'})
                                .then((found) => {
                                    expect(found).to.exist();
                                    expect(found.length).to.equal(1);
                                    expect(found[0].description).to.equal('test post /blogs sucess');
                                    expect(found[0].title).to.equal('test post /blogs success');
                                    return Audit.findAudit('blogs', 'test post /blogs success', {'change.action': 'create'});
                                })
                                .then((fa) => {
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
    describe('DELETE /blogs/{id}', () => {
        it('should send back not found error when you try to modify a non existent blog', (done) => {
            let request = {
                method: 'DELETE',
                url: '/blogs/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back forbidden error when you try to delete a blog you are not an owner of', (done) => {
            let request = {};
            let authHeader = '';
            let id = '';
            Blogs.create('testDelBlogNotOwner', 'silver lining', 'test DELETE /blogs', [], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    id = b._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    authHeader = u.authheader;
                    request = {
                        method: 'DELETE',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, (response) => {
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
        it('should deactivate blog and have changes audited', (done) => {
            Blogs.create('test DELETE /blogs/id', 'silver lining', 'test DELETE /blogs/id', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    let id = p._id.toString();
                    let request = {
                        method: 'DELETE',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs.find({_id: Blogs.ObjectID(id)})
                                .then((p) => {
                                    expect(p[0].isActive).to.be.false;
                                    return Audit.findAudit('blogs', p[0].title, {'change.action': 'isActive'});
                                })
                                .then((a) => {
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
    after((done) => {
        return tu.cleanup({userGroups: groupsToClear, blogs: blogsToClear}, done);
    });
});

