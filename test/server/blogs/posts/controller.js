'use strict';
var relativeToServer = './../../../../server/';

var Users = require(relativeToServer + 'users/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Notifications = require(relativeToServer + 'users/notifications/model');
var Blogs = require(relativeToServer + 'blogs/model');
var Posts = require(relativeToServer + 'blogs/posts/model');
var PostContent = require(relativeToServer + 'blogs/posts/post-content');
var Audit = require(relativeToServer + 'audit/model');
var Config = require(relativeToServer + '../config');
var fs = require('fs');
var _ = require('lodash');
var moment = require('moment');
var Promise = require('bluebird');
var BaseModel = require('hapi-mongo-models').BaseModel;
//var expect = require('chai').expect;
var tu = require('./../../testutils');
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

describe('Posts', function () {
    var rootAuthHeader = null;
    var server = null;
    var blogsToClear = [];
    var postsToClear = [];
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

    describe('GET /blogs/{blogId}/posts, GET /posts', function () {
        var blogId = null;
        before(function (done) {
            var b1 = Blogs.create('test GET /posts1', 'silver lining', 'test GET /blogs', null, null, null, null, false, 'public', true, 'test');
            var b2 = Blogs.create('test GET /posts2 is active = false', 'silver lining', ['owner2'], ['contributor2'], ['subscriber2'], ['subscriberGroup2'], false, 'public', true, 'test');
            Promise.join(b1, b2)
                .then(function (b) {
                    var b1 = b[0];
                    var b2 = b[1];
                    blogId = b1._id;
                    //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
                    var p1 = Posts.create(b1._id, 'silver lining', 'searchByTitle', 'draft', 'public', true, true, 'testing', ['testing', 'controller testing'], [], 'test');
                    var p2 = Posts.create(b1._id, 'silver lining', 'searchByTitle2', 'published', 'public', true, true, 'testing', ['testing', 'controller testing'], [], 'test');
                    var p3 = Posts.create(b2._id, 'silver lining', 'search3', 'do not publish', 'public', true, true, 'testing', ['testing', 'search testing'], [], 'test');
                    return Promise.join(p1, p2, p3);
                })
                .then(function (p) {
                    var p1 = p[0];
                    var p2 = p[1];
                    var p3 = p[2];
                    var pubDt = new Date();
                    pubDt.setFullYear(2015, 1, 14);
                    p3.publishedOn = pubDt;
                    p2.isActive = false;
                    return Promise.join(p1.save(), p2.save(), p3.save(), function (p1, p2, p3) {
                        PostContent.writeContent(p1, 'p[0]');
                        PostContent.writeContent(p2, 'p[1]');
                        PostContent.writeContent(p3, 'p[2]');
                    });
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it('should give posts when isactive = true is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/posts?isActive="true"',
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

        it('should give inactive posts when isactive = false is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/posts?isActive="false"',
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

        it('should give the posts where the title matches or partially matches the query', function (done) {
            var request = {
                method: 'GET',
                url: '/posts?title=search',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    var patt = /search/i;
                    _.forEach(p.data, function (d) {
                        var match = false;
                        match = match || patt.test(d.title);
                        expect(match).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should give the posts where any tag in the post matches or partially matches the query', function (done) {
            var request = {
                method: 'GET',
                url: '/posts?tag=controller',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    var patt = /controller/i;
                    _.forEach(p.data, function (d) {
                        var match = false;
                        _.forEach(d.tags, function (t) {
                            match = match || patt.test(t);
                        });
                        expect(match).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should give all posts for a given blog', function (done) {
            var request = {
                method: 'GET',
                url: '/posts?blogId=' + blogId.toString(),
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(d.blogId.toString()).to.equal(blogId.toString());
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should give all posts for a given blog2', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs/' + blogId.toString() + '/posts?isActive="true"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(d.blogId.toString()).to.equal(blogId.toString());
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should give all posts in a given time period', function (done) {
            var request = {
                method: 'GET',
                url: '/posts?publishedOnBefore=2015-02-15&publishedOnAfter=2015-02-13',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(moment(d.publishedOn).format('YYYYMMDD')).to.equal('20150214');
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should give all posts in a given time period2', function (done) {
            var request = {
                method: 'GET',
                url: '/posts?publishedOnAfter=2015-02-13',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(moment(d.publishedOn).isAfter('2015-02-13')).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        after(function (done) {
            blogsToClear.push('test GET /posts1');
            blogsToClear.push('test GET /posts2 is active = false');
            postsToClear.push('searchByTitle');
            postsToClear.push('searchByTitle2');
            postsToClear.push('search3');
            done();
        });
    });

    describe('GET /blogs/{blogId}/posts/{id}, GET /posts/{id}', function () {
        var id = '';
        var blogId = '';

        before(function (done) {
            Blogs.create('test GET /blogs/{blogId}/posts/{id}', 'silver lining', 'test GET /blogs/id', ['user1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test')
                .then(function (b) {
                    blogId = b._id.toString();
                    //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
                    return Posts.create(b._id, 'silver lining', 'GET /posts/{id}', 'draft', 'public', true, true, 'testing', ['testing', 'controller testing'], [], 'test');
                })
                .then(function (p) {
                    id = p._id.toString();
                    PostContent.writeContent(p, 'something to say, something to listen');
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it('should only send back post with the id in params', function (done) {
            var request = {
                method: 'GET',
                url: '/posts/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain(id);
                    expect(response.payload).to.contain('something to say, something to listen');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should only send back post with the id, blogId in params', function (done) {
            PostContent.resetCache();
            var request = {
                method: 'GET',
                url: '/blogs/' + blogId + '/posts/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain(id);
                    expect(response.payload).to.contain('something to say, something to listen');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should send back not found when the post with the id in params is not found', function (done) {
            var request = {
                method: 'GET',
                url: '/posts/54d4430eed61ad701cc7a721',
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

        it('should send back not found when the post with the blogId, id in params is not found', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs/54d4430eed61ad701cc7a721/posts/54d4430eed61ad701cc7a721',
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
            blogsToClear.push('test GET /blogs/{blogId}/posts/{id}');
            postsToClear.push('GET /posts/{id}');
            done();
        });
    });

    describe('PUT /blogs/{blogId}/posts/{id}, PUT /posts/{id}', function () {
        var blogId = null;
        var postId = null;
        before(function (done) {
            Blogs.create('test PUT /blogs/{blogId}/posts/{id}', 'silver lining', 'test PUT /posts', [], [], [], [], false, 'public', true, 'test')
                .then(function (b) {
                    blogId = b._id.toString();
                    //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
                    return Posts.create(blogId, 'silver lining', 'test PUT', 'draft', 'public', true, true, 'testing put', ['testing'], [], 'test');
                })
                .then(function (p) {
                    postId = p._id.toString();
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it('should send back not found error when you try to modify non existent posts', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/54d4430eed61ad701cc7a721/posts/54d4430eed61ad701cc7a721',
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

        it('should send back not found error when you try to modify non existent posts2', function (done) {
            var request = {
                method: 'PUT',
                url: '/posts/54d4430eed61ad701cc7a721',
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

        it('should send back forbidden error when you try to modify a post of a blog you are not an owner of', function (done) {
            var request = {};
            var authHeader = '';
            Users._findOne({email: 'one@first.com'})
                .then(function (u) {
                    return u.setRoles(['root'], 'test').loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId,
                        headers: {
                            Authorization: authHeader
                        },
                        payload: {
                            title: '    test PUT /posts/{id}'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should activate posts and have changes audited', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/' + blogId + '/posts/' + postId,
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
                    Posts._find({_id: BaseModel.ObjectID(postId)})
                        .then(function (found) {
                            expect(found[0].isActive).to.be.false();
                            return Audit.findAudit('posts', found[0]._id, {'change.action': 'isActive'});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].change[0].action).to.match(/isActive/);
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should deactivate posts and have changes audited', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/' + blogId + '/posts/' + postId,
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
                    Posts._find({_id: BaseModel.ObjectID(postId)})
                        .then(function (found) {
                            expect(found[0].isActive).to.be.true();
                            return Audit.findAudit('posts', found[0]._id, {'change.action': 'isActive'});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].change[0].action).to.match(/isActive/);
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should add add/remove tags and have changes audited', function (done) {
            var request = {
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
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    Posts._find({_id: BaseModel.ObjectID(postId)})
                        .then(function (found) {
                            expect(found[0].tags[0]).to.equal('add some');
                            return Audit.findAudit('posts', found[0]._id, {'change.action': {$regex: /tag/}});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].change[0].action).to.match(/add/);
                            expect(foundAudit[0].change[1].action).to.match(/remove/);
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should update content and have changes persisted on disk', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/' + blogId + '/posts/' + postId,
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    content: 'updated'
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    Posts._find({_id: BaseModel.ObjectID(postId)})
                        .then(function (found) {
                            var filename = PostContent.filenameForPost(found[0]);
                            var timeout = setTimeout(function () {
                                expect(fs.existsSync(Config.storage.diskPath + '/' + filename)).to.be.true();
                                expect(fs.readFileSync(Config.storage.diskPath + '/' + filename, {}).toString()).to.equal('updated');
                                done();
                                clearTimeout(timeout);
                            }, 1000);
                        });
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should update access, allowComments, needsReview and have changes audited', function (done) {
            var request = {
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
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    Posts._find({_id: BaseModel.ObjectID(postId)})
                        .then(function (found) {
                            expect(found[0].access).to.equal('restricted');
                            expect(found[0].allowComments).to.equal(false);
                            expect(found[0].needsReview).to.equal(false);
                            return Audit.findAudit('posts', found[0]._id, {by: 'root'});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].change[0].action).to.match(/access/);
                            expect(foundAudit[0].change[1].action).to.match(/allowComments/);
                            expect(foundAudit[0].change[2].action).to.match(/needsReview/);
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should give an error if you try to update archived posts', function (done) {
            Posts._findOne({_id: Posts.ObjectID(postId)})
                .then(function (post) {
                    post.state = 'archived';
                    return post.save();
                })
                .then(function () {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            content: 'if its archived, its done'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(409);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        after(function (done) {
            blogsToClear.push('test PUT /blogs/{blogId}/posts/{id}');
            postsToClear.push('test PUT');
            done();
        });
    });

    describe('PUT /blogs/{blogId}/posts/{id}/publish', function () {
        var blogId = null;
        before(function (done) {
            Blogs.create('test PUT /blogs/{blogId}/posts/{id}/publish', 'silver lining', 'test PUT /posts', ['one@first.com'], [], ['subscriber1'], ['test Group PUT /blogs/{blogId}/posts/{id}/publish'], false, 'public', true, 'test')
                .then(function (b) {
                    blogId = b._id.toString();
                    return UserGroups.create('test Group PUT /blogs/{blogId}/posts/{id}/publish', 'silver lining', 'test notifications', 'test');
                })
                .then(function (ug) {
                    return ug.remove(['test'], 'members', 'test').add(['subscriber1', 'subscriber2'], 'members', 'test').save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it('should publish draft / pending review posts', function (done) {
            var postId = null;
            Posts.create(blogId, 'silver lining', 'test PUT publish', 'draft', 'public', true, true, 'testing put', ['testing'], [], 'test')
                .then(function (p) {
                    postId = p._id.toString();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Posts._find({_id: Posts.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].access).to.equal('restricted');
                                    expect(found[0].state).to.equal('published');
                                    return Audit.findAudit('posts', found[0]._id, {by: 'one@first.com'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].change[0].action).to.equal('state');
                                })
                                .then(function () {
                                    //because the events from the controller may not be complete
                                    var ct = setTimeout(function () {
                                        Notifications._find({
                                            objectType: 'posts',
                                            objectId: Posts.ObjectID(postId)
                                        })
                                            .then(function (notifications) {
                                                expect(notifications.length).to.equal(3);
                                                Notifications.remove({
                                                    objectType: 'posts',
                                                    objectId: Posts.ObjectID(postId)
                                                }, function (err, count) {
                                                    if (err) {
                                                        done(err);
                                                    } else {
                                                        expect(count).to.equal(3);
                                                        done();
                                                    }
                                                });
                                            });
                                        clearTimeout(ct);
                                    }, 1000);
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should fail to publish draft / pending review posts if user is not an owner/contributor of the blog', function (done) {
            var postId = null;
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            Posts.create(blogId, 'silver lining', 'test PUT publish', 'draft', 'public', true, true, 'testing put', ['testing'], [], 'test')
                .then(function (p) {
                    postId = p._id.toString();
                    return Blogs._findOne({_id: BaseModel.ObjectID(blogId)});
                })
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owners', 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].state).to.equal('draft');
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should move draft to pending review posts if user is contributor, but not owner of the blog', function (done) {
            var postId = null;
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            Posts.create(blogId, 'silver lining', 'test PUT publish', 'draft', 'public', true, true, 'testing put', ['testing'], [], 'test')
                .then(function (p) {
                    postId = p._id.toString();
                    return Blogs._findOne({_id: BaseModel.ObjectID(blogId)});
                })
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owners', 'test').add(['one@first.com'], 'contributors', 'test').add(['owner1'], 'owners', 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].state).to.equal('pending review');
                                    expect(found[0].access).to.equal('restricted');
                                })
                                .then(function () {
                                    //because the events from the controller may not be complete
                                    var ct = setTimeout(function () {
                                        Notifications._find({
                                            objectType: 'posts',
                                            objectId: Posts.ObjectID(postId)
                                        })
                                            .then(function (notifications) {
                                                expect(notifications.length).to.equal(1);
                                                Notifications.remove({
                                                    objectType: 'posts',
                                                    objectId: Posts.ObjectID(postId)
                                                }, function (err, count) {
                                                    if (err) {
                                                        done(err);
                                                    } else {
                                                        expect(count).to.equal(1);
                                                        done();
                                                    }
                                                });
                                            });
                                        clearTimeout(ct);
                                    }, 1000);
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should move draft to published posts if user is contributor, and needsReview is false', function (done) {
            var postId = null;
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            Posts.create(blogId, 'silver lining', 'test PUT publish', 'draft', 'public', true, false, 'testing put', ['testing'], [], 'test')
                .then(function (p) {
                    postId = p._id.toString();
                    return Blogs._findOne({_id: BaseModel.ObjectID(blogId)});
                })
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owners', 'test').add(['one@first.com'], 'contributors', 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].state).to.equal('published');
                                    expect(found[0].access).to.equal('restricted');
                                })
                                .then(function () {
                                    //because the events from the controller may not be complete
                                    var ct = setTimeout(function () {
                                        Notifications._find({
                                            objectType: 'posts',
                                            objectId: Posts.ObjectID(postId)
                                        })
                                            .then(function (notifications) {
                                                expect(notifications.length).to.equal(3);
                                                Notifications.remove({
                                                    objectType: 'posts',
                                                    objectId: Posts.ObjectID(postId)
                                                }, function (err, count) {
                                                    if (err) {
                                                        done(err);
                                                    } else {
                                                        expect(count).to.equal(3);
                                                        done();
                                                    }
                                                });
                                            });
                                        clearTimeout(ct);
                                    }, 1000);
                                });

                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should do nothing if the post is already published / archived', function (done) {
            var postId = null;
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            Posts.create(blogId, 'silver lining', 'test PUT publish', 'archived', 'restricted', true, true, 'testing put', ['testing'], [], 'test')
                .then(function (p) {
                    postId = p._id.toString();
                    return Blogs._findOne({_id: BaseModel.ObjectID(blogId)});
                })
                .then(function (blog) {
                    blog.add(['one@first.com'], 'owners', 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/publish',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].state).to.equal('archived');
                                    expect(found[0].access).to.equal('restricted');
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        after(function (done) {
            blogsToClear.push('test PUT /blogs/{blogId}/posts/{id}/publish');
            postsToClear.push('test PUT publish');
            groupsToClear.push('test Group PUT /blogs/{blogId}/posts/{id}/publish');
            done();
        });
    });

    describe('PUT /blogs/{blogId}/posts/{id}/reject', function () {
        var blogId = null;
        before(function (done) {
                Blogs.create('test PUT /blogs/{blogId}/posts/{id}/reject', 'silver lining', 'test PUT /posts', ['one@first.com'], [], ['subscriber1'], ['test Group PUT /blogs/{blogId}/posts/{id}/reject'], false, 'public', true, 'test')
                .then(function (b) {
                    blogId = b._id.toString();
                    return UserGroups.create('test Group PUT /blogs/{blogId}/posts/{id}/reject', 'silver lining', 'test notifications', 'test');
                })
                .then(function (ug) {
                    return ug.remove(['test'], 'members', 'test').add(['subscriber1', 'subscriber2'], 'members', 'test').save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it('should update reject draft / pending review posts and cancel review notifications', function (done) {
            var postId = null;
            Posts.create(blogId, 'silver lining', 'test PUT reject', 'draft', 'public', true, true, 'testing put', ['testing'], [], 'test')
                .then(function (p) {
                    postId = p._id.toString();
                    //email, organisation, objectType, objectId, title, state, action, priority, content, by
                    return Notifications.create(['one@first.com', 'subscriber1', 'subscriber2'], 'silver lining', 'posts', p._id, 'titles dont matter', 'unread', 'review', 'medium', 'content is king', 'test');
                })
                .then(function () {
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/reject',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].access).to.equal('restricted');
                                    expect(found[0].state).to.equal('do not publish');
                                })
                                .then(function () {
                                    var ct = setTimeout(function () {
                                        Notifications._find({
                                            objectType: 'posts',
                                            objectId: Posts.ObjectID(postId),
                                            state: 'cancelled'
                                        })
                                            .then(function (notifications) {
                                                expect(notifications.length).to.equal(3);
                                                Notifications.remove({objectType: 'posts', objectId: Posts.ObjectID(postId)}, function (err, count) {
                                                    if (err) {
                                                        done(err);
                                                    } else {
                                                        expect(count).to.equal(4);//because there is one notification to the author for the rejection as well
                                                        done();
                                                    }
                                                });
                                            });
                                        clearTimeout(ct);
                                    }, 1000);
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should fail reject draft / pending review posts if user is not an owner of the blog', function (done) {
            var postId = null;
            Posts.create(blogId, 'silver lining', 'test PUT reject', 'draft', 'public', true, true, 'testing put', ['testing'], [], 'test')
                .then(function (p) {
                    postId = p._id.toString();
                    return Blogs._findOne({_id: BaseModel.ObjectID(blogId)});
                })
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owners', 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/reject',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].state).to.equal('draft');
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should do nothing if the post is already published / archived', function (done) {
            var postId = null;
            Posts.create(blogId, 'silver lining', 'test PUT reject', 'draft', 'public', true, true, 'testing put', ['testing'], [], 'test')
                .then(function (p) {
                    postId = p._id.toString();
                    return Blogs._findOne({_id: BaseModel.ObjectID(blogId)});
                })
                .then(function (blog) {
                    blog.add(['one@first.com'], 'owners', 'test').save();
                    return Posts._findOne({_id: BaseModel.ObjectID(postId)});
                })
                .then(function (post) {
                    post.setState('published', 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/reject',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'restricted'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].state).to.equal('published');
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        after(function (done) {
            blogsToClear.push('test PUT /blogs/{blogId}/posts/{id}/reject');
            postsToClear.push('test PUT reject');
            groupsToClear.push('test Group PUT /blogs/{blogId}/posts/{id}/reject');
            done();
        });
    });

    describe('POST /blogs/{blogId}/posts', function () {
        var blogId = null;

        before(function (done) {
            Blogs.create('test POST /blogs/{blogId}/posts', 'silver lining', 'test POST /posts', ['one@first.com'], [], [], [], false, 'public', true, 'test')
                .then(function (blog) {
                    blogId = blog._id.toString();
                    done();
                })
                .catch(function (err) {
                    done(err);
                });
        });

        it('should send back conflict when you try to create a post with a title that you just created', function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            Posts.create(blogId, 'silver lining', 'test POST unique', 'draft', 'public', true, true, 'testing put', ['testing'], [], 'test')
                .then(function () {
                    var request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            title: 'test POST unique',
                            state: 'draft',
                            content: 'something. anything will do.',
                            tags: ['testing'],
                            category: 'POST',
                            attachments: []
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(409);
                            postsToClear.push('test POST unique');
                            done();
                        } catch (err) {
                            postsToClear.push('test POST unique');
                            done(err);
                        }
                    });
                });
        });

        it('should not allow you to create a post if you are not an owner / contributor to the blog', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owners', 'test').remove(['one@first.com'], 'contributors', 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            title: 'test POST blog owner',
                            state: 'draft',
                            content: 'something. anything will do.',
                            tags: ['testing'],
                            category: 'POST',
                            attachments: []
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            Posts._find({title: 'test POST blog owner'})
                                .then(function (found) {
                                    expect(found.length).to.equal(0);
                                    postsToClear.push('test POST blog owner');
                                    done();
                                });
                        } catch (err) {
                            postsToClear.push('test POST blog owner');
                            done(err);
                        }
                    });
                });
        });

        it('should create post successfully, and publish if blog doesnt have needsReview set', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.add(['one@first.com'], 'contributors', 'test').setNeedsReview(false, 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            title: 'test POST needsReview and publish',
                            state: 'published',
                            content: 'something. anything will do.',
                            tags: ['testing'],
                            category: 'POST',
                            attachments: [],
                            needsReview: false
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Posts._find({title: 'test POST needsReview and publish'})
                                .then(function (found) {
                                    expect(found.length).to.equal(1);
                                    expect(found[0].state).to.equal('published');
                                    var filename = PostContent.filenameForPost(found[0]);
                                    var timeout = setTimeout(function () {
                                        expect(fs.existsSync(Config.storage.diskPath + '/' + filename)).to.be.true();
                                        expect(fs.readFileSync(Config.storage.diskPath + '/' + filename, {}).toString()).to.equal('something. anything will do.');
                                        done();
                                        clearTimeout(timeout);
                                    }, 1000);
                                    postsToClear.push('test POST needsReview and publish');
                                });
                        } catch (err) {
                            postsToClear.push('test POST needsReview and publish');
                            done(err);
                        }
                    });
                });
        });

        it('should create post successfully, and mark it as pending review if blog has needsReview set', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owners', 'test').add(['one@first.com'], 'contributors', 'test').setNeedsReview(true, 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            title: 'test POST needsReview and pending review',
                            state: 'published',
                            content: 'something. anything will do.',
                            tags: ['testing'],
                            category: 'POST',
                            attachments: [],
                            needsReview: true
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Posts._find({title: 'test POST needsReview and pending review'})
                                .then(function (found) {
                                    expect(found.length).to.equal(1);
                                    expect(found[0].state).to.equal('pending review');
                                    postsToClear.push('test POST needsReview and pending review');
                                    done();
                                });
                        } catch (err) {
                            postsToClear.push('test POST needsReview and pending review');
                            done(err);
                        }
                    });
                });
        });

        it('should create post successfully, and mark it as draft if user has marked it as draft irrespective of whether user is owner / needsReview setting', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owners', 'test').add(['one@first.com'], 'contributors', 'test').setNeedsReview(true, 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            title: 'test POST draft',
                            state: 'draft',
                            content: 'something. anything will do.',
                            tags: ['testing'],
                            category: 'POST',
                            attachments: [],
                            needsReview: true
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Posts._find({title: 'test POST draft'})
                                .then(function (found) {
                                    expect(found.length).to.equal(1);
                                    expect(found[0].state).to.equal('draft');
                                    postsToClear.push('test POST draft');
                                    done();
                                });
                        } catch (err) {
                            postsToClear.push('test POST draft');
                            done(err);
                        }
                    });
                });
        });

        it('should create post successfully, and mark it as published if creator is an owner of the blog', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.add(['one@first.com'], 'owners', 'test').remove(['one@first.com'], 'contributors', 'test').setNeedsReview(true, 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            title: 'test POST needsReview, owner and published',
                            state: 'published',
                            content: 'something. anything will do.',
                            tags: ['testing'],
                            category: 'POST',
                            attachments: [],
                            needsReview: true,
                            access: 'restricted',
                            allowComments: false
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Posts._find({title: 'test POST needsReview, owner and published'})
                                .then(function (found) {
                                    expect(found.length).to.equal(1);
                                    expect(found[0].state).to.equal('published');
                                    postsToClear.push('test POST needsReview, owner and published');
                                    done();
                                });
                        } catch (err) {
                            postsToClear.push('test POST needsReview, owner and published');
                            done(err);
                        }
                    });
                });
        });

        it('should create post successfully, inherit needsReview, allowComments, access from blog if not passed', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.add(['one@first.com'], 'owners', 'test').add(['one@first.com'], 'contributors', 'test').setNeedsReview(true, 'test').setAccess('restricted', 'test').setAllowComments(false, 'test').save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'POST',
                        url: '/blogs/' + blogId + '/posts',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            title: 'test POST needsReview, access, allowComments',
                            state: 'published',
                            content: 'something. anything will do.',
                            tags: ['testing'],
                            category: 'POST',
                            attachments: []
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Posts._find({title: 'test POST needsReview, access, allowComments'})
                                .then(function (found) {
                                    expect(found.length).to.equal(1);
                                    expect(found[0].needsReview).to.equal(true);
                                    expect(found[0].access).to.equal('restricted');
                                    expect(found[0].allowComments).to.equal(false);
                                    postsToClear.push('test POST needsReview, access, allowComments');
                                    done();
                                });
                        } catch (err) {
                            postsToClear.push('test POST needsReview, access, allowComments');
                            done(err);
                        }
                    });
                });
        });

        after(function (done) {
            blogsToClear.push('test POST /blogs/{blogId}/posts');
            done();
        });
    });

    describe('DELETE /blogs/{blogId}/posts/{id}', function () {
        it('should send back not found error when you try to modify a non existent post', function (done) {
            var request = {
                method: 'DELETE',
                url: '/blogs/54d4430eed61ad701cc7a721/posts/54d4430eed61ad701cc7a721',
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

        it('should send back forbidden error when you try to delete a post from a blog you are not an owner of', function (done) {
            var request = {};
            var authHeader = '';
            var blogId = '';
            var postId = '';
            Blogs.create('testDelPostNotOwner', 'silver lining', 'test DELETE /posts', [], [], [], [], false, 'public', true, 'test')
                .then(function (b) {
                    blogId = b._id.toString();
                    //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
                    return Posts.create(b._id, 'silver lining', 'DELETE /blogs/{blogId}/posts/{id}', 'draft', 'public', true, 'testing', ['testing', 'controller testing'], [], 'test');
                })
                .then(function (p) {
                    postId = p._id.toString();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (u) {
                    return u.setRoles(['root'], 'test').loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    authHeader = tu.authorizationHeader(u);
                    request = {
                        method: 'DELETE',
                        url: '/blogs/' + blogId + '/posts/' + postId,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            blogsToClear.push('testDelPostNotOwner');
                            postsToClear.push('DELETE /blogs/{blogId}/posts/{id}');
                            done();
                        } catch (err) {
                            blogsToClear.push('testDelPostNotOwner');
                            postsToClear.push('DELETE /blogs/{blogId}/posts/{id}');
                            done(err);
                        }
                    });
                });
        });

        it('should deactivate blog and have changes audited', function (done) {
            var blogId = '';
            var postId = '';
            Blogs.create('testDelPost', 'silver lining', 'test DELETE /posts', ['one@first.com'], [], [], [], false, 'public', true, 'test')
                .then(function (b) {
                    blogId = b._id.toString();
                    //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
                    return Posts.create(b._id, 'silver lining', 'success DELETE /blogs/{blogId}/posts/{id}', 'draft', 'public', true, 'testing', ['testing', 'controller testing'], [], 'test');
                })
                .then(function (p) {
                    postId = p._id.toString();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (u) {
                    return u.setRoles(['root'], 'test').loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var authHeader = tu.authorizationHeader(u);
                    var request = {
                        method: 'DELETE',
                        url: '/blogs/' + blogId + '/posts/' + postId,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (p) {
                                    expect(p[0].isActive).to.be.false;
                                    return Audit.findAudit('posts', p[0]._id, {by: 'one@first.com'});
                                })
                                .then(function (a) {
                                    expect(a).to.exist();
                                    expect(a[0].change[0].action).to.match(/isActive/);
                                    blogsToClear.push('testDelPost');
                                    postsToClear.push('success DELETE /blogs/{blogId}/posts/{id}');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('testDelPost');
                            postsToClear.push('success DELETE /blogs/{blogId}/posts/{id}');
                            done(err);
                        }
                    });
                });
        });
    });

    afterEach(function (done) {
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear, userGroups: groupsToClear}, done);
    });

})
;

