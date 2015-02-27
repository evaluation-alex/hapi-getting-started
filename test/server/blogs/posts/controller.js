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
    var groupsToClear = [];
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

        it('should update access, allowComments and have changes audited', function (done) {
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
        after(function (done) {
            blogsToClear.push('test PUT /blogs/{blogId}/posts/{id}');
            postsToClear.push('test PUT');
            done();
        });
    });

    /*
     describe('PUT /blogs/{id}/subscribe', function () {
     it('should send back not found error when you try to join a non existent blog', function (done) {
     var request = {
     method: 'PUT',
     url: '/blogs/54c894fe1d1d4ab4032ed94e/subscribe',
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
     it('should send back error if any of the users trying to join are not valid', function (done) {
     var id = '';
     Blogs.create('testBlogUserExistPUTSubscribe', 'silver lining', 'test PUT /blogs/subscribe', [], [], [], [], false, 'public', true, 'test')
     .then(function (b) {
     id = b._id.toString();
     var request = {
     method: 'PUT',
     url: '/blogs/' + id + '/subscribe',
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
     blogsToClear.push('testBlogUserExistPUTSubscribe');
     done();
     } catch (err) {
     blogsToClear.push('testBlogUserExistPUTSubscribe');
     done(err);
     }
     });
     });
     });
     it('should add users who have joined to the needsApproval list', function (done) {
     var request = {};
     var id = '';
     Blogs.create('testPutSubscribeGroupAddUser', 'silver lining', 'test PUT /blogs/subscribe', [], [], [], [], false, 'restricted', true, 'test')
     .then(function (b) {
     id = b._id.toString();
     request = {
     method: 'PUT',
     url: '/blogs/' + id + '/subscribe',
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
     Blogs._find({title: 'testPutSubscribeGroupAddUser'})
     .then(function (b) {
     expect(b).to.exist();
     expect(b[0]._isMemberOf('needsApproval', 'one@first.com')).to.be.true();
     return Audit.findAudit('Blogs', 'testPutSubscribeGroupAddUser', {action: {$regex: /add needsApproval/}});
     })
     .then(function (foundAudit) {
     expect(foundAudit.length).to.equal(1);
     expect(foundAudit[0].action).to.match(/add needsApproval/);
     blogsToClear.push('testPutSubscribeGroupAddUser');
     done();
     });
     } catch (err) {
     blogsToClear.push('testPutSubscribeGroupAddUser');
     done(err);
     }
     });
     });
     });
     it('should add to members if the group access is public and have changes audited', function (done) {
     var request = {};
     var id = '';
     Blogs.create('testPutSubscribePublicGroupAddUser', 'silver lining', 'test PUT /blogs/subscribe', [], [], [], [], false, 'public', true, 'test')
     .then(function (b) {
     id = b._id.toString();
     b.setAccess('public');
     return b.save();
     })
     .then(function () {
     request = {
     method: 'PUT',
     url: '/blogs/' + id + '/subscribe',
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
     Blogs._find({title: 'testPutSubscribePublicGroupAddUser'})
     .then(function (b) {
     expect(b).to.exist();
     expect(b[0]._isMemberOf('subscribers', 'one@first.com')).to.be.true();
     return Audit.findAudit('Blogs', 'testPutSubscribePublicGroupAddUser', {action: {$regex: /add subscriber/}});
     })
     .then(function (foundAudit) {
     expect(foundAudit.length).to.equal(1);
     expect(foundAudit[0].action).to.match(/add subscriber/);
     blogsToClear.push('testPutSubscribePublicGroupAddUser');
     done();
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
     it('should add users who have been approved to the subscribers list', function (done) {
     var request = {};
     var id = '';
     Blogs.create('testBlogPutApproveAddUser', 'silver lining', 'test PUT /blogs/approve', [], [], [], [], false, 'restricted', true, 'test')
     .then(function (b) {
     id = b._id.toString();
     return b.add(['one@first.com'], 'needApprovals', 'test').save();
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
     return Audit.findAudit('Blogs', 'testBlogPutApproveAddUser', {action: {$regex: /add subscriber/}});
     })
     .then(function (foundAudit) {
     expect(foundAudit.length).to.equal(1);
     expect(foundAudit[0].action).to.match(/add subscriber/);
     blogsToClear.push('testBlogPutApproveAddUser');
     done();
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
     return Audit.findAudit('Blogs', 'testPutApproveBlogNotOwner', {action: {$regex: /add subscriber/}});
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
     it('should remove users who have been rejected from the needsApproval list', function (done) {
     var request = {};
     var id = '';
     Blogs.create('testPutRejectBlogAddUser', 'silver lining', 'test PUT /blogs/reject', [], [], [], [], false, 'restricted', true, 'test')
     .then(function (b) {
     id = b._id.toString();
     return b.add(['one@first.com'], 'needsApproval', 'test').save();
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
     return Audit.findAudit('Blogs', 'testPutRejectBlogAddUser', {action: {$regex: /remove needsApproval/}});
     })
     .then(function (foundAudit) {
     expect(foundAudit.length).to.equal(1);
     expect(foundAudit[0].action).to.match(/remove needsApproval/);
     blogsToClear.push('testPutRejectBlogAddUser');
     done();
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
     return Audit.findAudit('Blogs', 'test post /blogs success', {action: 'create'});
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
     */
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
        return tu.cleanup({userGroups: groupsToClear, blogs: blogsToClear, posts: postsToClear}, done);
    });

});

