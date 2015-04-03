'use strict';
let relativeToServer = './../../../../server/';
var Promise = require('bluebird');
let Notifications = require(relativeToServer + 'users/notifications/model');
let Audit = require(relativeToServer + 'audit/model');
let tu = require('./../../testutils');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Notifications Model', function () {
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(() =>  {
                done();
            });
    });
    describe('Notifications.create', function () {
        it('should create a new document per user passed', function (done) {
            let error = null;
            //email, organisation, objectType, objectId, title, state, action, priority, content, by
            Notifications.create(['one', 'two', 'three'], 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'test')
                .then((notifications) =>  {
                    expect(notifications).to.exist();
                    expect(notifications.length).to.equal(3);
                    expect(notifications[0].email).to.equal('one');
                    expect(notifications[1].email).to.equal('two');
                    expect(notifications[2].email).to.equal('three');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Notifications.this.activate/deactivate', function () {
        let activated = null, deactivated = null;
        before(function (done) {
            //email, organisation, objectType, objectId, title, state, action, priority, content, by
            let p1 = Notifications.create('activated', 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'test');
            let p2 = Notifications.create('deactivated', 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'test');
            Promise.join(p1, p2, function (p11, p12) {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate('test').save()
                    .then((d) =>  {
                        deactivated = d;
                        Audit.remove({objectChangedId: d._id});
                    });
            })
                .then(() =>  {
                    done();
                });
        });
        it('should do nothing if the notification is already inactive/active and you deactivate/activate', function (done) {
            let error = null;
            activated.reactivate('test').save()
                .then((a) =>  {
                    expect(a.isActive).to.be.true();
                    return Audit.findAudit('notifications', a._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) =>  {
                    expect(paudit.length).to.equal(0);
                })
                .then(() =>  {
                    return deactivated.deactivate('test').save();
                })
                .then((d) =>  {
                    expect(d.isActive).to.be.false();
                    return Audit.findAudit('notifications', d._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) =>  {
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
        it('should mark the notification as inactive / active when you deactivate / activate', function (done) {
            let error = null;
            activated.deactivate('test').save()
                .then((a) =>  {
                    expect(a.isActive).to.be.false();
                    return Audit.findAudit('notifications', a._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) =>  {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.equal('isActive');
                })
                .then(() =>  {
                    return deactivated.reactivate('test').save();
                })
                .then((d) =>  {
                    expect(d.isActive).to.be.true();
                    return Audit.findAudit('notifications', d._id, {'change.action': {$regex: /^isActive/}});
                })
                .then((paudit) =>  {
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
            done();
        });
    });
    describe('Notifications.this.setState', function () {
        let testnotification = null;
        before(function (done) {
            //email, organisation, objectType, objectId, title, state, action, priority, content, by
            Notifications.create('setState', 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'test')
                .then((p) =>  {
                    testnotification = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the state', function (done) {
            let error = null;
            testnotification.setState(testnotification.state, 'test').save()
                .then((p) =>  {
                    expect(p.state).to.equal('unread');
                    return Audit.findAudit('notifications', p._id, {'change.action': {$regex: /^state/}});
                })
                .then((paudit) =>  {
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
        it('should update to the new state', function (done) {
            let error = null;
            testnotification.setState('cancelled', 'test').save()
                .then((p) =>  {
                    expect(p.state).to.equal('cancelled');
                    return Audit.findAudit('notifications', p._id, {'change.action': {$regex: /^state/}});
                })
                .then((paudit) =>  {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('cancelled');
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
            done();
        });
    });
    describe('Notifications.this.i18n', function () {
        it('should update the field with the new localised strings and do nothing if alread localised', function (done) {
            let error = null;
            //email, organisation, objectType, objectId, title, state, action, priority, content, by
            Notifications.create('i18n', 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', ['New Post {{postTitle}} in Blog {{blogTitle}} published by {{publishedBy}}', {
                postTitle: 'test post',
                blogTitle: 'test blog',
                publishedBy: 'test author'
            }], 'test')
                .then((notification) =>  {
                    let localised = notification.i18n('en');
                    expect(localised.content).to.equal('New Post test post in Blog test blog published by test author');
                    expect(localised.title).to.equal('titles dont matter');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });
    after(function (done) {
        Notifications.remove({title: 'titles dont matter'})
            .then(() =>  {
                return tu.cleanup({}, done);
            });
    });
});
