'use strict';
let UserGroups = require('./../../../build/server/user-groups/model');
let Notifications = require('./../../../build/server/notifications/model');
let Blogs = require('./../../../build/server/blogs/model');
let Posts = require('./../../../build/server/posts/model');
let Audit = require('./../../../build/server/audit/model');
let _ = require('lodash');
let moment = require('moment');
let Bluebird = require('bluebird');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('Posts', () => {
    let rootAuthHeader = null;
    let server = null;
    let blogsToClear = [];
    let postsToClear = [];
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
    describe('GET /blogs/{blogId}/posts, GET /posts', () => {
        let blogId = null;
        before((done) => {
            let b1 = Blogs.create('test GET /posts1', 'test GET /blogs', null, null, null, null, false, 'public', true, 'test');
            let b2 = Blogs.create('test GET /posts2 is active = false', 'test GET /blogs', ['owner2'], ['contributor2'], ['subscriber2'], ['subscriberGroup2'], false, 'public', true, 'test');
            Bluebird.join(b1, b2)
                .then((b) => {
                    let b11 = b[0];
                    let b21 = b[1];
                    blogId = b11._id;
                    let p1 = Posts.create(b11._id, 'searchByTitle', 'draft', 'public', true, true, ['testing', 'controller testing'], [], 'post', 'p[0]', 'test');
                    let p2 = Posts.create(b11._id, 'searchByTitle2', 'published', 'public', true, true, ['testing', 'controller testing'], [], 'post', 'p[1]', 'test');
                    let p3 = Posts.create(b21._id, 'search3', 'do not publish', 'public', true, true, ['testing', 'search testing'], [], 'post', 'p[2]', 'test');
                    return Bluebird.join(p1, p2, p3);
                })
                .then((p) => {
                    let p1 = p[0];
                    let p2 = p[1];
                    let p3 = p[2];
                    let pubDt = new Date();
                    pubDt.setFullYear(2015, 1, 14);
                    p3.publishedOn = pubDt;
                    p3.__isModified = true;
                    p2.isActive = false;
                    p2.__isModified = true;
                    return Bluebird.join(p1.save(), p2.save(), p3.save(), () => {
                        done();
                    });
                })
                .catch(done);
        });
        it('should give posts when isactive = true is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/posts?isActive="true"',
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
        it('should give inactive posts when isactive = false is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/posts?isActive="false"',
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
        it('should give the posts where the title matches or partially matches the query', (done) => {
            let request = {
                method: 'GET',
                url: '/posts?title=search',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    let patt = /search/i;
                    _.forEach(p.data, (d) => {
                        let match = false;
                        match = match || patt.test(d.title);
                        expect(match).to.be.true;
                    });
                    done();
                })
                .catch(done);
        });
        it('should give the posts where any tag in the post matches or partially matches the query', (done) => {
            let request = {
                method: 'GET',
                url: '/posts?tag=controller',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    let patt = /controller/i;
                    _.forEach(p.data, (d) => {
                        let match = false;
                        _.forEach(d.tags, (t) => {
                            match = match || patt.test(t);
                        });
                        expect(match).to.be.true;
                    });
                    done();
                })
                .catch(done);
        });
        it('should give all posts for a given blog', (done) => {
            let request = {
                method: 'GET',
                url: '/posts?blogId=' + blogId.toString(),
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(d.blogId.toString()).to.equal(blogId.toString());
                    });
                    done();
                })
                .catch(done);
        });
        it('should give all posts for a given blog2', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs/' + blogId.toString() + '/posts?isActive="true"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(d.blogId.toString()).to.equal(blogId.toString());
                    });
                    done();
                })
                .catch(done);
        });
        it('should give all posts for a given blog3', (done) => {
            let request = {
                method: 'GET',
                url: '/posts?blogTitle=GET',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    let patt = /.*GET.*/i;
                    let match = true;
                    _.forEach(p.data, (d) => {
                        match = match && patt.test(d.blog.title);
                    });
                    expect(match).to.be.true;
                    done();
                })
                .catch(done);
        });
        it('should give all posts in a given time period', (done) => {
            let request = {
                method: 'GET',
                url: '/posts?publishedOnBefore=2015-02-15&publishedOnAfter=2015-02-13',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(moment(d.publishedOn).format('YYYYMMDD')).to.equal('20150214');
                    });
                    done();
                })
                .catch(done);
        });
        it('should give all posts in a given time period2', (done) => {
            let request = {
                method: 'GET',
                url: '/posts?publishedOnAfter=2015-02-13',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(moment(d.publishedOn).isAfter('2015-02-13')).to.be.true;
                    });
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test GET /posts1');
            blogsToClear.push('test GET /posts2 is active = false');
            postsToClear.push('searchByTitle');
            postsToClear.push('searchByTitle2');
            postsToClear.push('search3');
            done();
        });
    });
    describe('GET /blogs/{blogId}/posts/{id}, GET /posts/{id}', () => {
        let id = '';
        let blogId = '';
        before((done) => {
            Blogs.create('test GET /blogs/{blogId}/posts/{id}', 'test GET /blogs/id', ['user1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test')
                .then((b) => {
                    blogId = b._id.toString();
                    return Posts.create(b._id, 'GET /posts/{id}', 'draft', 'public', true, true, ['testing', 'controller testing'], [], 'post', 'something to say, something to listen', 'test');
                })
                .then((p) => {
                    id = p._id.toString();
                    done();
                })
                .catch(done);
        });
        it('should only send back post with the id in params', (done) => {
            let request = {
                method: 'GET',
                url: '/posts/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain(id);
                    expect(response.payload).to.contain('something to say, something to listen');
                    done();
                })
                .catch(done);
        });
        it('should only send back post with the id, blogId in params', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs/' + blogId + '/posts/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain(id);
                    expect(response.payload).to.contain('something to say, something to listen');
                    done();
                })
                .catch(done);
        });
        it('should send back not found when the post with the id in params is not found', (done) => {
            let request = {
                method: 'GET',
                url: '/posts/54d4430eed61ad701cc7a721',
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
        it('should send back not found when the post with the blogId, id in params is not found', (done) => {
            let request = {
                method: 'GET',
                url: '/blogs/54d4430eed61ad701cc7a721/posts/54d4430eed61ad701cc7a721',
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
            blogsToClear.push('test GET /blogs/{blogId}/posts/{id}');
            postsToClear.push('GET /posts/{id}');
            done();
        });
    });
    describe('PUT /blogs/{blogId}/posts/{id}, PUT /posts/{id}', () => {
        let blogId = null;
        let postId = null;
        before((done) => {
            Blogs.create('test PUT /blogs/{blogId}/posts/{id}', 'test PUT /posts', [], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    blogId = b._id.toString();
                    return Posts.create(blogId, 'test PUT', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test');
                })
                .then((p) => {
                    postId = p._id.toString();
                    done();
                })
                .catch(done);
        });
        it('should send back not found error when you try to modify non existent posts', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/54d4430eed61ad701cc7a721/posts/54d4430eed61ad701cc7a721',
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
        it('should send back not found error when you try to modify non existent posts', (done) => {
            let request = {
                method: 'PUT',
                url: '/posts/54d4430eed61ad701cc7a721',
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
        it('should send back forbidden error when you try to modify a post of a blog you are not an owner of', (done) => {
            tu.findAndLogin('one@first.com', ['root'])
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId,
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            title: '    test PUT /posts/{id}'
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    done();
                })
                .catch(done);
        });
        it('should activate posts and have changes audited', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/' + blogId + '/posts/' + postId,
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    isActive: false
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].isActive).to.be.false;
                    return Audit.findAudit('posts', found[0]._id, {'change.action': 'isActive'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/isActive/);
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should deactivate posts and have changes audited', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/' + blogId + '/posts/' + postId,
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    isActive: true
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].isActive).to.be.true;
                    return Audit.findAudit('posts', found[0]._id, {'change.action': 'isActive'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/isActive/);
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should add add/remove tags and have changes audited', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/' + blogId + '/posts/' + postId,
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    addedTags: ['add some'],
                    removedTags: ['testing']
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].tags[0]).to.equal('add some');
                    return Audit.findAudit('posts', found[0]._id, {'change.action': {$regex: /tag/}});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/remove/);
                    expect(foundAudit[0].change[1].action).to.match(/add/);
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should update content and have changes persisted on disk', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/' + blogId + '/posts/' + postId,
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    content: 'updated'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].content).to.equal('updated');
                    return Audit.findAudit('posts', found[0]._id, {by: 'root'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/content/);
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should update access, allowComments, needsReview and have changes audited', (done) => {
            let request = {
                method: 'PUT',
                url: '/blogs/' + blogId + '/posts/' + postId,
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    access: 'restricted',
                    allowComments: false,
                    needsReview: false
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].access).to.equal('restricted');
                    expect(found[0].allowComments).to.equal(false);
                    expect(found[0].needsReview).to.equal(false);
                    return Audit.findAudit('posts', found[0]._id, {by: 'root'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.match(/access/);
                    expect(foundAudit[0].change[1].action).to.match(/allowComments/);
                    expect(foundAudit[0].change[2].action).to.match(/needsReview/);
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should give an error if you try to update archived posts', (done) => {
            Posts.findOne({_id: Posts.ObjectID(postId)})
                .then((post) => {
                    post.state = 'archived';
                    post.__isModified = true;
                    return post.save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            content: 'if its archived, its done'
                        }
                    };
                    return server.injectThen(request);
                }).then((response) => {
                    expect(response.statusCode).to.equal(409);
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test PUT /blogs/{blogId}/posts/{id}');
            postsToClear.push('test PUT');
            done();
        });
    });
    describe('PUT /blogs/{blogId}/posts/{id}/publish', () => {
        let blogId = null;
        before((done) => {
            Blogs.create('test PUT /blogs/{blogId}/posts/{id}/publish', 'test PUT /posts', ['one@first.com'], [], ['subscriber1'], ['test Group PUT /blogs/{blogId}/posts/{id}/publish'], false, 'public', true, 'test')
                .then((b) => {
                    blogId = b._id.toString();
                    return UserGroups.create('test Group PUT /blogs/{blogId}/posts/{id}/publish', 'test notifications', 'test');
                })
                .then((ug) => {
                    return ug.removeMembers(['test'], 'test').addMembers(['subscriber1', 'subscriber2'], 'test').save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should publish draft / pending review posts', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT publish', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: u.authheader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('published');
                    return Audit.findAudit('posts', found[0]._id, {by: 'one@first.com'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.equal('state');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    //because the events from the controller may not be complete
                    return Notifications.find({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((count) => {
                    expect(count).to.equal(3);
                    done();
                })
                .catch(done);
        });
        it('should allow root to publish draft / pending review posts', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT publish', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return tu.findAndLogin('root');
                })
                .then((u) => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: u.authheader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('published');
                    return Audit.findAudit('posts', found[0]._id, {by: 'root'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.equal('state');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    //because the events from the controller may not be complete
                    return Notifications.find({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((count) => {
                    expect(count).to.equal(3);
                    done();
                })
                .catch(done);
        });
        it('should fail to publish draft / pending review posts if user is not an owner/contributor of the blog', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT publish', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return Blogs.findOne({_id: Posts.ObjectID(blogId)});
                })
                .then((blog) => {
                    blog.removeOwners(['one@first.com'], 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: u.authheader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('draft');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should move draft to pending review posts if user is contributor, but not owner of the blog', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT publish', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return Blogs.findOne({_id: Posts.ObjectID(blogId)});
                })
                .then((blog) => {
                    blog.removeOwners(['one@first.com'], 'test').addContributors(['one@first.com'], 'test').addOwners(['owner1'], 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: u.authheader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('pending review');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    //because the events from the controller may not be complete
                    return Notifications.find({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(1);
                    return Notifications.remove({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((count) => {
                    expect(count).to.equal(1);
                    done();
                })
                .catch(done);
        });
        it('should move draft to published posts if user is contributor, and needsReview is false', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT publish', 'draft', 'public', true, false, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return Blogs.findOne({_id: Posts.ObjectID(blogId)});
                })
                .then((blog) => {
                    blog.removeOwners(['one@first.com'], 'test').addContributors(['one@first.com'], 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: u.authheader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('published');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    //because the events from the controller may not be complete
                    return Notifications.find({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((count) => {
                    expect(count).to.equal(3);
                    done();
                })
                .catch(done);
        });
        it('should do nothing if the post is already published / archived', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT publish', 'archived', 'restricted', true, true, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return Blogs.findOne({_id: Posts.ObjectID(blogId)});
                })
                .then((blog) => {
                    blog.addOwners(['one@first.com'], 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: u.authheader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('archived');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test PUT /blogs/{blogId}/posts/{id}/publish');
            postsToClear.push('test PUT publish');
            groupsToClear.push('test Group PUT /blogs/{blogId}/posts/{id}/publish');
            done();
        });
    });
    describe('PUT /blogs/{blogId}/posts/{id}/reject', () => {
        let blogId = null;
        before((done) => {
            Blogs.create('test PUT /blogs/{blogId}/posts/{id}/reject', 'test PUT /posts', ['one@first.com'], [], ['subscriber1'], ['test Group PUT /blogs/{blogId}/posts/{id}/reject'], false, 'public', true, 'test')
                .then((b) => {
                    blogId = b._id.toString();
                    return UserGroups.create('test Group PUT /blogs/{blogId}/posts/{id}/reject', 'test notifications', 'test');
                })
                .then((ug) => {
                    return ug.removeMembers(['test'], 'test').addMembers(['subscriber1', 'subscriber2'], 'test').save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should update reject draft / pending review posts and cancel review notifications', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT reject', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return Notifications.create(['one@first.com', 'subscriber1', 'subscriber2'], 'posts', p._id, 'titles dont matter', 'unread', 'review', 'medium', false, 'content is king', 'test');
                })
                .then(() => {
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/reject',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('do not publish');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    return Notifications.find({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId),
                        state: 'cancelled'
                    });
                })
                .then((notifications) => {
                    expect(notifications.length).to.equal(3);
                    return Notifications.remove({
                        objectType: 'posts',
                        objectId: Posts.ObjectID(postId)
                    });
                })
                .then((count) => {
                    expect(count).to.equal(4);//because there is one notification to the author for the rejection as well
                    done();
                })
                .catch(done);
        });
        it('should fail reject draft / pending review posts if user is not an owner of the blog', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT reject', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return Blogs.findOne({_id: Posts.ObjectID(blogId)});
                })
                .then((blog) => {
                    blog.removeOwners(['one@first.com'], 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/reject',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('draft');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should do nothing if the post is already published / archived', (done) => {
            let postId = null;
            Posts.create(blogId, 'test PUT reject', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    return Blogs.findOne({_id: Posts.ObjectID(blogId)});
                })
                .then((blog) => {
                    blog.addOwners(['one@first.com'], 'test').save();
                    return Posts.findOne({_id: Posts.ObjectID(postId)});
                })
                .then((post) => {
                    post.setState('published', 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/reject',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {}
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((found) => {
                    expect(found[0].state).to.equal('published');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test PUT /blogs/{blogId}/posts/{id}/reject');
            postsToClear.push('test PUT reject');
            groupsToClear.push('test Group PUT /blogs/{blogId}/posts/{id}/reject');
            done();
        });
    });
    describe('POST /blogs/{blogId}/posts', () => {
        let blogId = null;
        before((done) => {
            Blogs.create('test POST /blogs/{blogId}/posts', 'test POST /posts', ['one@first.com'], [], [], [], false, 'public', true, 'test')
                .then((blog) => {
                    blogId = blog._id.toString();
                    done();
                })
                .catch(done);
        });
        it('should send back conflict when you try to create a post with a title that you just created', (done) => {
            Posts.create(blogId, 'test POST unique', 'draft', 'public', true, true, ['testing'], [], 'post', 'content', 'test')
                .then(() => {
                    let request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            title: 'test POST unique',
                            state: 'draft',
                            content: 'something. anything will do.',
                            contentType: 'post',
                            tags: ['testing'],
                            attachments: []
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(409);
                    postsToClear.push('test POST unique');
                    done();
                })
                .catch((err) => {
                    postsToClear.push('test POST unique');
                    done(err);
                });
        });
        it('should not allow you to create a post if you are not an owner / contributor to the blog', (done) => {
            Blogs.findOne({_id: Posts.ObjectID(blogId)})
                .then((blog) => {
                    blog.removeOwners(['one@first.com'], 'test').removeContributors(['one@first.com'], 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            title: 'test POST blog owner',
                            state: 'draft',
                            content: 'something. anything will do.',
                            contentType: 'post',
                            tags: ['testing'],
                            attachments: []
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    return Posts.find({title: 'test POST blog owner'});
                })
                .then((found) => {
                    expect(found.length).to.equal(0);
                    postsToClear.push('test POST blog owner');
                    done();
                }).catch((err) => {
                    postsToClear.push('test POST blog owner');
                    done(err);
                });
        });
        it('should create post successfully, and publish if blog doesnt have needsReview set', (done) => {
            Blogs.findOne({_id: Posts.ObjectID(blogId)})
                .then((blog) => {
                    blog.addContributors(['one@first.com'], 'test').setNeedsReview(false, 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            title: 'test POST needsReview and publish',
                            state: 'published',
                            content: 'something. anything will do.',
                            contentType: 'post',
                            tags: ['testing'],
                            attachments: [],
                            needsReview: false
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({title: 'test POST needsReview and publish'});
                })
                .then((found) => {
                    expect(found.length).to.equal(1);
                    expect(found[0].state).to.equal('published');
                    expect(found[0].content).to.equal('something. anything will do.');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    postsToClear.push('test POST needsReview and publish');
                    done();
                })
                .catch((err) => {
                    postsToClear.push('test POST needsReview and publish');
                    done(err);
                });
        });
        it('should create post successfully, and mark it as pending review if blog has needsReview set', (done) => {
            Blogs.findOne({_id: Posts.ObjectID(blogId)})
                .then((blog) => {
                    blog.removeOwners(['one@first.com'], 'test').addContributors(['one@first.com'], 'test').setNeedsReview(true, 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            title: 'test POST needsReview and pending review',
                            state: 'published',
                            content: 'something. anything will do.',
                            contentType: 'post',
                            tags: ['testing'],
                            attachments: [],
                            needsReview: true
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({title: 'test POST needsReview and pending review'});
                })
                .then((found) => {
                    expect(found.length).to.equal(1);
                    expect(found[0].content).to.equal('something. anything will do.');
                    expect(found[0].state).to.equal('pending review');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    postsToClear.push('test POST needsReview and pending review');
                    done();
                })
                .catch((err) => {
                    postsToClear.push('test POST needsReview and pending review');
                    done(err);
                });
        });
        it('should create post successfully, and mark it as draft if user has marked it as draft irrespective of whether user is owner / needsReview setting', (done) => {
            Blogs.findOne({_id: Posts.ObjectID(blogId)})
                .then((blog) => {
                    blog.removeOwners(['one@first.com'], 'test').addContributors(['one@first.com'], 'test').setNeedsReview(true, 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            title: 'test POST draft',
                            state: 'draft',
                            content: 'something. anything will do.',
                            contentType: 'post',
                            tags: ['testing'],
                            attachments: [],
                            needsReview: true
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({title: 'test POST draft'});
                })
                .then((found) => {
                    expect(found.length).to.equal(1);
                    expect(found[0].content).to.equal('something. anything will do.');
                    expect(found[0].state).to.equal('draft');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    postsToClear.push('test POST draft');
                    done();
                })
                .catch((err) => {
                    postsToClear.push('test POST draft');
                    done(err);
                });
        });
        it('should create post successfully, and mark it as published if creator is an owner of the blog', (done) => {
            Blogs.findOne({_id: Posts.ObjectID(blogId)})
                .then((blog) => {
                    blog.addOwners(['one@first.com'], 'test').removeContributors(['one@first.com'], 'test').setNeedsReview(true, 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            title: 'test POST needsReview, owner and published',
                            state: 'published',
                            content: 'something. anything will do.',
                            contentType: 'post',
                            tags: ['testing'],
                            attachments: [],
                            needsReview: true,
                            access: 'restricted',
                            allowComments: false
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({title: 'test POST needsReview, owner and published'});
                })
                .then((found) => {
                    expect(found.length).to.equal(1);
                    expect(found[0].content).to.equal('something. anything will do.');
                    expect(found[0].state).to.equal('published');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    postsToClear.push('test POST needsReview, owner and published');
                    done();
                })
                .catch((err) => {
                    postsToClear.push('test POST needsReview, owner and published');
                    done(err);
                });
        });
        it('should create post successfully, inherit needsReview, allowComments, access from blog if not passed', (done) => {
            Blogs.findOne({_id: Posts.ObjectID(blogId)})
                .then((blog) => {
                    blog.addOwners(['one@first.com'], 'test').addContributors(['one@first.com'], 'test').setNeedsReview(true, 'test').setAccess('restricted', 'test').setAllowComments(false, 'test').save();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            title: 'test POST needsReview, access, allowComments',
                            state: 'published',
                            content: 'something. anything will do.',
                            contentType: 'post',
                            tags: ['testing'],
                            attachments: []
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({title: 'test POST needsReview, access, allowComments'});
                })
                .then((found) => {
                    expect(found.length).to.equal(1);
                    expect(found[0].needsReview).to.equal(true);
                    expect(found[0].access).to.equal('restricted');
                    expect(found[0].allowComments).to.equal(false);
                    return tu.cleanupAudit();
                })
                .then(() => {
                    postsToClear.push('test POST needsReview, access, allowComments');
                    done();
                })
                .catch((err) => {
                    postsToClear.push('test POST needsReview, access, allowComments');
                    done(err);
                });
        });
        after((done) => {
            blogsToClear.push('test POST /blogs/{blogId}/posts');
            done();
        });
    });
    describe('DELETE /blogs/{blogId}/posts/{id}', () => {
        it('should send back not found error when you try to modify a non existent post', (done) => {
            let request = {
                method: 'DELETE',
                url: '/blogs/54d4430eed61ad701cc7a721/posts/54d4430eed61ad701cc7a721',
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
        it('should send back forbidden error when you try to delete a post from a blog you are not an owner of', (done) => {
            let blogId = '';
            let postId = '';
            Blogs.create('testDelPostNotOwner', 'test DELETE /posts', [], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    blogId = b._id.toString();
                    return Posts.create(b._id, 'DELETE /blogs/{blogId}/posts/{id}', 'draft', 'public', true, true, ['testing', 'controller testing'], [], 'post', 'content', 'test');
                })
                .then((p) => {
                    postId = p._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'DELETE',
                        url: '/blogs/' + blogId + '/posts/' + postId,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    blogsToClear.push('testDelPostNotOwner');
                    postsToClear.push('DELETE /blogs/{blogId}/posts/{id}');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testDelPostNotOwner');
                    postsToClear.push('DELETE /blogs/{blogId}/posts/{id}');
                    done(err);
                });
        });
        it('should deactivate blog and have changes audited', (done) => {
            let blogId = '';
            let postId = '';
            Blogs.create('testDelPost', 'test DELETE /posts', ['one@first.com'], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    blogId = b._id.toString();
                    return Posts.create(b._id, 'success DELETE /blogs/{blogId}/posts/{id}', 'draft', 'public', true, true, ['testing', 'controller testing'], [], 'post', 'content', 'test');
                })
                .then((p) => {
                    postId = p._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'DELETE',
                        url: '/blogs/' + blogId + '/posts/' + postId,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Posts.find({_id: Posts.ObjectID(postId)});
                })
                .then((p) => {
                    expect(p[0].isActive).to.be.false;
                    return Audit.findAudit('posts', p[0]._id, {by: 'one@first.com'});
                })
                .then((a) => {
                    expect(a).to.exist;
                    expect(a[0].change[0].action).to.match(/isActive/);
                    return tu.cleanupAudit();
                })
                .then(() => {
                    blogsToClear.push('testDelPost');
                    postsToClear.push('success DELETE /blogs/{blogId}/posts/{id}');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('testDelPost');
                    postsToClear.push('success DELETE /blogs/{blogId}/posts/{id}');
                    done(err);
                });
        });
    });
    after((done) => {
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear, userGroups: groupsToClear}, done);
    });
});
