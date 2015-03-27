'use strict';
var relativeToServer = './../../../../server/';
var BaseModel = require('hapi-mongo-models').BaseModel;
var Posts = require(relativeToServer + 'blogs/posts/model');
var Audit = require(relativeToServer + 'audit/model');
var _ = require('lodash');
//var expect = require('chai').expect;
var tu = require('./../../testutils');
var Promise = require('bluebird');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

describe('Posts Model', function () {
    var postsToClear = [];
    var blogsToClear = [];
    var blogId = BaseModel.ObjectId('54ec3cdbb25155f40ce6107e');

    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                done();
            });
    });

    describe('Posts.create', function () {
        it('should create a new document and audit entry when it succeeds', function (done) {
            var error = null;
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            Posts.create(blogId, 'silver lining', 'newPost', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing'], [], 'test')
                .then(function (post) {
                    expect(post).to.exist();
                    expect(post).to.be.instanceof(Posts);
                    return Audit.findAudit('posts', post._id, {'change.action': 'create'});
                })
                .then(function (audit) {
                    expect(audit).to.exist();
                    expect(audit.length).to.equal(1);
                    expect(audit[0].change[0].action).to.equal('create');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    postsToClear.push('newPost');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Posts.this.activate/deactivate', function () {
        var activated = null, deactivated = null;
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'activate', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'activate'], [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'deactivate', 'published', 'public', true, true, 'testing', ['testing', 'unit testing', 'deactivate'], [], 'test');
            Promise.join(p1, p2, function (p11, p12) {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate('test').save()
                    .then(function (d) {
                        deactivated = d;
                        Audit.remove({objectChangedId: d._id}, function (err) {
                            if (err) {
                            }
                        });
                    });
            })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if the blog is already inactive/active and you deactivate/activate', function (done) {
            var error = null;
            activated.reactivate('test').save()
                .then(function (a) {
                    expect(a.isActive).to.be.true();
                    return Audit.findAudit('posts', a._id, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .then(function () {
                    return deactivated.deactivate('test').save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.false();
                    return Audit.findAudit('posts', d._id, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should mark the group as inactive / active when you deactivate / activate', function (done) {
            var error = null;
            activated.deactivate('test').save()
                .then(function (a) {
                    expect(a.isActive).to.be.false();
                    return Audit.findAudit('posts', a._id, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.equal('isActive');
                })
                .then(function () {
                    return deactivated.reactivate('test').save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.true();
                    return Audit.findAudit('posts', d._id, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.equal('isActive');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            postsToClear.push('activate');
            postsToClear.push('deactivate');
            done();
        });
    });

    describe('Posts.this.setTitle', function () {
        var testpost = null;
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.updateTitle', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setTitle'], [], 'test')
                .then(function (p) {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the title', function (done) {
            var error = null;
            testpost.setTitle(testpost.title, 'test').save()
                .then(function (p) {
                    expect(p.title).to.equal('post.updateTitle');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^title/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new title', function (done) {
            var error = null;
            testpost.setTitle('newTitle', 'test').save()
                .then(function (p) {
                    expect(p.title).to.equal('newTitle');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^title/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('newTitle');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            postsToClear.push('post.updateTitle');
            postsToClear.push('newTitle');
            done();
        });
    });

    describe('Posts.this.setCategory', function () {
        var testpost = null;
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setCategory', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'test')
                .then(function (p) {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the category', function (done) {
            var error = null;
            testpost.setCategory(testpost.category, 'test').save()
                .then(function (p) {
                    expect(p.category).to.equal('testing');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^category/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new category', function (done) {
            var error = null;
            testpost.setCategory('newCategory', 'test').save()
                .then(function (p) {
                    expect(p.category).to.equal('newCategory');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^category/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('newCategory');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            postsToClear.push('post.setCategory');
            done();
        });
    });

    describe('Posts.this.setAccess', function () {
        var testpost = null;
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setAccess', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'test')
                .then(function (p) {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the access', function (done) {
            var error = null;
            testpost.setAccess(testpost.access, 'test').save()
                .then(function (p) {
                    expect(p.access).to.equal('public');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^access/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new access', function (done) {
            var error = null;
            testpost.setAccess('restricted', 'test').save()
                .then(function (p) {
                    expect(p.access).to.equal('restricted');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^access/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('restricted');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            postsToClear.push('post.setAccess');
            done();
        });
    });

    describe('Posts.this.allowComments', function () {
        var testpost = null;
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setAllowComments', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'test')
                .then(function (p) {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the allowComments', function (done) {
            var error = null;
            testpost.setAllowComments(testpost.allowComments, 'test').save()
                .then(function (p) {
                    expect(p.allowComments).to.equal(true);
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^allowComments/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new allowComments', function (done) {
            var error = null;
            testpost.setAllowComments(false, 'test').save()
                .then(function (p) {
                    expect(p.allowComments).to.equal(false);
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^allowComments/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal(false);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            postsToClear.push('post.setAllowComments');
            done();
        });
    });

    describe('Posts.this.needsReview', function () {
        var testpost = null;
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.needsReview', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'test')
                .then(function (p) {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the needsReview', function (done) {
            var error = null;
            testpost.setNeedsReview(testpost.needsReview, 'test').save()
                .then(function (p) {
                    expect(p.needsReview).to.equal(true);
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^needsReview/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new needsReview', function (done) {
            var error = null;
            testpost.setNeedsReview(false, 'test').save()
                .then(function (p) {
                    expect(p.needsReview).to.equal(false);
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^needsReview/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal(false);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            postsToClear.push('post.needsReview');
            done();
        });
    });

    describe('Posts.this.addTags', function () {
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'addTags1', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'addTags'], [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'addTags2', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'addTags'], [], 'test');
            Promise.join(p1, p2).then(function () {
                done();
            });
        });
        it('should add a new entry to tags when a tag is newly added', function (done) {
            var error = null;
            Posts._findOne({title: 'addTags1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['newTag'], 'tags', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.tags, 'newTag')).to.exist();
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^add tag/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add tag/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the tag is already active in the group', function (done) {
            var error = null;
            Posts._findOne({title: 'addTags2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['testing'], 'tags', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.tags, 'testing')).to.exist();
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^add tag/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            postsToClear.push('addTags1');
            postsToClear.push('addTags2');
            done();
        });
    });

    describe('Posts.this.removeTags', function () {
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'removeTags1', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'removeTags'], [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'removeTags2', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'removeTags'], [], 'test');
            Promise.join(p1, p2).then(function () {
                done();
            });
        });
        it('should do nothing if the tag is not present in the group', function (done) {
            var error = null;
            Posts._findOne({title: 'removeTags1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['unknownTag'], 'tags', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.tags, 'unknownTag')).to.not.exist();
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^remove tag/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should remove tag if present', function (done) {
            var error = null;
            Posts._findOne({title: 'removeTags2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['removeTags'], 'tags', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.tags, 'removeTags')).to.not.exist();
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^remove tag/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove tag/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function (done) {
            postsToClear.push('removeTags1');
            postsToClear.push('removeTags2');
            done();
        });
    });

    after(function (done) {
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear}, done);
    });
});
