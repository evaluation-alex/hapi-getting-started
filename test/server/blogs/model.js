'use strict';
var relativeToServer = './../../../server/';

var Blogs = require(relativeToServer + 'blogs/model');
var Audit = require(relativeToServer + 'audit/model');
var BaseModel = require('hapi-mongo-models').BaseModel;
var UserGroups = require(relativeToServer + 'user-groups/model');
var _ = require('lodash');
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Promise = require('bluebird');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

describe('Blogs Model', function () {
    var blogsToClear = [];
    var groupsToClear = [];

    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                done();
            });
    });

    describe('Blogs.create', function () {
        it('should create a new document and audit entry when it succeeds', function (done) {
            var error = null;
            Blogs.create('newBlog', 'silver lining', 'Blog.create testing', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Blogs);
                    return Audit.findAudit('blogs', 'newBlog', {'change.action': {$regex: /create/}});
                })
                .then(function (paudit) {
                    expect(paudit).to.exist();
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0]).to.be.instanceof(Audit);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    blogsToClear.push('newBlog');
                    tu.testComplete(done, error);
                });
        });
        it('should not allow two objects with the same title', function (done) {
            var error = null;
            Blogs.create('dupeBlog', 'silver lining', 'Blog.create dupe test', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Blogs);
                })
                .then(function () {
                    Blogs.create('dupeBlog', 'silver lining', 'Blog.create dupe test', [], [], [], [], false, 'public', true, 'test')
                        .then(function (p) {
                            expect(p).to.not.exist();
                        })
                        .catch(function (err) {
                            expect(err).to.exist();
                        });
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    blogsToClear.push('dupeBlog');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Blogs.isValid', function () {
        it ('should return with a not found message when blog does not exist', function (done) {
            var error = null;
            Blogs.isValid(BaseModel.ObjectID(null), 'unknown', ['owners'])
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.equal('not found');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it ('should return with not an owner when the owner argument is not an owner (active or otherwise)', function (done) {
            var error = null;
            Blogs.create('isValidTest', 'silver lining', 'Blog.isValid test', [], [], [], [], false, 'public', true, 'test')
                .then(function(b) {
                    return Blogs.isValid(b._id, 'unknown', ['owners']);
                })
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.match(/not permitted/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    blogsToClear.push('isValidTest');
                    tu.testComplete(done, error);
                });
        });
        it ('should return valid when the blog exists and the owner is an active owner', function (done) {
            var error = null;
            Blogs.create('isValidTest2', 'silver lining', 'Blog.isValid test2', ['validOwner'], [], [], [], false, 'public', true, 'test')
                .then(function(b) {
                    return Blogs.isValid(b._id, 'validOwner', ['owners']);
                })
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.equal('valid');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    blogsToClear.push('isValidTest2');
                    tu.testComplete(done, error);
                });
        });
        it ('should return valid when the group exists and we pass root as owner', function (done) {
            var error = null;
            Blogs.create('isValidTest3', 'silver lining', 'Blog.isValid test3', ['validOwner'], [], [], [], false, 'public', true, 'test')
                .then(function(b) {
                    return Blogs.isValid(b._id, 'root', ['owners']);
                })
                .then(function (m) {
                    expect(m).to.exist();
                    expect(m.message).to.equal('valid');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    blogsToClear.push('isValidTest3');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Blogs.this.addUsers', function () {
        before(function (done) {
            UserGroups.create('testBlogAddUsers', 'silver lining', 'testing blog.addUsers', 'test')
                .then(function() {
                    return Blogs.create('addUsers1', 'silver lining', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'], false, 'public', true, 'test');
                })
                .then(function() {
                    return Blogs.create('addUsers2', 'silver lining', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'], false, 'public', true, 'test');
                })
                .then(function () {
                    return Blogs.create('addUsers3', 'silver lining', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'], false, 'public', true, 'test');
                })
                .then(function() {
                    done();
                })
                .catch(function(err) {
                    if(err) {
                        done(err);
                    }
                });
        });
        it('should add a new entry to users when user/group is newly added', function (done) {
            var error = null;
            Blogs._findOne({title: 'addUsers1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['newUserGroup'], 'groups', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscriberGroups, 'newUserGroup')).to.exist();
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^add group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add group/);
                    return Blogs._findOne({title: 'addUsers1', organisation: 'silver lining'});
                })
                .then(function (found) {
                    return found.add(['newSubscriber'], 'subscriber', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscribers, 'newSubscriber')).to.exist();
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^add subscriber/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add subscriber/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the user/group is already active in the group', function (done) {
            var error = null;
            Blogs._findOne({title: 'addUsers2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['testBlogAddUsers'], 'groups', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscriberGroups, 'testBlogAddUsers')).to.exist();
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^add group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Blogs._findOne({title: 'addUsers2', organisation: 'silver lining'});
                })
                .then(function (found) {
                    return found.add(['directlyadded'], 'owners', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.owners, 'directlyadded')).to.exist();
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^add owner/}});
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
            groupsToClear.push('testBlogAddUsers');
            blogsToClear.push('addUsers1');
            blogsToClear.push('addUsers2');
            blogsToClear.push('addUsers3');
            done();
        });
    });

    describe('Blogs.this.removeUsers', function () {
        before(function (done) {
            Blogs.create('removeUsers1', 'silver lining', 'blog.removeUsers', ['directlyadded'], [], [], ['testBlogsRemoveUsers'], false, 'public', true, 'test')
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should do nothing if the user/group is not present in the group', function (done) {
            var error = null;
            Blogs._findOne({title: 'removeUsers1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['unknownGroup'], 'groups', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscriberGroups, 'unknownGroup')).to.not.exist();
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^remove group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Blogs._findOne({title: 'removeUsers1', organisation: 'silver lining'});
                })
                .then(function (found) {
                    return found.remove(['unknownUser'], 'subscriber', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscribers, 'unknownUser')).to.not.exist();
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^remove subscriber/}});
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
        it('should remove user/group if present', function (done) {
            var error = null;
            Blogs._findOne({title: 'removeUsers1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['testBlogsRemoveUsers'], 'groups', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscriberGroups, 'testBlogsRemoveUsers')).to.not.exist();
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^remove group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove group/);
                    return Blogs._findOne({title:'removeUsers1', organisation:'silver lining'});
                })
                .then(function (found) {
                    return found.remove(['directlyadded'], 'owner', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.owners, 'directlyadded')).to.not.exist();
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^remove owner/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove owner/);
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
            blogsToClear.push('removeUsers1');
            done();
        });
    });

    describe('Blogs.this.activate/deactivate', function () {
        var activated = null, deactivated = null;
        before(function (done) {
            var p1 = Blogs.create('activated', 'silver lining', 'blog.activate, deactivate', [], [], [], [], false, 'public', true, 'test');
            var p2 = Blogs.create('deactivated', 'silver lining', 'blog.deactive, activate', [], [], [], [], false, 'public', true, 'test');
            Promise.join(p1, p2, function (p11, p12) {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate('test').save()
                    .then(function (d) {
                        deactivated = d;
                        Audit.remove({objectChangedId: d.title}, function (err) {
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
                    return Audit.findAudit('blogs',  a.title, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .then(function () {
                    return deactivated.deactivate('test').save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.false();
                    return Audit.findAudit('blogs',  d.title, {'change.action': {$regex: /^isActive/}});
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
                    return Audit.findAudit('blogs',  a.title, {'change.action': {$regex: /^isActive/}});
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
                    return Audit.findAudit('blogs',  d.title, {'change.action': {$regex: /^isActive/}});
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
            blogsToClear.push('activated');
            blogsToClear.push('deactivated');
            done();
        });
    });

    describe('Blogs.this.setDescription', function () {
        var testblog = null;
        before(function (done) {
            Blogs.create('updateDesc1', 'silver lining', 'blog.updateDesc', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the description', function (done) {
            var error = null;
            testblog.setDescription(testblog.description, 'test').save()
                .then(function (p) {
                    expect(p.description).to.equal('blog.updateDesc');
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^description/}});
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
        it('should update to the new description', function (done) {
            var error = null;
            testblog.setDescription('newDescription', 'test').save()
                .then(function (p) {
                    expect(p.description).to.equal('newDescription');
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^description/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('newDescription');
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
            blogsToClear.push('updateDesc1');
            blogsToClear.push('newDescription');
            done();
        });
    });

    describe('Blogs.this.setAccess', function () {
        var testblog = null;
        before(function (done) {
            Blogs.create('setAccess', 'silver lining', 'blog.setAccess', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the access', function (done) {
            var error = null;
            testblog.setAccess(testblog.access, 'test').save()
                .then(function (p) {
                    expect(p.access).to.equal('public');
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^access/}});
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
            testblog.setAccess('restricted', 'test').save()
                .then(function (p) {
                    expect(p.access).to.equal('restricted');
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^access/}});
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
            blogsToClear.push('setAccess');
            done();
        });
    });

    describe('Blogs.this.needsReview', function () {
        var testblog = null;
        before(function (done) {
            Blogs.create('needsReview', 'silver lining', 'blog.setNeedsReview', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the needsReview', function (done) {
            var error = null;
            testblog.setNeedsReview(testblog.needsReview, 'test').save()
                .then(function (p) {
                    expect(p.access).to.equal('public');
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^needsReview/}});
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
            testblog.setNeedsReview(true, 'test').save()
                .then(function (p) {
                    expect(p.needsReview).to.equal(true);
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^needsReview/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal(true);
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
            blogsToClear.push('needsReview');
            done();
        });
    });

    describe('Blogs.this.allowComments', function () {
        var testblog = null;
        before(function (done) {
            Blogs.create('allowComments', 'silver lining', 'blog.allowComments', [], [], [], [], false, 'public', true, 'test')
                .then(function (p) {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the allowComments', function (done) {
            var error = null;
            testblog.setAllowComments(testblog.allowComments, 'test').save()
                .then(function (p) {
                    expect(p.allowComments).to.equal(true);
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^allowComments/}});
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
            testblog.setAllowComments(false, 'test').save()
                .then(function (p) {
                    expect(p.allowComments).to.equal(false);
                    return Audit.findAudit('blogs',  p.title, {'change.action': {$regex: /^allowComments/}});
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
            blogsToClear.push('allowComments');
            done();
        });
    });

    after(function (done) {
        return tu.cleanup({userGroups: groupsToClear, blogs: blogsToClear}, done);
    });
});
