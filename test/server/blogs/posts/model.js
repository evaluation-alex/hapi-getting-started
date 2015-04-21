'use strict';
let relativeToServer = './../../../../server/';
let Posts = require(relativeToServer + 'blogs/posts/model');
let Blogs = require(relativeToServer + 'blogs/model');
let UserGroups = require(relativeToServer + 'user-groups/model');
let Audit = require(relativeToServer + 'audit/model');
let _ = require('lodash');
let tu = require('./../../testutils');
let Bluebird = require('bluebird');
let Code = require('code');
//let Lab = require('lab');
//let lab = exports.lab = Lab.script();
//let describe = lab.describe;
//let it = lab.it;
//let before = lab.before;
//let after = lab.after;
let expect = Code.expect;
describe('Posts Model', () => {
    let postsToClear = [];
    let blogsToClear = [];
    let userGroupsToClear = [];
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
            Posts.create(blogId, 'silver lining', 'newPost', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing'], [], 'post', 'content', 'test')
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
            let p1 = Posts.create(blogId, 'silver lining', 'activate', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'activate'], [], 'post', 'content', 'test');
            let p2 = Posts.create(blogId, 'silver lining', 'deactivate', 'published', 'public', true, true, 'testing', ['testing', 'unit testing', 'deactivate'], [], 'post', 'content', 'test');
            Bluebird.join(p1, p2, (p11, p12) => {
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
            Posts.create(blogId, 'silver lining', 'post.updateTitle', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setTitle'], [], 'post', 'content', 'test')
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
            Posts.create(blogId, 'silver lining', 'post.setCategory', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setCategory'], [], 'post', 'content', 'test')
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
            Posts.create(blogId, 'silver lining', 'post.setAccess', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setAccess'], [], 'post', 'content', 'test')
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
            Posts.create(blogId, 'silver lining', 'post.setAllowComments', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setAllowComments'], [], 'post', 'content', 'test')
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
            Posts.create(blogId, 'silver lining', 'post.needsReview', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'setNeedsReview'], [], 'post', 'content', 'test')
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
            let p1 = Posts.create(blogId, 'silver lining', 'addTags1', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'addTags'], [], 'post', 'content', 'test');
            let p2 = Posts.create(blogId, 'silver lining', 'addTags2', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'addTags'], [], 'post', 'content', 'test');
            Bluebird.join(p1, p2).then(() => {
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
            let p1 = Posts.create(blogId, 'silver lining', 'removeTags1', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'removeTags'], [], 'post', 'content', 'test');
            let p2 = Posts.create(blogId, 'silver lining', 'removeTags2', 'draft', 'public', true, true, 'testing', ['testing', 'unit testing', 'removeTags'], [], 'post', 'content', 'test');
            Bluebird.join(p1, p2).then(() => {
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
    describe('Posts.this.populate', () => {
        before((done) => {
            Blogs.create('test post.populate', 'silver lining', 'test.post.populate', [], [], [], [], 'true', 'public', false, 'test')
                .then((b) => {
                    return b.removeOwners(['test'], 'test').removeContributors(['test'], 'test').removeSubscribers(['test'], 'test').removeSubscriberGroups(['test'], 'test').save();
                })
                .then((b) => {
                    return Posts.create(b._id, 'silver lining', 'test post.populate', 'published', 'public', false, false, 'testing', ['testing', 'populate'], [], 'post', 'i have something to offer', 'test');
                })
                .then(() => {
                    return UserGroups.create('test post.populate', 'silver lining', 'test posts.populate', 'by');
                })
                .then((g) => {
                    return g.removeOwners(['test'], 'test').removeMembers(['test'], 'test').addMembers(['one@first.com'], 'test').save();
                })
                .then(() => {
                    done();
                });
        });
        it('should load content if post.access if public', (done) => {
            let error = null;
            Posts.findOne({title: 'test post.populate'})
                .then((post) => {
                    return post.setAccess('public').save();
                })
                .then((p) => {
                    return p.populate({email:'one@first.com', organisation: 'silver lining'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should load content if post.access is not public, but blog.access is public', (done) => {
            let error = null;
            Blogs.findOne({title: 'test post.populate'})
            .then((blog) => {
                    return blog.setAccess('public').save();
                })
                .then(() => {
                    return Posts.findOne({title: 'test post.populate'});
                })
                .then((post) => {
                    return post.setAccess('restricted').save();
                })
                .then((p) => {
                    return p.populate({email:'one@first.com', organisation: 'silver lining'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should load content if post, blog.access is restricted and user is member of owners group', (done) => {
            let error = null;
            Blogs.findOne({title: 'test post.populate'})
                .then((blog) => {
                    return blog.setAccess('restricted').addOwners(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return Posts.findOne({title: 'test post.populate'});
                })
                .then((post) => {
                    return post.setAccess('restricted').save();
                })
                .then((p) => {
                    return p.populate({email:'one@first.com', organisation: 'silver lining'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should load content if post, blog.access is restricted and user is member of subscribers group', (done) => {
            let error = null;
            Blogs.findOne({title: 'test post.populate'})
                .then((blog) => {
                    return blog.setAccess('restricted').removeOwners(['one@first.com'], 'test').addSubscribers(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return Posts.findOne({title: 'test post.populate'});
                })
                .then((post) => {
                    return post.setAccess('restricted').save();
                })
                .then((p) => {
                    return p.populate({email:'one@first.com', organisation: 'silver lining'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should load content if post, blog.access is restricted and user is member of contributors group', (done) => {
            let error = null;
            Blogs.findOne({title: 'test post.populate'})
                .then((blog) => {
                    return blog.setAccess('restricted').removeOwners(['one@first.com'], 'test').removeSubscribers(['one@first.com'], 'test').addContributors(['one@first.com'], 'test').save();
                })
                .then(() => {
                    return Posts.findOne({title: 'test post.populate'});
                })
                .then((post) => {
                    return post.setAccess('restricted').save();
                })
                .then((p) => {
                    return p.populate({email:'one@first.com', organisation: 'silver lining'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should load content if post, blog.access is restricted and user is member of usergroup that is in subscribers group', (done) => {
            let error = null;
            Blogs.findOne({title: 'test post.populate'})
                .then((blog) => {
                    return blog.setAccess('restricted').removeOwners(['one@first.com'], 'test').removeSubscribers(['one@first.com'], 'test').removeContributors(['one@first.com'], 'test').addSubscriberGroups(['test post.populate'], 'test').save();
                })
                .then(() => {
                    return Posts.findOne({title: 'test post.populate'});
                })
                .then((post) => {
                    return post.setAccess('restricted').save();
                })
                .then((p) => {
                    return p.populate({email:'one@first.com', organisation: 'silver lining'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should not load content if post, blog.access is restricted and user is not member of usergroup that is in subscribers group, or member of subscribers, owners or contributors', (done) => {
            let error = null;
            Blogs.findOne({title: 'test post.populate'})
                .then((blog) => {
                    return blog.setAccess('restricted').removeOwners(['one@first.com'], 'test').removeSubscribers(['one@first.com'], 'test').removeContributors(['one@first.com'], 'test').removeSubscriberGroups(['test post.populate'], 'test').save();
                })
                .then(() => {
                    return Posts.findOne({title: 'test post.populate'});
                })
                .then((post) => {
                    return post.setAccess('restricted').save();
                })
                .then((p) => {
                    return p.populate({email:'one@first.com', organisation: 'silver lining'});
                })
                .then((p) => {
                    expect(p.content).to.equal('restricted because you are not an owner, contributor or subscriber to this blog and it is not a public post');
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
            blogsToClear.push('test post.populate');
            postsToClear.push('test post.populate');
            userGroupsToClear.push('test post.populate');
            done();
        });
    });
    after((done) => {
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear, userGroups: userGroupsToClear}, done);
    });
});
