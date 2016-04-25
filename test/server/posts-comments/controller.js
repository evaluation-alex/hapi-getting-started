'use strict';
let Audit = require('./../../../build/server/audit/model');
let Comments = require('./../../../build/server/posts-comments/model');
let Blogs = require('./../../../build/server/blogs/model');
let Posts = require('./../../../build/server/posts/model');
let _ = require('lodash');
let Bluebird = require('bluebird');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('PostsComments', () => {
    let rootAuthHeader = null;
    let server = null;
    let postsToClear = [];
    let blogsToClear = [];
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                rootAuthHeader = res.authheader;
                done();
            })
            .catch(done);
    });
    describe('POST /posts-comments', () => {
        let postId = null;
        let commentId = null;
        before((done) => {
            Blogs.create('test POST /posts-comments', 'test POST /posts-comments', null, null, null, null, false, 'public', true, 'test')
                .then(b1 => {
                    return Posts.create(b1._id, 'test POST /posts-comments', 'published', 'public', true, true, ['testing', 'search testing'], [], 'post', 'posts-comments', 'test');
                })
                .then((p) => {
                    postId = p._id.toString();
                    done();
                    return p;
                })
                .catch(done);
        });
        it('should throw an error, if you try to post a comment on a invalid post', (done) => {
            let request = {
                method: 'POST',
                url: '/posts-comments', payload: {postId: '54d4430eed61ad701cc7a721', comment: '1'},
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(422);
                    done();
                })
                .catch(done);
        })
        it('should create a new comment', (done) => {
            let request = {
                method: 'POST',
                url: '/posts-comments', payload: {postId: postId, comment: '1'},
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Comments.findOne({postId: Posts.ObjectID(postId)});
                })
                .then((comment) => {
                    expect(comment).to.exist;
                    expect(comment.comment).to.equal('1');
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test POST /posts-comments');
            postsToClear.push('test POST /posts-comments');
            done();
        });
    });
    describe('PUT /posts-comments/{id}/approve', () => {
        let commentId = null;
        before((done) => {
            Blogs.create('test PUT /posts-comments/approve', 'test PUT /posts-comments/approve', null, null, null, null, false, 'public', true, 'root')
                .then(b1 => {
                    return Posts.create(b1._id, 'test PUT /posts-comments/approve', 'published', 'public', true, true, ['testing', 'search testing'], [], 'post', 'posts-stats', 'root');
                })
                .then((p) => {
                    return Comments.create(p._id, 'toBeApproved', undefined, 'pending', 'root');
                })
                .then((comment) => {
                    commentId = comment._id.toString();
                    done();
                })
                .catch(done);
        });
        it('should approve comments', (done) => {
            let request = {
                method: 'PUT',
                url: '/posts-comments/' + commentId + '/approve',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Comments.find({_id: Comments.ObjectID(commentId)});
                })
                .then((found) => {
                    expect(found[0].status).to.equal('approved');
                    return Audit.findAudit('posts-comments', found[0]._id, {by: 'root', 'change.action': 'status'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.equal('status');
                    return tu.cleanupAudit();
                })
                .then((count) => {
                    done();
                })
                .catch(done);
        });
        it('should do nothing if the comment is already approved', (done) => {
            let request = {
                method: 'PUT',
                url: '/posts-comments/' + commentId + '/approve',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Comments.find({_id: Comments.ObjectID(commentId)});
                })
                .then((found) => {
                    expect(found[0].status).to.equal('approved');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test PUT /posts-comments/approve');
            postsToClear.push('test PUT /posts-comments/approve');
            done();
        });
    });
    describe('PUT /posts-comments/{id}/spam', () => {
        let commentId = null;
        before((done) => {
            Blogs.create('test PUT /posts-comments/spam', 'test PUT /posts-comments/spam', null, null, null, null, false, 'public', true, 'root')
                .then(b1 => {
                    return Posts.create(b1._id, 'test PUT /posts-comments/spam', 'published', 'public', true, true, ['testing', 'search testing'], [], 'post', 'posts-stats', 'root');
                })
                .then((p) => {
                    return Comments.create(p._id, 'markAsSpam', undefined, 'pending', 'root');
                })
                .then((comment) => {
                    commentId = comment._id.toString();
                    done();
                })
                .catch(done);
        });
        it('should mark comment as spam', (done) => {
            let request = {
                method: 'PUT',
                url: '/posts-comments/' + commentId + '/spam',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Comments.find({_id: Comments.ObjectID(commentId)});
                })
                .then((found) => {
                    expect(found[0].status).to.equal('spam');
                    return Audit.findAudit('posts-comments', found[0]._id, {by: 'root', 'change.action': 'status'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    expect(foundAudit.length).to.equal(1);
                    expect(foundAudit[0].change[0].action).to.equal('status');
                    return tu.cleanupAudit();
                })
                .then((count) => {
                    done();
                })
                .catch(done);
        });
        it('should do nothing if the comment is already marked as spam', (done) => {
            let request = {
                method: 'PUT',
                url: '/posts-comments/' + commentId + '/spam',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Comments.find({_id: Comments.ObjectID(commentId)});
                })
                .then((found) => {
                    expect(found[0].status).to.equal('spam');
                    return tu.cleanupAudit();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test PUT /posts-comments/spam');
            postsToClear.push('test PUT /posts-comments/spam');
            done();
        });
    });
    describe('PUT /posts-comments/{id}', () => {
        let postId = null;
        let commentId = null;
        before((done) => {
            Blogs.create('test PUT /posts-comments', 'test PUT /posts-comments', null, null, null, null, false, 'public', true, 'test')
                .then(b1 => {
                    return Posts.create(b1._id, 'test PUT /posts-comments', 'published', 'public', true, true, ['testing', 'search testing'], [], 'post', 'posts-stats', 'test');
                })
                .then((p) => {
                    postId = p._id;
                    return Comments.create(postId, 'toBeModified', undefined, 'pending', 'root');
                })
                .then((comment) => {
                    commentId = comment._id;
                    done();
                })
                .catch(done);
        });
        it('should return forbidden if someone other than the creator of the comment tries to modify it', (done) => {
            tu.findAndLogin('one@first.com', ['root'])
                .then((u) => {
                    let oneauthheader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/posts-comments/' + commentId.toString(), payload: {comment: 'modified'},
                        headers: {
                            Authorization: oneauthheader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(403);
                    return Comments.findOne({_id: commentId});
                })
                .then((comment) =>  {
                    expect(comment.comment).to.equal('toBeModified');
                    done();
                })
                .catch(done);
        });
        it('should update comment', (done) => {
            let request = {
                method: 'PUT',
                url: '/posts-comments/' + commentId.toString(), payload: {comment: 'nowModified'},
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Comments.findOne({_id: commentId});
                })
                .then((comment) => {
                    expect(comment.comment).to.equal('nowModified');
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test PUT /posts-comments');
            postsToClear.push('test PUT /posts-comments');
            done();
        });
    });
    describe('DELETE /posts-comments/{id}', () => {
        it('should send back not found error when you try to delete a non existent comment', (done) => {
            let request = {
                method: 'DELETE',
                url: '/posts-comments/54d4430eed61ad701cc7a721',
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
        it('should send back forbidden error when you try to delete a comment you have not written', (done) => {
            let commentId = '';
            Blogs.create('DELETE /posts-comments', 'test DELETE /posts-comments', [], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    return Posts.create(b._id, 'DELETE /posts-comments', 'draft', 'public', true, true, ['testing', 'controller testing'], [], 'post', 'content', 'test');
                })
                .then((p) => {
                    return Comments.create(p._id, 'toBeModified', undefined, 'pending', 'root');
                })
                .then((comment) => {
                    commentId = comment._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'DELETE',
                        url: '/posts-comments/' + commentId,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(403);
                    blogsToClear.push('DELETE /posts-comments');
                    postsToClear.push('DELETE /posts-comments');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('DELETE /posts-comments');
                    postsToClear.push('DELETE /posts-comments');
                    done(err);
                });
        });
        it('should deactivate comment and have changes audited', (done) => {
            let commentId = '';
            Blogs.create('success DELETE /posts-comments', 'test DELETE /posts-comments', ['one@first.com'], [], [], [], false, 'public', true, 'test')
                .then((b) => {
                    return Posts.create(b._id, 'success DELETE /posts-comments', 'draft', 'public', true, true, ['testing', 'controller testing'], [], 'post', 'content', 'test');
                })
                .then((p) => {
                    return Comments.create(p._id, 'toBeModified', undefined, 'pending', 'one@first.com');
                })
                .then((comment) => {
                    commentId = comment._id.toString();
                    return tu.findAndLogin('one@first.com', ['root']);
                })
                .then((u) => {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'DELETE',
                        url: '/posts-comments/' + commentId,
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Comments.find({_id: Comments.ObjectID(commentId)});
                })
                .then((p) => {
                    expect(p[0].isActive).to.be.false;
                    return Audit.findAudit('posts-comments', p[0]._id, {by: 'one@first.com', 'change.action': 'isActive'});
                })
                .then((a) => {
                    expect(a).to.exist;
                    expect(a[0].change[0].action).to.match(/isActive/);
                    return tu.cleanupAudit();
                })
                .then(() => {
                    blogsToClear.push('success DELETE /posts-comments');
                    postsToClear.push('success DELETE /posts-comments');
                    done();
                })
                .catch((err) => {
                    blogsToClear.push('success DELETE /posts-comments');
                    postsToClear.push('success DELETE /posts-comments');
                    done(err);
                });
        });
    });
    after((done) => {
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear}, done);
    });
});
