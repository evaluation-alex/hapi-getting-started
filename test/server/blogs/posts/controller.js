'use strict';
var relativeToServer = './../../../../server/';

var Users = require(relativeToServer + 'users/model');
var Blogs = require(relativeToServer + 'blogs/model');
var Posts = require(relativeToServer + 'blogs/posts/model');
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
            var b1 = Blogs.create('test GET /posts1', 'silver lining', 'test GET /blogs', ['owner1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], false, 'public', true, 'test');
            var b2 = Blogs.create('test GET /posts2 is active = false', 'silver lining', ['owner2'], ['contributor2'], ['subscriber2'], ['subscriberGroup2'], false, 'public', true, 'test');
            Promise.join(b1, b2)
                .then(function (b) {
                    var b1 = b[0];
                    var b2 = b[1];
                    blogId = b1._id;
                    //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
                    var p1 = Posts.create(b1._id, 'silver lining', 'searchByTitle', 'draft', 'public', true, true, 'testing', ['testing', 'controller testing'], 'search is good, results are better', [], 'test');
                    var p2 = Posts.create(b1._id, 'silver lining', 'searchByTitle2', 'published', 'public', true, true, 'testing', ['testing', 'controller testing'], 'you find what you search', [], 'test');
                    var p3 = Posts.create(b2._id, 'silver lining', 'search3', 'do not publish', 'public', true, true, 'testing', ['testing', 'search testing'], 'dont stop searching for meaning', [], 'test');
                    return Promise.join(p1, p2, p3);
                })
                .then(function (p) {
                    //var p1 = p[0];
                    var p2 = p[1];
                    var p3 = p[2];
                    var pubDt = new Date();
                    pubDt.setFullYear(2015, 1, 14);
                    p3.publishedOn = pubDt;
                    p3.save();
                    p2.isActive = false;
                    p2.save();
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
                    return Posts.create(b._id, 'silver lining', 'GET /posts/{id}', 'draft', 'public', true, true, 'testing', ['testing', 'controller testing'], 'search with a spotlight to find the needly in the haystack', [], 'test');
                })
                .then(function (p) {
                    id = p._id.toString();
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
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should only send back post with the id, blogId in params', function (done) {
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
                    //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
                    return Posts.create(blogId, 'silver lining', 'test PUT', 'draft', 'public', true, true, 'testing put', ['testing'], 'nothing is immutable, embrace change', [], 'test');
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
                            return Audit.findAudit('Posts', found[0]._id, {action: 'isActive'});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].action).to.match(/isActive/);
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
                            return Audit.findAudit('Posts', found[0]._id, {action: 'isActive'});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].action).to.match(/isActive/);
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
                            return Audit.findAudit('Posts', found[0]._id, {action: {$regex: /tag/}});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(2);
                            expect(foundAudit[0].action).to.match(/add/);
                            expect(foundAudit[1].action).to.match(/remove/);
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
                            expect(found[0].content).to.equal('updated');
                            return Posts.filenameForPost(found[0]).join('');
                        })
                        .then(function (fname) {
                            var timeout = setTimeout(function () {
                                expect(fs.existsSync(Config.storage.diskPath + '/' + fname)).to.be.true();
                                expect(fs.readFileSync(Config.storage.diskPath + '/' + fname, {}).toString()).to.equal('updated');
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
                            return Audit.findAudit('Posts', found[0]._id, {action: {$regex: /access/}});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].action).to.match(/access/);
                            return Audit.findAudit('Posts', foundAudit[0].objectChangedId, {action: {$regex: /allowComments/}});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].action).to.match(/allowComments/);
                            return Audit.findAudit('Posts', foundAudit[0].objectChangedId, {action: {$regex: /needsReview/}});
                        })
                        .then(function (foundAudit) {
                            expect(foundAudit).to.exist();
                            expect(foundAudit.length).to.equal(1);
                            expect(foundAudit[0].action).to.match(/needsReview/);
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should update approve draft / pending review posts', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.add(['one@first.com'], 'owner', 'test').save();
                    return Posts._findOne({_id: BaseModel.ObjectID(postId)});
                })
                .then(function (post) {
                    post.setState('draft').setNeedsReview(true).save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/approve',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'public',
                            allowComments: true,
                            needsReview: true
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Posts._find({_id: BaseModel.ObjectID(postId)})
                                .then(function (found) {
                                    expect(found[0].access).to.equal('public');
                                    expect(found[0].allowComments).to.equal(true);
                                    expect(found[0].needsReview).to.equal(true);
                                    expect(found[0].state).to.equal('published');
                                    return Audit.findAudit('Posts', found[0]._id, {action: {$regex: /state/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.equal('state');
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should update reject draft / pending review posts', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.add(['one@first.com'], 'owner', 'test').save();
                    return Posts._findOne({_id: BaseModel.ObjectID(postId)});
                })
                .then(function (post) {
                    post.setState('draft').setNeedsReview(true).save();
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
                                    expect(found[0].state).to.equal('do not publish');
                                    return Audit.findAudit('Posts', found[0]._id, {action: {$regex: /state/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(2);
                                    expect(foundAudit[0].action).to.equal('state');
                                    expect(foundAudit[1].action).to.equal('state');
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should fail approve draft / pending review posts if user is not an owner of the blog', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owner', 'test').save();
                    return Posts._findOne({_id: BaseModel.ObjectID(postId)});
                })
                .then(function (post) {
                    post.setState('draft').setNeedsReview(true).save();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + blogId + '/posts/' + postId + '/approve',
                        headers: {
                            Authorization: tu.authorizationHeader(u)
                        },
                        payload: {
                            access: 'public',
                            allowComments: true,
                            needsReview: true
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

        it('should fail reject draft / pending review posts if user is not an owner of the blog', function (done) {
            Blogs._findOne({_id: BaseModel.ObjectID(blogId)})
                .then(function (blog) {
                    blog.remove(['one@first.com'], 'owner', 'test').save();
                    return Posts._findOne({_id: BaseModel.ObjectID(postId)});
                })
                .then(function (post) {
                    post.setState('draft').setNeedsReview(true).save();
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
                            access: 'restricted',
                            allowComments: false,
                            needsReview: false
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

        after(function (done) {
            blogsToClear.push('test PUT /blogs/{blogId}/posts/{id}');
            postsToClear.push('test PUT');
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
                .catch(function(err) {
                    done(err);
                });
        });

        it('should send back conflict when you try to create a post with a title that you just created', function (done) {
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            Posts.create(blogId, 'silver lining', 'test POST unique', 'draft', 'public', true, true, 'testing put', ['testing'], 'nothing is immutable, embrace change', [], 'test')
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
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });

        it('should not allow you to create a post if you are not an owner / contributor to the blog', function (done) {
            done();
        });

        it('should create post successfully, and publish if blog doesnt have needsReview set', function (done) {
            done();
        });

        it('should create post successfully, and mark it as pending review if blog has needsReview set', function (done) {
            done();
        });

        it('should create post successfully, and mark it as published if creator is an owner of the blog', function (done) {
            done();
        });

        it('should create post successfully, inherit needsReview, allowComments, access from blog if not passed', function (done) {
            done();
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
                    return Posts.create(b._id, 'silver lining', 'DELETE /blogs/{blogId}/posts/{id}', 'draft', 'public', true, 'testing', ['testing', 'controller testing'], 'we better test code or not write code', [], 'test');
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
                    return Posts.create(b._id, 'silver lining', 'success DELETE /blogs/{blogId}/posts/{id}', 'draft', 'public', true, 'testing', ['testing', 'controller testing'], 'sayonara', [], 'test');
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
                                    return Audit.findAudit('Posts', p[0]._id, {action: 'isActive'});
                                })
                                .then(function (a) {
                                    expect(a).to.exist();
                                    expect(a[0].action).to.match(/isActive/);
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
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear}, done);
    });

});

