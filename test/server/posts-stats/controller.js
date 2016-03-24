'use strict';
let PostsStats = require('./../../../build/server/posts-stats/model');
let Blogs = require('./../../../build/server/blogs/model');
let Posts = require('./../../../build/server/posts/model');
let _ = require('lodash');
let Bluebird = require('bluebird');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('PostsStats', () => {
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
    describe('POST /posts-stats/incrementView', () => {
        let postId = null;
        before((done) => {
            Blogs.create('test POST /posts-stats/incrementView', 'test POST /posts-stats/incrementView', null, null, null, null, false, 'public', true, 'test')
                .then(b1 => {
                    return Posts.create(b1._id, 'test POST /posts-stats/incrementView', 'published', 'public', true, true, ['testing', 'search testing'], [], 'post', 'posts-stats', 'test');
                })
                .then((p) => {
                    postId = p._id;
                    done();
                    return p;
                })
                .catch(done);
        });
        it('create a new stat for that user if the post has never been viewed by that user', (done) => {
            let request = {
                method: 'POST',
                url: '/posts-stats/incrementView', payload: {postId: postId},
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return PostsStats.findOne({postId: postId})
                })
                .then((vc) => {
                    expect(vc).to.exist;
                    expect(vc.viewCount).to.equal(1);
                    done();
                })
                .catch(done);
        });
        it('increment count for that user if it is viewed again by that user', (done) => {
            let request = {
                method: 'POST',
                url: '/posts-stats/incrementView', payload: {postId: postId},
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return PostsStats.findOne({postId: postId})
                })
                .then((vc) => {
                    expect(vc).to.exist;
                    expect(vc.viewCount).to.equal(2);
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test POST /posts-stats/incrementView');
            postsToClear.push('test POST /posts-stats/incrementView');
            done();
        });
    });
    describe('POST /posts-stats/rate', () => {
        let postId = null;
        before((done) => {
            Blogs.create('test POST /posts-stats/rate', 'test POST /posts-stats/rate', null, null, null, null, false, 'public', true, 'test')
                .then(b1 => {
                    return Posts.create(b1._id, 'test POST /posts-stats/rate', 'published', 'public', true, true, ['testing', 'search testing'], [], 'post', 'posts-stats', 'test');
                })
                .then((p) => {
                    postId = p._id;
                    done();
                })
                .catch(done);
        });
        it('create new stat for that user if the has never been viewed by that user', (done) => {
            let request = {
                method: 'POST',
                url: '/posts-stats/rate', payload: {postId: postId, rating: 'like'},
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return PostsStats.findOne({postId: postId})
                })
                .then((vc) => {
                    expect(vc).to.exist;
                    expect(vc.rating).to.equal('like');
                    done();
                })
                .catch(done);
        });
        it('update rating for that user', (done) => {
            let request = {
                method: 'POST',
                url: '/posts-stats/rate', payload: {postId: postId, rating: 'love'},
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return PostsStats.findOne({postId: postId})
                })
                .then((vc) => {
                    expect(vc).to.exist;
                    expect(vc.rating).to.equal('love');
                    done();
                })
                .catch(done);
        });
        after((done) => {
            blogsToClear.push('test POST /posts-stats/rate');
            postsToClear.push('test POST /posts-stats/rate');
            done();
        });
    });
    after((done) => {
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear}, done);
    });
});
