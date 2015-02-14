'use strict';
var relativeToServer = './../../../server/';

var Blogs = require(relativeToServer + 'blogs/model');
var Audit = require(relativeToServer + 'audit/model');
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
            Blogs.create('newBlog', 'Blog.create testing', [], [], [], [], 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Blogs);
                    return Audit.findAudit('Blogs', 'newBlog', {action: {$regex: /create/}});
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
            Blogs.create('dupeBlog', 'Blog.create dupe test', [], [], [], [], 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Blogs);
                })
                .then(function () {
                    Blogs.create('dupeBlog', 'Blog.create dupe test', [], [], [], [], 'test')
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

    describe('Blogs.findByTitle', function () {
        before(function (done) {
            Blogs.create('search1', 'Blogs.findByTitle test1', [], [], [], [], 'test')
                .then(function () {
                    done();
                });
        });
        it('should return a blog that matches the title', function (done) {
            var error = null;
            Blogs.findByTitle('search1')
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.title).to.match(/search/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return false when nothing matches', function (done) {
            var error = null;
            Blogs.findByTitle('wontfind')
                .then(function (found) {
                    expect(found).to.be.false();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        after(function(done) {
            blogsToClear.push('search1');
            blogsToClear.push('wontfind');
            done();
        });
    });

    describe('Blogs.this.addUsers', function () {
        before(function (done) {
            UserGroups.create('testBlogAddUsers', 'testing blog.addUsers', 'test')
                .then(function() {
                    return Blogs.create('addUsers1', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'], 'test');
                })
                .then(function() {
                    return Blogs.create('addUsers2', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'],'test');
                })
                .then(function () {
                    return Blogs.create('addUsers3', 'blog.addUsers test', ['directlyadded'], [], [], ['testBlogAddUsers'], 'test');
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
            Blogs.findByTitle('addUsers1')
                .then(function (found) {
                    return found.add(['newUserGroup'], 'groups', 'test')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscriberGroups, 'newUserGroup')).to.exist();
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^add group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^add group/);
                    return Blogs.findByTitle('addUsers1');
                })
                .then(function (found) {
                    return found.add(['newSubscriber'], 'subscriber', 'test')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscribers, 'newSubscriber')).to.exist();
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^add subscriber/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^add subscriber/);
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
            Blogs.findByTitle('addUsers2')
                .then(function (found) {
                    return found.add(['testBlogAddUsers'], 'groups', 'test')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscriberGroups, 'testBlogAddUsers')).to.exist();
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^add group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Blogs.findByTitle('addUsers2');
                })
                .then(function (found) {
                    return found.add(['directlyadded'], 'owners', 'test')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.owners, 'directlyadded')).to.exist();
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^add owner/}});
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
            Blogs.create('removeUsers1', 'blog.removeUsers', ['directlyadded'], [], [], ['testBlogsRemoveUsers'], 'test')
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
            Blogs.findByTitle('removeUsers1')
                .then(function (found) {
                    return found.remove(['unknownGroup'], 'groups', 'test')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscriberGroups, 'unknownGroup')).to.not.exist();
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^remove group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                    return Blogs.findByTitle('removeUsers1');
                })
                .then(function (found) {
                    return found.remove(['unknownUser'], 'subscriber', 'test')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscribers, 'unknownUser')).to.not.exist();
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^remove subscriber/}});
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
            Blogs.findByTitle('removeUsers1')
                .then(function (found) {
                    return found.remove(['testBlogsRemoveUsers'], 'groups', 'test')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.subscriberGroups, 'testBlogsRemoveUsers')).to.not.exist();
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^remove group/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^remove group/);
                    return Blogs.findByTitle('removeUsers1');
                })
                .then(function (found) {
                    return found.remove(['directlyadded'], 'owner', 'test')._save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.owners, 'directlyadded')).to.not.exist();
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^remove owner/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^remove owner/);
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
            var p1 = Blogs.create('activated', 'blog.activate, deactivate', [], [], [], [], 'test');
            var p2 = Blogs.create('deactivated', 'blog.deactive, activate', [], [], [], [], 'test');
            Promise.join(p1, p2, function (p11, p12) {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate('test')._save();
                Audit.remove({objectChangedId: deactivated.title}, function (err) {
                    if (err) {
                    }
                });
            })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if the blog is already inactive/active and you deactivate/activate', function (done) {
            var error = null;
            activated.reactivate('test')._save()
                .then(function (a) {
                    expect(a.isActive).to.be.true();
                    return Audit.findAudit('Blogs',  a.title, {action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .then(function () {
                    return deactivated.deactivate('test')._save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.false();
                    return Audit.findAudit('Blogs',  d.title, {action: {$regex: /^isActive/}});
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
            activated.deactivate('test')._save()
                .then(function (a) {
                    expect(a.isActive).to.be.false();
                    return Audit.findAudit('Blogs',  a.title, {action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.equal('isActive');
                })
                .then(function () {
                    return deactivated.reactivate('test')._save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.true();
                    return Audit.findAudit('Blogs',  d.title, {action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.equal('isActive');
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

    describe('Blogs.this.updateDesc', function () {
        var testblog = null;
        before(function (done) {
            Blogs.create('updateDesc1', 'blog.updateDesc', [], [], [], [], 'test')
                .then(function (p) {
                    testblog = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the description', function (done) {
            var error = null;
            testblog.updateDesc(testblog.description, 'test')._save()
                .then(function (p) {
                    expect(p.description).to.equal('blog.updateDesc');
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^change desc/}});
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
            testblog.updateDesc('newDescription', 'test')._save()
                .then(function (p) {
                    expect(p.description).to.equal('newDescription');
                    return Audit.findAudit('Blogs',  p.title, {action: {$regex: /^change desc/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].newValues).to.equal('newDescription');
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

    after(function (done) {
        return tu.cleanup({userGroups: groupsToClear, blogs: blogsToClear}, done);
    });
});
