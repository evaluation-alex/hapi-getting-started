'use strict';
let relativeToServer = './../../../../server/';
let Posts = require(relativeToServer + 'blogs/posts/model');
let Audit = require(relativeToServer + 'audit/model');
let _ = require('lodash');
let tu = require('./../../testutils');
let Promise = require('bluebird');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Posts Model', () => {
    let postsToClear = [];
    let blogsToClear = [];
    let blogId = Posts.ObjectId('54ec3cdbb25155f40ce6107e');
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    describe('Posts.create', () => {
        it('should create a new document and audit entry when it succeeds', (done) => {
            let error = null;
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            Posts.create(blogId, 'silver lining', 'newPost', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing'], [], 'test')
                .then((post) => {
                    expect(post).to.exist();
                    expect(post).to.be.instanceof(Posts);
                    return Audit.findAudit('posts', post._id, {'change.action': 'create'});
                })
                .then((audit) => {
                    expect(audit).to.exist();
                    expect(audit.length).to.equal(1);
                    expect(audit[0].change[0].action).to.equal('create');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    postsToClear.push('newPost');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Posts.this.activate/deactivate', () => {
        let activated = null, deactivated = null;
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            let p1 = Posts.create(blogId, 'silver lining', 'activate', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'activate'], [], 'test');
            let p2 = Posts.create(blogId, 'silver lining', 'deactivate', 'published', 'public', true, true, 'testing', ['testing', 'unit testing', 'deactivate'], [], 'test');
            Promise.join(p1, p2, (p11, p12) => {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate('test').save()
                    .then((d) => {
                        deactivated = d;
                        Audit.remove({objectChangedId: d._id});
                    });
            })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if the blog is already inactive/active and you deactivate/activate', (done) => {
            let error = null;
            activated.reactivate('test').save()
                .then((a) => {
                    expect(a.isActive).to.be.true();
                    return Audit.findAudit('posts', a._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .then(() => {
                    return deactivated.deactivate('test').save();
                })
                .then((d) => {
                    expect(d.isActive).to.be.false();
                    return Audit.findAudit('posts', d._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should mark the group as inactive / active when you deactivate / activate', (done) => {
            let error = null;
            activated.deactivate('test').save()
                .then((a) => {
                    expect(a.isActive).to.be.false();
                    return Audit.findAudit('posts', a._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.equal('isActive');
                })
                .then(() => {
                    return deactivated.reactivate('test').save();
                })
                .then((d) => {
                    expect(d.isActive).to.be.true();
                    return Audit.findAudit('posts', d._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.equal('isActive');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            postsToClear.push('activate');
            postsToClear.push('deactivate');
            done();
        });
    });
    describe('Posts.this.setTitle', () => {
        let testpost = null;
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.updateTitle', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setTitle'], [], 'test')
                .then((p) => {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the title', (done) => {
            let error = null;
            testpost.setTitle(testpost.title, 'test').save()
                .then((p) => {
                    expect(p.title).to.equal('post.updateTitle');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^title/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new title', (done) => {
            let error = null;
            testpost.setTitle('newTitle', 'test').save()
                .then((p) => {
                    expect(p.title).to.equal('newTitle');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^title/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('newTitle');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            postsToClear.push('post.updateTitle');
            postsToClear.push('newTitle');
            done();
        });
    });
    describe('Posts.this.setCategory', () => {
        let testpost = null;
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setCategory', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'test')
                .then((p) => {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the category', (done) => {
            let error = null;
            testpost.setCategory(testpost.category, 'test').save()
                .then((p) => {
                    expect(p.category).to.equal('testing');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^category/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new category', (done) => {
            let error = null;
            testpost.setCategory('newCategory', 'test').save()
                .then((p) => {
                    expect(p.category).to.equal('newCategory');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^category/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('newCategory');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            postsToClear.push('post.setCategory');
            done();
        });
    });
    describe('Posts.this.setAccess', () => {
        let testpost = null;
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setAccess', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'test')
                .then((p) => {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the access', (done) => {
            let error = null;
            testpost.setAccess(testpost.access, 'test').save()
                .then((p) => {
                    expect(p.access).to.equal('public');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^access/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new access', (done) => {
            let error = null;
            testpost.setAccess('restricted', 'test').save()
                .then((p) => {
                    expect(p.access).to.equal('restricted');
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^access/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('restricted');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            postsToClear.push('post.setAccess');
            done();
        });
    });
    describe('Posts.this.allowComments', () => {
        let testpost = null;
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setAllowComments', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'test')
                .then((p) => {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the allowComments', (done) => {
            let error = null;
            testpost.setAllowComments(testpost.allowComments, 'test').save()
                .then((p) => {
                    expect(p.allowComments).to.equal(true);
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^allowComments/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new allowComments', (done) => {
            let error = null;
            testpost.setAllowComments(false, 'test').save()
                .then((p) => {
                    expect(p.allowComments).to.equal(false);
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^allowComments/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal(false);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            postsToClear.push('post.setAllowComments');
            done();
        });
    });
    describe('Posts.this.needsReview', () => {
        let testpost = null;
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.needsReview', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'test')
                .then((p) => {
                    testpost = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the needsReview', (done) => {
            let error = null;
            testpost.setNeedsReview(testpost.needsReview, 'test').save()
                .then((p) => {
                    expect(p.needsReview).to.equal(true);
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^needsReview/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should update to the new needsReview', (done) => {
            let error = null;
            testpost.setNeedsReview(false, 'test').save()
                .then((p) => {
                    expect(p.needsReview).to.equal(false);
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^needsReview/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal(false);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            postsToClear.push('post.needsReview');
            done();
        });
    });
    describe('Posts.this.addTags', () => {
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            let p1 = Posts.create(blogId, 'silver lining', 'addTags1', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'addTags'], [], 'test');
            let p2 = Posts.create(blogId, 'silver lining', 'addTags2', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'addTags'], [], 'test');
            Promise.join(p1, p2).then(() => {
                done();
            });
        });
        it('should add a new entry to tags when a tag is newly added', (done) => {
            let error = null;
            Posts.findOne({title: 'addTags1', organisation: 'silver lining'})
                .then((found) => {
                    return found.addTags(['newTag'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.tags, 'newTag')).to.exist();
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^add tag/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add tag/);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the tag is already active in the group', (done) => {
            let error = null;
            Posts.findOne({title: 'addTags2', organisation: 'silver lining'})
                .then((found) => {
                    return found.addTags(['testing'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.tags, 'testing')).to.exist();
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^add tag/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            postsToClear.push('addTags1');
            postsToClear.push('addTags2');
            done();
        });
    });
    describe('Posts.this.removeTags', () => {
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, by
            let p1 = Posts.create(blogId, 'silver lining', 'removeTags1', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'removeTags'], [], 'test');
            let p2 = Posts.create(blogId, 'silver lining', 'removeTags2', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'removeTags'], [], 'test');
            Promise.join(p1, p2).then(() => {
                done();
            });
        });
        it('should do nothing if the tag is not present in the group', (done) => {
            let error = null;
            Posts.findOne({title: 'removeTags1', organisation: 'silver lining'})
                .then((found) => {
                    return found.removeTags(['unknownTag'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.tags, 'unknownTag')).to.not.exist();
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^remove tag/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should remove tag if present', (done) => {
            let error = null;
            Posts.findOne({title: 'removeTags2', organisation: 'silver lining'})
                .then((found) => {
                    return found.removeTags(['removeTags'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.tags, 'removeTags')).to.not.exist();
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^remove tag/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove tag/);
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            postsToClear.push('removeTags1');
            postsToClear.push('removeTags2');
            done();
        });
    });
    after((done) => {
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear}, done);
    });
});
