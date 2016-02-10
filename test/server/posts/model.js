'use strict';
let Posts = require('./../../../build/posts/model');
let Meals = require('./../../../build/posts/model');
let Blogs = require('./../../../build/blogs/model');
let UserGroups = require('./../../../build/user-groups/model');
let Audit = require('./../../../build/audit/model');
let _ = require('lodash');
let tu = require('./../testutils');
let Bluebird = require('bluebird');
let expect = require('chai').expect;
describe('Posts DAO', () => {
    let postsToClear = [];
    let blogsToClear = [];
    let userGroupsToClear = [];
    let blogId = Posts.ObjectID('54ec3cdbb25155f40ce6107e');
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    describe('Posts.create', () => {
        it('should create a new document and audit entry when it succeeds', (done) => {
            let error = null;
            //blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, contentType, content, by
            Posts.create(blogId, 'newPost', 'draft', 'public', true, true, ['testing', 'unit testing'], [], 'post', 'content', 'test')
                .then((post) => {
                    expect(post).to.exist;
                    expect(post).to.be.instanceof(Posts);
                    return Audit.findAudit('posts', post._id, {'change.action': 'create'});
                })
                .then((audit) => {
                    expect(audit).to.exist;
                    expect(audit.length).to.equal(1);
                    expect(audit[0].change[0].action).to.equal('create');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    postsToClear.push('newPost');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Posts.areValid', () => {
        it('should return empty array when nothing is sent', (done) => {
            let error = null;
            Posts.areValid([], 'silver lining')
                .then((result) => {
                    expect(result).to.be.empty;
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should return an object with as many entries as ids sent, appropriately populated', (done) => {
            let error = null;
            let postId = '';
            let bogus = '';
            Posts.create(blogId, 'test Posts.areValid', 'draft', 'public', true, true, ['testing', 'unit testing', 'activate'], [], 'post', 'some content', 'test')
                .then((p) => {
                    postId = p._id.toString();
                    bogus = Posts.ObjectID().toString();
                    return Posts.areValid([postId, bogus], 'silver lining');
                })
                .then((result) => {
                    expect(result).to.exist;
                    expect(result[postId]).to.be.true;
                    expect(result[bogus]).to.be.false;
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    postsToClear.push('test Posts.areValid');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Posts.this.activate/deactivate', () => {
        let activated = null;
        let deactivated = null;
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, by
            let p1 = Posts.create(blogId, 'activate', 'draft', 'public', true, true, ['testing', 'unit testing', 'activate'], [], 'post', 'content', 'test');
            let p2 = Posts.create(blogId, 'deactivate', 'published', 'public', true, true, ['testing', 'unit testing', 'deactivate'], [], 'post', 'content', 'test');
            Bluebird.join(p1, p2, (p11, p12) => {
                activated = p11;
                deactivated = p12;
                return deactivated.deactivate('test').save()
                    .then((d) => {
                        deactivated = d;
                        return Audit.remove({objectChangedId: d._id});
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
                    expect(a.isActive).to.be.true;
                    return Audit.findAudit('posts', a._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .then(() => {
                    return deactivated.deactivate('test').save();
                })
                .then((d) => {
                    expect(d.isActive).to.be.false;
                    return Audit.findAudit('posts', d._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
                    expect(a.isActive).to.be.false;
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
                    expect(d.isActive).to.be.true;
                    return Audit.findAudit('posts', d._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.equal('isActive');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
            //blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, by
            Posts.create(blogId, 'post.updateTitle', 'draft', 'public', true, true, ['testing', 'unit testing', 'setTitle'], [], 'post', 'content', 'test')
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
                    expect(err).to.not.exist;
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
                    expect(err).to.not.exist;
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
    describe('Posts.this.setAccess', () => {
        let testpost = null;
        before((done) => {
            //blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, by
            Posts.create(blogId, 'post.setAccess', 'draft', 'public', true, true, ['testing', 'unit testing', 'setAccess'], [], 'post', 'content', 'test')
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
                    expect(err).to.not.exist;
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
                    expect(err).to.not.exist;
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
            //blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, by
            Posts.create(blogId, 'post.setAllowComments', 'draft', 'public', true, true, ['testing', 'unit testing', 'setAllowComments'], [], 'post', 'content', 'test')
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
                    expect(err).to.not.exist;
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
                    expect(err).to.not.exist;
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
            //blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, by
            Posts.create(blogId, 'post.needsReview', 'draft', 'public', true, true, ['testing', 'unit testing', 'setNeedsReview'], [], 'post', 'content', 'test')
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
                    expect(err).to.not.exist;
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
                    expect(err).to.not.exist;
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
            //blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, by
            let p1 = Posts.create(blogId, 'addTags1', 'draft', 'public', true, true, ['testing', 'unit testing', 'addTags'], [], 'post', 'content', 'test');
            let p2 = Posts.create(blogId, 'addTags2', 'draft', 'public', true, true, ['testing', 'unit testing', 'addTags'], [], 'post', 'content', 'test');
            Bluebird.join(p1, p2).then(() => {
                done();
            });
        });
        it('should add a new entry to tags when a tag is newly added', (done) => {
            let error = null;
            Posts.findOne({title: 'addTags1'})
                .then((found) => {
                    return found.addTags(['newTag'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.tags, item => item === 'newTag')).to.exist;
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^add tag/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add tag/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the tag is already active in the group', (done) => {
            let error = null;
            Posts.findOne({title: 'addTags2'})
                .then((found) => {
                    return found.addTags(['testing'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.tags, item => item === 'testing')).to.exist;
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^add tag/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
            //blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, by
            let p1 = Posts.create(blogId, 'removeTags1', 'draft', 'public', true, true, ['testing', 'unit testing', 'removeTags'], [], 'post', 'content', 'test');
            let p2 = Posts.create(blogId, 'removeTags2', 'draft', 'public', true, true, ['testing', 'unit testing', 'removeTags'], [], 'post', 'content', 'test');
            Bluebird.join(p1, p2).then(() => {
                done();
            });
        });
        it('should do nothing if the tag is not present in the group', (done) => {
            let error = null;
            Posts.findOne({title: 'removeTags1'})
                .then((found) => {
                    return found.removeTags(['unknownTag'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.tags, item => item === 'unknownTag')).to.not.exist;
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^remove tag/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should remove tag if present', (done) => {
            let error = null;
            Posts.findOne({title: 'removeTags2'})
                .then((found) => {
                    return found.removeTags(['removeTags'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.tags, item => item === 'removeTags')).to.not.exist;
                    return Audit.findAudit('posts', p._id, {'change.action': {$regex: /^remove tag/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove tag/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
            Blogs.create('test post.populate', 'test.post.populate', [], [], [], [], 'true', 'public', false, 'test')
                .then((b) => {
                    return b.removeOwners(['test'], 'test').removeContributors(['test'], 'test').removeSubscribers(['test'], 'test').removeSubscriberGroups(['test'], 'test').save();
                })
                .then((b) => {
                    return Posts.create(b._id, 'test post.populate', 'published', 'public', false, false, ['testing', 'populate'], [], 'post', 'i have something to offer', 'test');
                })
                .then((p) => {
                    return Meals.create(p.blogId, 'test post.populate.meal', 'published', 'public', false, false, ['testing', 'populate'], [], 'meal', {recipes: [p._id]}, 'test');
                })
                .then(() => {
                    return UserGroups.create('test post.populate', 'test posts.populate', 'by');
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
                    return p.populate({email: 'one@first.com'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should load content and meals recipes if post is contentType meal', (done) => {
            let error = null;
            Posts.findOne({title: 'test post.populate.meal'})
                .then((post) => {
                    return post.setAccess('public').save();
                })
                .then((p) => {
                    return p.populate({email: 'one@first.com'});
                })
                .then((p) => {
                    expect(p.contentType).to.equal('meal');
                    expect(p.content.recipes).to.exist;
                    expect(p.content.recipes.length).to.equal(1);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
                    return p.populate({email: 'one@first.com'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
                    return p.populate({email: 'one@first.com'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
                    return p.populate({email: 'one@first.com'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
                    return p.populate({email: 'one@first.com'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
                    return p.populate({email: 'one@first.com'});
                })
                .then((p) => {
                    expect(p.content).to.equal('i have something to offer');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
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
                    return p.populate({email: 'one@first.com'});
                })
                .then((p) => {
                    expect(p.content).to.equal('restricted because you are not an owner, contributor or subscriber to this blog and it is not a public post');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        after((done) => {
            blogsToClear.push('test post.populate');
            postsToClear.push('test post.populate');
            postsToClear.push('test post.populate.meal');
            userGroupsToClear.push('test post.populate');
            done();
        });
    });
    after((done) => {
        return tu.cleanup({blogs: blogsToClear, posts: postsToClear, userGroups: userGroupsToClear}, done);
    });
});
