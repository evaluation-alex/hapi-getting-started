'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let relativeToServer = './../../../server/';
let Blogs = require(relativeToServer + 'blogs/model');
let Audit = require(relativeToServer + 'audit/model');
let UserGroups = require(relativeToServer + 'user-groups/model');
let _ = require('lodash');
let tu = require('./../testutils');
let Bluebird = require('bluebird');
let expect = require('chai').expect;
describe('Blogs Model', () => {
    let blogsToClear = [];
    let groupsToClear = [];
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    describe('Blogs.create', () => {
        it('should create a new document and audit entry when it succeeds', (done) => {
            let error = null;
            Blogs.create('newBlog', 'silver lining', 'Blog.create testing', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    expect(p).to.exist;
                    expect(p).to.be.an.instanceof(Blogs);
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /create/}});
                })
                .then((paudit) => {
                    expect(paudit).to.exist;
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0]).to.be.instanceof(Audit);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    blogsToClear.push('newBlog');
                    tu.testComplete(done, error);
                });
        });
        it('should not allow two objects with the same title', (done) => {
            let error = null;
            Blogs.create('dupeBlog', 'silver lining', 'Blog.create dupe test', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    expect(p).to.exist;
                    expect(p).to.be.an.instanceof(Blogs);
                })
                .then(() => {
                    Blogs.create('dupeBlog', 'silver lining', 'Blog.create dupe test', [], [], [], [], false, 'public', true, 'test')
                        .then((p) => {
                            expect(p).to.not.exist;
                        })
                        .catch((err) => {
                            expect(err).to.exist;
                        });
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    blogsToClear.push('dupeBlog');
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Blogs.this.addUsers', () => {
        before((done) => {
            UserGroups.create('testBlogAddUsers', 'silver lining', 'testing blog.addUsers', 'test')
                .then(() => {
                    return Blogs.create('addUsers1', 'silver lining', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'], false, 'public', true, 'test');
                })
                .then(() => {
                    return Blogs.create('addUsers2', 'silver lining', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'], false, 'public', true, 'test');
                })
                .then(() => {
                    return Blogs.create('addUsers3', 'silver lining', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'], false, 'public', true, 'test');
                })
                .then(() => {
                    done();
                })
                .catch((err) => {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should add a new entry to users when user/group is newly added', (done) => {
            let error = null;
            Blogs.findOne({title: 'addUsers1', organisation: 'silver lining'})
                .then((found) => {
                    return found.addSubscriberGroups(['newUserGroup'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.subscriberGroups, 'newUserGroup')).to.exist;
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^add subscriberGroup/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add subscriberGroup/);
                    return Blogs.findOne({title: 'addUsers1', organisation: 'silver lining'});
                })
                .then((found) => {
                    return found.addSubscribers(['newSubscriber'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.subscribers, 'newSubscriber')).to.exist;
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^add subscribers/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add subscribers/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user/group is already active in the group', (done) => {
            let error = null;
            Blogs.findOne({title: 'addUsers2', organisation: 'silver lining'})
                .then((found) => {
                    return found.addSubscriberGroups(['testBlogAddUsers'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.subscriberGroups, 'testBlogAddUsers')).to.exist;
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^add subscriberGroup/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                    return Blogs.findOne({title: 'addUsers2', organisation: 'silver lining'});
                })
                .then((found) => {
                    return found.addOwners(['directlyadded'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.owners, 'directlyadded')).to.exist;
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^add owner/}});
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
            groupsToClear.push('testBlogAddUsers');
            blogsToClear.push('addUsers1');
            blogsToClear.push('addUsers2');
            blogsToClear.push('addUsers3');
            done();
        });
    });
    describe('Blogs.this.removeUsers', () => {
        before((done) => {
            Blogs.create('removeUsers1', 'silver lining', 'blog.removeUsers', ['directlyadded'], [], [], ['testBlogsRemoveUsers'], false, 'public', true, 'test')
                .then(() => {
                    done();
                })
                .catch((err) => {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should do nothing if the user/group is not present in the group', (done) => {
            let error = null;
            Blogs.findOne({title: 'removeUsers1', organisation: 'silver lining'})
                .then((found) => {
                    return found.removeSubscriberGroups(['unknownGroup'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.subscriberGroups, 'unknownGroup')).to.not.exist;
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^remove subscriberGroup/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                    return Blogs.findOne({title: 'removeUsers1', organisation: 'silver lining'});
                })
                .then((found) => {
                    return found.removeSubscribers(['unknownUser'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.subscribers, 'unknownUser')).to.not.exist;
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^remove subscriber/}});
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
        it('should remove user/group if present', (done) => {
            let error = null;
            Blogs.findOne({title: 'removeUsers1', organisation: 'silver lining'})
                .then((found) => {
                    return found.removeSubscriberGroups(['testBlogsRemoveUsers'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.subscriberGroups, 'testBlogsRemoveUsers')).to.not.exist;
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^remove subscriberGroups/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove subscriberGroup/);
                    return Blogs.findOne({title: 'removeUsers1', organisation: 'silver lining'});
                })
                .then((found) => {
                    return found.removeOwners(['directlyadded'], 'test').save();
                })
                .then((p) => {
                    expect(_.findWhere(p.owners, 'directlyadded')).to.not.exist;
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^remove owner/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove owner/);
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
            blogsToClear.push('removeUsers1');
            done();
        });
    });
    describe('Blogs.this.activate/deactivate', () => {
        let activated = null;
        let deactivated = null;
        before((done) => {
            let p1 = Blogs.create('activated', 'silver lining', 'blog.activate, deactivate', [], [], [], [], false, 'public', true, 'test');
            let p2 = Blogs.create('deactivated', 'silver lining', 'blog.deactive, activate', [], [], [], [], false, 'public', true, 'test');
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
                    return Audit.findAudit('blogs', a._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(0);
                })
                .then(() => {
                    return deactivated.deactivate('test').save();
                })
                .then((d) => {
                    expect(d.isActive).to.be.false;
                    return Audit.findAudit('blogs', d._id, {'change.action': {$regex: /^isActive/}});
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
                    return Audit.findAudit('blogs', a._id, {'change.action': {$regex: /^isActive/}});
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
                    return Audit.findAudit('blogs', d._id, {'change.action': {$regex: /^isActive/}});
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
            blogsToClear.push('activated');
            blogsToClear.push('deactivated');
            done();
        });
    });
    describe('Blogs.this.setDescription', () => {
        let testblog = null;
        before((done) => {
            Blogs.create('updateDesc1', 'silver lining', 'blog.updateDesc', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the description', (done) => {
            let error = null;
            testblog.setDescription(testblog.description, 'test').save()
                .then((p) => {
                    expect(p.description).to.equal('blog.updateDesc');
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^description/}});
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
        it('should update to the new description', (done) => {
            let error = null;
            testblog.setDescription('newDescription', 'test').save()
                .then((p) => {
                    expect(p.description).to.equal('newDescription');
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^description/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('newDescription');
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
            blogsToClear.push('updateDesc1');
            blogsToClear.push('newDescription');
            done();
        });
    });
    describe('Blogs.this.setAccess', () => {
        let testblog = null;
        before((done) => {
            Blogs.create('setAccess', 'silver lining', 'blog.setAccess', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the access', (done) => {
            let error = null;
            testblog.setAccess(testblog.access, 'test').save()
                .then((p) => {
                    expect(p.access).to.equal('public');
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^access/}});
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
            testblog.setAccess('restricted', 'test').save()
                .then((p) => {
                    expect(p.access).to.equal('restricted');
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^access/}});
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
            blogsToClear.push('setAccess');
            done();
        });
    });
    describe('Blogs.this.needsReview', () => {
        let testblog = null;
        before((done) => {
            Blogs.create('needsReview', 'silver lining', 'blog.setNeedsReview', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the needsReview', (done) => {
            let error = null;
            testblog.setNeedsReview(testblog.needsReview, 'test').save()
                .then((p) => {
                    expect(p.access).to.equal('public');
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^needsReview/}});
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
            testblog.setNeedsReview(true, 'test').save()
                .then((p) => {
                    expect(p.needsReview).to.equal(true);
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^needsReview/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal(true);
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
            blogsToClear.push('needsReview');
            done();
        });
    });
    describe('Blogs.this.allowComments', () => {
        let testblog = null;
        before((done) => {
            Blogs.create('allowComments', 'silver lining', 'blog.allowComments', [], [], [], [], false, 'public', true, 'test')
                .then((p) => {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the allowComments', (done) => {
            let error = null;
            testblog.setAllowComments(testblog.allowComments, 'test').save()
                .then((p) => {
                    expect(p.allowComments).to.equal(true);
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^allowComments/}});
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
            testblog.setAllowComments(false, 'test').save()
                .then((p) => {
                    expect(p.allowComments).to.equal(false);
                    return Audit.findAudit('blogs', p._id, {'change.action': {$regex: /^allowComments/}});
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
            blogsToClear.push('allowComments');
            done();
        });
    });
    after((done) => {
        return tu.cleanup({userGroups: groupsToClear, blogs: blogsToClear}, done);
    });
});
