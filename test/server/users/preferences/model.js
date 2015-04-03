'use strict';
let relativeToServer = './../../../../server/';
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
let moment = require('moment');
let _ = require('lodash');
//let expect = require('chai').expect;
let tu = require('./../../testutils');
let Code = require('code');   // assertion library
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Preferences Model', function () {
    let usersToClear = [];
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                done();
            });
    });
    describe('Preferences.this.setLocale', function () {
        let testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Users.create('setLocale', 'silver lining', 'password', 'hi')
                .then(function (p) {
                    testpref = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the locale', function (done) {
            let error = null;
            testpref.setPreferencesLocale(testpref.locale, 'test').save()
                .then(function (p) {
                    expect(p.preferences.locale).to.equal('hi');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.locale/}});
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
        it('should update to the new locale', function (done) {
            let error = null;
            testpref.setPreferencesLocale('en', 'test').save()
                .then(function (p) {
                    expect(p.preferences.locale).to.equal('en');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.locale/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('en');
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
            usersToClear.push('setLocale');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.blogs.inapp.frequency', function () {
        let testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsBlogsInappFrequency', 'silver lining', 'password', 'en')
                .then(function (p) {
                    testpref = p;
                    testpref.preferences.notifications.blogs.inapp.frequency = 'daily';
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogsInappFrequency', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsBlogsInappFrequency(testpref.preferences.notifications.blogs.inapp.frequency, 'test').save()
                .then(function (p) {
                    expect(p.preferences.notifications.blogs.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.blogs\.inapp\.frequency/}});
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
        it('should update to the new Inapp frequency', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsBlogsInappFrequency('immediate', 'test').save()
                .then(function (p) {
                    expect(p.preferences.notifications.blogs.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.blogs\.inapp\.frequency/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('immediate');
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
            usersToClear.push('setPreferencesNotificationsBlogsInappFrequency');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.blogs.inapp.lastSent', function () {
        let testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsBlogsInappLastSent', 'silver lining', 'password', 'hi')
                .then(function (p) {
                    testpref = p;
                    testpref.preferences.notifications.blogs.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsBlogsInappLastSent(testpref.preferences.notifications.blogs.inapp.lastSent, 'test').save()
                .then(function (p) {
                    expect(moment(p.preferences.notifications.blogs.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.blogs\.inapp\.lastSent/}});
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
        it('should update to the new blogs inapp lastSent', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsBlogsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then(function (p) {
                    expect(moment(p.preferences.notifications.blogs.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.blogs\.inapp\.lastSent/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(moment(paudit[0].change[0].newValues).format('YYYYMMDD')).to.equal('20150324');
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
            usersToClear.push('setPreferencesNotificationsBlogsInappLastSent');
            done();
        });
    });
    describe('Preferences.this.addNotificationsBlogsBlocked', function () {
        before(function (done) {
            Users.create('addNotificationsBlogsBlocked1', 'silver lining', 'password', 'en')
                .then(function (p1) {
                    p1.preferences.notifications.blogs.blocked.push('blocked1');
                    return p1.save();
                })
                .then(function () {
                    return Users.create('addNotificationsBlogsBlocked2', 'silver lining', 'password', 'en');
                })
                .then(function (p2) {
                    p2.preferences.notifications.blogs.blocked.push('blocked1');
                    return p2.save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should add a new entry to blocked when an item is newly blocked', function (done) {
            let error = null;
            Users.findOne({email: 'addNotificationsBlogsBlocked1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['newBlocked'], 'preferences.notifications.blogs.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.blogs.blocked, 'newBlocked')).to.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.blogs\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add preferences\.notifications\.blogs\.blocked/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the item is already in the blocked list', function (done) {
            let error = null;
            Users.findOne({email: 'addNotificationsBlogsBlocked2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['blocked1'], 'preferences.notifications.blogs.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.blogs.blocked, 'blocked1')).to.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.blogs\.blocked/}});
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
            usersToClear.push('addNotificationsBlogsBlocked2');
            usersToClear.push('addNotificationsBlogsBlocked1');
            done();
        });
    });
    describe('Preferences.this.removeNotificationsBlogsBlocked', function () {
        before(function (done) {
            Users.create('removeNotificationsBlogsBlocked', 'silver lining', 'password', 'en')
                .then(function (p) {
                    p.preferences.notifications.blogs.blocked.push('toBeRemoved');
                    return p.save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should do nothing if the item is not present in the blocked list', function (done) {
            let error = null;
            Users.findOne({email: 'removeNotificationsBlogsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['unknownBlog'], 'preferences.notifications.blogs.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.blogs.blocked, 'unknownBlog1')).to.not.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.blogs\.blocked/}});
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
        it('should remove item if present in the blocked list and audit changes', function (done) {
            let error = null;
            Users.findOne({email: 'removeNotificationsBlogsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['toBeRemoved'], 'preferences.notifications.blogs.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.blogs.blocked, 'toBeRemoved')).to.not.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.blogs\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove preferences\.notifications\.blogs\.blocked/);
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
            usersToClear.push('removeNotificationsBlogsBlocked');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.posts.inapp.frequency', function () {
        let testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsPostsInappFrequency', 'silver lining', 'password', 'hi')
                .then(function (p) {
                    testpref = p;
                    testpref.preferences.notifications.posts.inapp.frequency = 'daily';
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsPostsInappFrequency', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsPostsInappFrequency(testpref.preferences.notifications.posts.inapp.frequency, 'test').save()
                .then(function (p) {
                    expect(p.preferences.notifications.posts.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.posts\.inapp\.frequency/}});
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
        it('should update to the new Inapp frequency', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsPostsInappFrequency('immediate', 'test').save()
                .then(function (p) {
                    expect(p.preferences.notifications.posts.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.posts\.inapp\.frequency/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('immediate');
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
            usersToClear.push('setPreferencesNotificationsPostsInappFrequency');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.posts.inapp.lastSent', function () {
        let testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsPostsInappLastSent', 'silver lining', 'password', 'hi')
                .then(function (p) {
                    testpref = p;
                    testpref.preferences.notifications.posts.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsPostsInappLastSent(testpref.preferences.notifications.posts.inapp.lastSent, 'test').save()
                .then(function (p) {
                    expect(moment(p.preferences.notifications.posts.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.posts\.inapp\.lastSent/}});
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
        it('should update to the new posts inapp lastSent', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsPostsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then(function (p) {
                    expect(moment(p.preferences.notifications.posts.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.posts\.inapp\.lastSent/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(moment(paudit[0].change[0].newValues).format('YYYYMMDD')).to.equal('20150324');
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
            usersToClear.push('setPreferencesNotificationsPostsInappLastSent');
            done();
        });
    });
    describe('Preferences.this.addNotificationsPostsBlocked', function () {
        before(function (done) {
            Users.create('addNotificationsPostsBlocked1', 'silver lining', 'password', 'en')
                .then(function (p1) {
                    p1.preferences.notifications.posts.blocked.push('blocked1');
                    return p1.save();
                })
                .then(function () {
                    return Users.create('addNotificationsPostsBlocked2', 'silver lining', 'password', 'en');
                })
                .then(function (p2) {
                    p2.preferences.notifications.posts.blocked.push('blocked1');
                    return p2.save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should add a new entry to blocked when an item is newly blocked', function (done) {
            let error = null;
            Users.findOne({email: 'addNotificationsPostsBlocked1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['newBlocked'], 'preferences.notifications.posts.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.posts.blocked, 'newBlocked')).to.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.posts\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add preferences\.notifications\.posts\.blocked/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the item is already in the blocked list', function (done) {
            let error = null;
            Users.findOne({email: 'addNotificationsPostsBlocked2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['blocked1'], 'preferences.notifications.posts.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.posts.blocked, 'blocked1')).to.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.posts\.blocked/}});
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
            usersToClear.push('addNotificationsPostsBlocked2');
            usersToClear.push('addNotificationsPostsBlocked1');
            done();
        });
    });
    describe('Preferences.this.removeNotificationsPostsBlocked', function () {
        before(function (done) {
            Users.create('removeNotificationsPostsBlocked', 'silver lining', 'password', 'en')
                .then(function (p) {
                    p.preferences.notifications.posts.blocked.push('toBeRemoved');
                    return p.save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should do nothing if the item is not present in the blocked list', function (done) {
            let error = null;
            Users.findOne({email: 'removeNotificationsPostsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['unknownBlog'], 'preferences.notifications.posts.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.posts.blocked, 'unknownBlog1')).to.not.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.posts\.blocked/}});
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
        it('should remove item if present in the blocked list and audit changes', function (done) {
            let error = null;
            Users.findOne({email: 'removeNotificationsPostsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['toBeRemoved'], 'preferences.notifications.posts.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.posts.blocked, 'toBeRemoved')).to.not.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.posts\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove preferences\.notifications\.posts\.blocked/);
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
            usersToClear.push('removeNotificationsPostsBlocked');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.userGroups.inapp.frequency', function () {
        let testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsUserGroupsInappFrequency', 'silver lining', 'password', 'hi')
                .then(function (p) {
                    testpref = p;
                    testpref.preferences.notifications.userGroups.inapp.frequency = 'daily';
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsUserGroupsInappFrequency', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsUserGroupsInappFrequency(testpref.preferences.notifications.userGroups.inapp.frequency, 'test').save()
                .then(function (p) {
                    expect(p.preferences.notifications.userGroups.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.userGroups\.inapp\.frequency/}});
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
        it('should update to the new Inapp frequency', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsUserGroupsInappFrequency('immediate', 'test').save()
                .then(function (p) {
                    expect(p.preferences.notifications.userGroups.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.userGroups\.inapp\.frequency/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('immediate');
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
            usersToClear.push('setPreferencesNotificationsUserGroupsInappFrequency');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.userGroups.inapp.lastSent', function () {
        let testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsUserGroupsInappLastSent', 'silver lining', 'password', 'hi')
                .then(function (p) {
                    testpref = p;
                    testpref.preferences.notifications.userGroups.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsUserGroupsInappLastSent(testpref.preferences.notifications.userGroups.inapp.lastSent, 'test').save()
                .then(function (p) {
                    expect(moment(p.preferences.notifications.userGroups.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.userGroups\.inapp\.lastSent/}});
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
        it('should update to the new userGroups inapp lastSent', function (done) {
            let error = null;
            testpref.setPreferencesNotificationsUserGroupsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then(function (p) {
                    expect(moment(p.preferences.notifications.userGroups.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.userGroups\.inapp\.lastSent/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(moment(paudit[0].change[0].newValues).format('YYYYMMDD')).to.equal('20150324');
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
            usersToClear.push('setPreferencesNotificationsUserGroupsInappLastSent');
            done();
        });
    });
    describe('Preferences.this.addNotificationsUserGroupsBlocked', function () {
        before(function (done) {
            Users.create('addNotificationsUserGroupsBlocked1', 'silver lining', 'password', 'hi')
                .then(function (p1) {
                    p1.preferences.notifications.userGroups.blocked.push('blocked1');
                    return p1.save();
                })
                .then(function () {
                    return Users.create('addNotificationsUserGroupsBlocked2', 'silver lining', 'password', 'hi');
                })
                .then(function (p2) {
                    p2.preferences.notifications.userGroups.blocked.push('blocked1');
                    return p2.save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should add a new entry to blocked when an item is newly blocked', function (done) {
            let error = null;
            Users.findOne({email: 'addNotificationsUserGroupsBlocked1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['newBlocked'], 'preferences.notifications.userGroups.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.userGroups.blocked, 'newBlocked')).to.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.userGroups\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add preferences\.notifications\.userGroups\.blocked/);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the item is already in the blocked list', function (done) {
            let error = null;
            Users.findOne({email: 'addNotificationsUserGroupsBlocked2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['blocked1'], 'preferences.notifications.userGroups.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.userGroups.blocked, 'blocked1')).to.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.userGroups\.blocked/}});
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
            usersToClear.push('addNotificationsUserGroupsBlocked2');
            usersToClear.push('addNotificationsUserGroupsBlocked1');
            done();
        });
    });
    describe('Preferences.this.removeNotificationsUserGroupsBlocked', function () {
        before(function (done) {
            Users.create('removeNotificationsUserGroupsBlocked', 'silver lining', 'password', 'en')
                .then(function (p) {
                    p.preferences.notifications.userGroups.blocked.push('toBeRemoved');
                    return p.save();
                })
                .then(function () {
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should do nothing if the item is not present in the blocked list', function (done) {
            let error = null;
            Users.findOne({email: 'removeNotificationsUserGroupsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['unknownBlog'], 'preferences.notifications.userGroups.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.userGroups.blocked, 'unknownBlog')).to.not.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.userGroups\.blocked/}});
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
        it('should remove item if present in the blocked list and audit changes', function (done) {
            let error = null;
            Users.findOne({email: 'removeNotificationsUserGroupsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['toBeRemoved'], 'preferences.notifications.userGroups.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.preferences.notifications.userGroups.blocked, 'toBeRemoved')).to.not.exist();
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.userGroups\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove preferences\.notifications\.userGroups\.blocked/);
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
            usersToClear.push('removeNotificationsUserGroupsBlocked');
            done();
        });
    });
    after(function (done) {
        tu.cleanup({users: usersToClear}, done);
    });
});
