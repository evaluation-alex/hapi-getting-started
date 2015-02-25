'use strict';
var relativeToServer = './../../../../server/';
var relativeTo = './../../../../';
var fs = require('fs');
var moment = require('moment');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Posts = require(relativeToServer + 'blogs/posts/model');
var Audit = require(relativeToServer + 'audit/model');
var _ = require('lodash');
var Config = require(relativeTo + 'config');
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
            Posts.create(blogId, 'silver lining', 'newPost', 'draft', 'public', true, 'testing', ['testing', 'unit testing'], 'we better test code or not write code', [], 'test')
                .then(function (post) {
                    expect(post).to.exist();
                    expect(post).to.be.instanceof(Posts);
                    var filepath = 'silver-lining/blogs/'+blogId.toString()+'/'+moment(post.createdOn).format('YYYYMMDD')+'/'+post._id.toString();
                    expect(post.content).to.equal(filepath);
                    //expect(fs.existsSync(Config.storage.diskPath + '/' + filepath)).to.be.true();
                    //expect(fs.readFileSync(Config.storage.diskPath + '/' + filepath, {})).to.equal('we better test code or not write code');
                    return Audit.findAudit('Posts', post._id, {action: 'create'});
                })
                .then(function (audit) {
                    expect(audit).to.exist();
                    expect(audit.length).to.equal(1);
                    expect(audit[0].action).to.equal('create');
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

    describe('Posts._find, _findOne', function () {
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'test _find', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'search'], 'testing is a chore but it pays off in the long run', [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'test _find2', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'search'], 'testing requires patience', [], 'test');
            Promise.join(p1, p2).then(function () {done();});
        });
        it('should find all posts that match the conditions and posts should have content populated', function (done) {
            var error = null;
            Posts._find({title: {$regex: '^test _find*'}})
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(2);
                    expect(found[0].content).to.equal('testing is a chore but it pays off in the long run');
                    expect(found[1].content).to.equal('testing requires patience');
                    Posts.resetCache();
                    return Posts._findOne({_id: found[0]._id});
                })
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.content).to.equal('testing is a chore but it pays off in the long run');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('_find should return an empty array if none of the posts match the given conditions', function (done) {
            var error = null;
            Posts._find({title: 'test _find3'})
                .then(function (found) {
                    expect(found).to.exist();
                    expect(found.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('_findOne should return false if no posts match the given conditions', function (done) {
            var error = null;
            Posts._findOne({title: 'test _find3'})
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
        after(function (done) {
            postsToClear.push('test _find');
            postsToClear.push('test _find2');
            done();
        });
    });

    describe('Posts.this.setContent, readContentFromDisk', function () {
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'test setContent', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'setContent'], 'figuring out data for test cases requires more thinking than what it took to write the code', [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'test setContent2', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'search'], 'and sometimes it reveals bugs in your test code too', [], 'test');
            Promise.join(p1, p2).then(function () {done();});
        });
        it('should create the directory structure for the post file, if it doesnt exist', function (done) {
            var error = null;
            Posts._findOne({title: 'test setContent'})
                .then(function (post) {{
                    expect(fs.existsSync(Config.storage.diskPath + '/' + Posts.filenameForPost(post).join(''))).to.be.true();
                }})
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should update the contents of the file', function (done) {
            var error = null;
            Posts._findOne({title: 'test setContent2'})
                .then(function (post) {{
                    return post.setContent('new content has been added, and the test should succeed', 'test').save();
                }})
                .then(function (post) {
                    return Audit.findAudit('Posts', post._id, {action: /content/});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(0);
                    Posts.resetCache();
                    return Posts._findOne({title: 'test setContent2'});
                })
                .then(function (post) {
                    expect(fs.readFileSync(Config.storage.diskPath + '/' + Posts.filenameForPost(post).join('')).toString()).to.equal('new content has been added, and the test should succeed');
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
            postsToClear.push('test setContent');
            postsToClear.push('test setContent2');
            done();
        });
    });

    describe('Posts.this.approve', function () {
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'test approve', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'approve'], 'approving is hard work', [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'test approve2', 'published', 'public', true, 'testing', ['testing', 'unit testing', 'approve'], 'approve, dont approve, doesnt matter', [], 'test');
            var p3 = Posts.create(blogId, 'silver lining', 'test approve3', 'pending review', 'public', true, 'testing', ['testing', 'unit testing', 'approve'], 'approving is hard work', [], 'test');
            var p4 = Posts.create(blogId, 'silver lining', 'test approve4', 'do not publish', 'public', true, 'testing', ['testing', 'unit testing', 'approve'], 'approving is hard work', [], 'test');
            var p5 = Posts.create(blogId, 'silver lining', 'test approve5', 'archived', 'public', true, 'testing', ['testing', 'unit testing', 'approve'], 'approving is hard work', [], 'test');
            Promise.join(p1, p2, p3, p4, p5).then(function () {done();});
        });
        it('should change state to published only if its in draft or pending review state, changes should be audited', function (done) {
            var error = null;
            Posts._findOne({title: 'test approve'})
                .then(function (post) {
                    return post.approve({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('published');
                    expect(post.reviewedBy).to.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(1);
                    expect(audit[0].newValues).to.equal('published');
                    return Posts._findOne({title: 'test approve3'});
                })
                .then(function (post) {
                    return post.approve({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('published');
                    expect(post.reviewedBy).to.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(1);
                    expect(audit[0].newValues).to.equal('published');
                    return Posts._findOne({title: 'test approve4'});
                })
                .then(function (post) {
                    return post.approve({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('published');
                    expect(post.reviewedBy).to.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(1);
                    expect(audit[0].newValues).to.equal('published');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if already in published / archived state', function (done) {
            var error = null;
            Posts._findOne({title: 'test approve2'})
                .then(function (post) {
                    return post.approve({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('published');
                    expect(post.reviewedBy).to.not.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(0);
                    return Posts._findOne({title: 'test approve5'});
                })
                .then(function (post) {
                    return post.approve({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('archived');
                    expect(post.reviewedBy).to.not.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(0);
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
            postsToClear.push('test approve');
            postsToClear.push('test approve2');
            postsToClear.push('test approve3');
            postsToClear.push('test approve4');
            postsToClear.push('test approve5');
            done();
        });
    });

    describe('Posts.this.reject', function () {
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'test reject', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'reject'], 'rejecting is hard work', [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'test reject2', 'published', 'public', true, 'testing', ['testing', 'unit testing', 'reject'], 'reject, dont reject, doesnt matter', [], 'test');
            var p3 = Posts.create(blogId, 'silver lining', 'test reject3', 'pending review', 'public', true, 'testing', ['testing', 'unit testing', 'reject'], 'rejecting is hard work', [], 'test');
            var p5 = Posts.create(blogId, 'silver lining', 'test reject5', 'archived', 'public', true, 'testing', ['testing', 'unit testing', 'reject'], 'approving is hard work', [], 'test');
            Promise.join(p1, p2, p3, p5).then(function () {done();});
        });
        it('should change state to published only if its in draft or pending review state, changes should be audited', function (done) {
            var error = null;
            Posts._findOne({title: 'test reject'})
                .then(function (post) {
                    return post.reject({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('do not publish');
                    expect(post.reviewedBy).to.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(1);
                    expect(audit[0].newValues).to.equal('do not publish');
                    return Posts._findOne({title: 'test reject3'});
                })
                .then(function (post) {
                    return post.reject({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('do not publish');
                    expect(post.reviewedBy).to.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(1);
                    expect(audit[0].newValues).to.equal('do not publish');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if already in published / archived state', function (done) {
            var error = null;
            Posts._findOne({title: 'test reject2'})
                .then(function (post) {
                    return post.reject({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('published');
                    expect(post.reviewedBy).to.not.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(0);
                    return Posts._findOne({title: 'test reject5'});
                })
                .then(function (post) {
                    return post.reject({payload:{}}, 'test2').save();
                })
                .then(function (post) {
                    expect(post.state).to.equal('archived');
                    expect(post.reviewedBy).to.not.equal('test2');
                    return Audit.findAudit('Posts', post._id, {action: 'state'});
                })
                .then(function (audit) {
                    expect(audit.length).to.equal(0);
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
            postsToClear.push('test reject');
            postsToClear.push('test reject2');
            postsToClear.push('test reject3');
            postsToClear.push('test reject5');
            done();
        });
    });

    describe('Posts.this.activate/deactivate', function () {
        var activated = null, deactivated = null;
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'activate', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'activate'], 'just an on/off switch', [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'deactivate', 'published', 'public', true, 'testing', ['testing', 'unit testing', 'deactivate'], 'just an on/off switch', [], 'test');
            Promise.join(p1, p2, function (p11, p12) {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate('test').save();
                Audit.remove({objectChangedId: deactivated._id}, function (err) {
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
            activated.reactivate('test').save()
                .then(function (a) {
                    expect(a.isActive).to.be.true();
                    return Audit.findAudit('Posts',  a._id, {action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .then(function () {
                    return deactivated.deactivate('test').save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.false();
                    return Audit.findAudit('Posts',  d._id, {action: {$regex: /^isActive/}});
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
                    return Audit.findAudit('Posts',  a._id, {action: {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.equal('isActive');
                })
                .then(function () {
                    return deactivated.reactivate('test').save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.true();
                    return Audit.findAudit('Posts',  d._id, {action: {$regex: /^isActive/}});
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
            postsToClear.push('activate');
            postsToClear.push('deactivate');
            done();
        });
    });

    describe('Posts.this.setTitle', function () {
        var testpost = null;
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.updateTitle', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'setTitle'], 'titles matter', [], 'test')
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^title/}});
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^title/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].newValues).to.equal('newTitle');
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
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setCategory', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'setCategory'], 'categories matter too', [], 'test')
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^category/}});
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^category/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].newValues).to.equal('newCategory');
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
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setAccess', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'setCategory'], 'categories matter too', [], 'test')
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^access/}});
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^access/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].newValues).to.equal('restricted');
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
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            testpost = Posts.create(blogId, 'silver lining', 'post.setAllowComments', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'setCategory'], 'categories matter too', [], 'test')
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^allowComments/}});
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^allowComments/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].newValues).to.equal(false);
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

    describe('Posts.this.addTags', function () {
        before(function (done) {
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'addTags1', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'addTags'], 'tag it, bag it and go', [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'addTags2', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'addTags'], 'tag it, bag it and go', [], 'test');
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^add tag/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^add tag/);
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^add tag/}});
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
            //blogId, organisation, title, state, access, allowComments, category, tags, content, attachments, by
            var p1 = Posts.create(blogId, 'silver lining', 'removeTags1', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'removeTags'], 'tag it, bag it and check if you can go', [], 'test');
            var p2 = Posts.create(blogId, 'silver lining', 'removeTags2', 'draft', 'public', true, 'testing', ['testing', 'unit testing', 'removeTags'], 'tag it, bag it and check if you can go', [], 'test');
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^remove tag/}});
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
                    return Audit.findAudit('Posts',  p._id, {action: {$regex: /^remove tag/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].action).to.match(/^remove tag/);
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
