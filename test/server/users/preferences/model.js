'use strict';
var relativeToServer = './../../../../server/';
var Promise = require('bluebird');
var Preferences = require(relativeToServer + 'users/preferences/model');
var Audit = require(relativeToServer + 'audit/model');
var moment = require('moment');
var _ = require('lodash');
//var expect = require('chai').expect;
var tu = require('./../../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

describe('Preferences Model', function () {
    var usersToClear = [];
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function() {
                done();
            });
    });

    describe('Preferences.create', function () {
        it('should create a new document succesfully', function (done) {
            var error = null;
            Preferences.create('newPref', 'silver lining', 'en', 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Preferences);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    usersToClear.push('newPref');
                    tu.testComplete(done, error);
                });
        });
        it('should fail when you try to create dupe preferences', function (done) {
            var error = null;
            Preferences.create('newPrefDupe', 'silver lining', 'en', 'test')
                .then(function (p) {
                    expect(p).to.exist();
                    expect(p).to.be.an.instanceof(Preferences);
                    return Preferences.create('newPrefDupe', 'silver lining', 'en', 'test');
                })
                .then(function (p) {
                    expect(p).to.not.exist();
                    error = p;
                })
                .catch(function (err) {
                    expect(err).to.exist();
                })
                .done(function () {
                    usersToClear.push('newPrefDupe');
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Preferences.this.activate/deactivate', function () {
        var activated = null, deactivated = null;
        before(function (done) {
            //email, organisation, locale, by
            var p1 = Preferences.create('activated', 'silver lining', 'en', 'test');
            var p2 = Preferences.create('deactivated', 'silver lining', 'en', 'test');
            Promise.join(p1, p2, function (p11, p12) {
                activated = p11;
                deactivated = p12;
                deactivated.deactivate('test').save()
                    .then(function (d) {
                        deactivated = d;
                        Audit.remove({objectChangedId: d.email}, function (err) {
                            if (err) {
                            }
                        });
                    });
            })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if the notification is already inactive/active and you deactivate/activate', function (done) {
            var error = null;
            activated.reactivate('test').save()
                .then(function (a) {
                    expect(a.isActive).to.be.true();
                    return Audit.findAudit('preferences',  a.email, {'change.action': {$regex: /^isActive/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(0);
                })
                .then(function () {
                    return deactivated.deactivate('test').save();
                })
                .then(function (d) {
                    expect(d.isActive).to.be.false();
                    return Audit.findAudit('preferences',  d.email, {'change.action': {$regex: /^isActive/}});
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
        it('should mark the preferences as inactive / active when you deactivate / activate', function (done) {
            var error = null;
            activated.deactivate('test').save()
                .then(function (a) {
                    expect(a.isActive).to.be.false();
                    return Audit.findAudit('preferences',  a.email, {'change.action': {$regex: /^isActive/}});
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
                    return Audit.findAudit('preferences',  d.email, {'change.action': {$regex: /^isActive/}});
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
            usersToClear.push('activated');
            usersToClear.push('deactivated');
            done();
        });
    });

    describe('Notifications.this.setLocale', function () {
        var testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Preferences.create('setLocale', 'silver lining', 'hi', 'test')
                .then(function (p) {
                    testpref = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the locale', function (done) {
            var error = null;
            testpref.setLocale(testpref.locale, 'test').save()
                .then(function (p) {
                    expect(p.locale).to.equal('hi');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^locale/}});
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
            var error = null;
            testpref.setLocale('en', 'test').save()
                .then(function (p) {
                    expect(p.locale).to.equal('en');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^locale/}});
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

    describe('Preferences.this.notifications.blogs.inapp.frequency', function () {
        var testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Preferences.create('setNotificationsBlogsInappFrequency', 'silver lining', 'hi', 'test')
                .then(function (p) {
                    testpref = p;
                    testpref.notifications.blogs.inapp.frequency = 'daily';
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogsInappFrequency', function (done) {
            var error = null;
            testpref.setNotificationsBlogsInappFrequency(testpref.notifications.blogs.inapp.frequency, 'test').save()
                .then(function (p) {
                    expect(p.notifications.blogs.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.blogs\.inapp\.frequency/}});
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
            var error = null;
            testpref.setNotificationsBlogsInappFrequency('immediate', 'test').save()
                .then(function (p) {
                    expect(p.notifications.blogs.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.blogs\.inapp\.frequency/}});
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
            usersToClear.push('setNotificationsBlogsInappFrequency');
            done();
        });
    });

    describe('Preferences.this.notifications.blogs.inapp.lastSent', function () {
        var testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Preferences.create('setNotificationsBlogsInappLastSent', 'silver lining', 'hi', 'test')
                .then(function (p) {
                    testpref = p;
                    testpref.notifications.blogs.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', function (done) {
            var error = null;
            testpref.setNotificationsBlogsInappLastSent(testpref.notifications.blogs.inapp.lastSent, 'test').save()
                .then(function (p) {
                    expect(moment(p.notifications.blogs.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.blogs\.inapp\.lastSent/}});
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
            var error = null;
            testpref.setNotificationsBlogsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then(function (p) {
                    expect(moment(p.notifications.blogs.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.blogs\.inapp\.lastSent/}});
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
            usersToClear.push('setNotificationsBlogsInappLastSent');
            done();
        });
    });

    describe('Preferences.this.addNotificationsBlogsBlocked', function () {
        before(function (done) {
            Preferences.create('addNotificationsBlogsBlocked1', 'silver lining', 'en', 'test')
                .then(function(p1) {
                    p1.notifications.blogs.blocked.push('blocked1');
                    return p1.save();
                })
                .then(function () {
                    return Preferences.create('addNotificationsBlogsBlocked2', 'silver lining', 'en', 'test');
                })
                .then(function (p2) {
                    p2.notifications.blogs.blocked.push('blocked1');
                    return p2.save();
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
        it('should add a new entry to blocked when an item is newly blocked', function (done) {
            var error = null;
            Preferences._findOne({email: 'addNotificationsBlogsBlocked1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['newBlocked'], 'notifications.blogs.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.blogs.blocked, 'newBlocked')).to.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^add notifications\.blogs\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add notifications\.blogs\.blocked/);
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
            var error = null;
            Preferences._findOne({email: 'addNotificationsBlogsBlocked2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['blocked1'], 'notifications.blogs.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.blogs.blocked, 'blocked1')).to.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^add notifications\.blogs\.blocked/}});
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
            Preferences.create('removeNotificationsBlogsBlocked', 'silver lining', 'en', 'test')
                .then(function (p) {
                    p.notifications.blogs.blocked.push('toBeRemoved');
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
            var error = null;
            Preferences._findOne({email: 'removeNotificationsBlogsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['unknownBlog'], 'notifications.blogs.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.blogs.blocked, 'unknownBlog1')).to.not.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^remove notifications\.blogs\.blocked/}});
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
            var error = null;
            Preferences._findOne({email: 'removeNotificationsBlogsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['toBeRemoved'], 'notifications.blogs.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.blogs.blocked, 'toBeRemoved')).to.not.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^remove notifications\.blogs\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove notifications\.blogs\.blocked/);
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

    describe('Preferences.this.notifications.posts.inapp.frequency', function () {
        var testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Preferences.create('setNotificationsPostsInappFrequency', 'silver lining', 'hi', 'test')
                .then(function (p) {
                    testpref = p;
                    testpref.notifications.posts.inapp.frequency = 'daily';
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsPostsInappFrequency', function (done) {
            var error = null;
            testpref.setNotificationsPostsInappFrequency(testpref.notifications.posts.inapp.frequency, 'test').save()
                .then(function (p) {
                    expect(p.notifications.posts.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.posts\.inapp\.frequency/}});
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
            var error = null;
            testpref.setNotificationsPostsInappFrequency('immediate', 'test').save()
                .then(function (p) {
                    expect(p.notifications.posts.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.posts\.inapp\.frequency/}});
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
            usersToClear.push('setNotificationsPostsInappFrequency');
            done();
        });
    });

    describe('Preferences.this.notifications.posts.inapp.lastSent', function () {
        var testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Preferences.create('setNotificationsPostsInappLastSent', 'silver lining', 'hi', 'test')
                .then(function (p) {
                    testpref = p;
                    testpref.notifications.posts.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', function (done) {
            var error = null;
            testpref.setNotificationsPostsInappLastSent(testpref.notifications.posts.inapp.lastSent, 'test').save()
                .then(function (p) {
                    expect(moment(p.notifications.posts.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.posts\.inapp\.lastSent/}});
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
            var error = null;
            testpref.setNotificationsPostsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then(function (p) {
                    expect(moment(p.notifications.posts.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.posts\.inapp\.lastSent/}});
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
            usersToClear.push('setNotificationsPostsInappLastSent');
            done();
        });
    });

    describe('Preferences.this.addNotificationsPostsBlocked', function () {
        before(function (done) {
            Preferences.create('addNotificationsPostsBlocked1', 'silver lining', 'en', 'test')
                .then(function(p1) {
                    p1.notifications.posts.blocked.push('blocked1');
                    return p1.save();
                })
                .then(function () {
                    return Preferences.create('addNotificationsPostsBlocked2', 'silver lining', 'en', 'test');
                })
                .then(function (p2) {
                    p2.notifications.posts.blocked.push('blocked1');
                    return p2.save();
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
        it('should add a new entry to blocked when an item is newly blocked', function (done) {
            var error = null;
            Preferences._findOne({email: 'addNotificationsPostsBlocked1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['newBlocked'], 'notifications.posts.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.posts.blocked, 'newBlocked')).to.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^add notifications\.posts\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add notifications\.posts\.blocked/);
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
            var error = null;
            Preferences._findOne({email: 'addNotificationsPostsBlocked2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['blocked1'], 'notifications.posts.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.posts.blocked, 'blocked1')).to.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^add notifications\.posts\.blocked/}});
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
            Preferences.create('removeNotificationsPostsBlocked', 'silver lining', 'en', 'test')
                .then(function (p) {
                    p.notifications.posts.blocked.push('toBeRemoved');
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
            var error = null;
            Preferences._findOne({email: 'removeNotificationsPostsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['unknownBlog'], 'notifications.posts.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.posts.blocked, 'unknownBlog1')).to.not.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^remove notifications\.posts\.blocked/}});
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
            var error = null;
            Preferences._findOne({email: 'removeNotificationsPostsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['toBeRemoved'], 'notifications.posts.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.posts.blocked, 'toBeRemoved')).to.not.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^remove notifications\.posts\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove notifications\.posts\.blocked/);
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

    describe('Preferences.this.notifications.userGroups.inapp.frequency', function () {
        var testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Preferences.create('setNotificationsUserGroupsInappFrequency', 'silver lining', 'hi', 'test')
                .then(function (p) {
                    testpref = p;
                    testpref.notifications.userGroups.inapp.frequency = 'daily';
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsUserGroupsInappFrequency', function (done) {
            var error = null;
            testpref.setNotificationsUserGroupsInappFrequency(testpref.notifications.userGroups.inapp.frequency, 'test').save()
                .then(function (p) {
                    expect(p.notifications.userGroups.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.userGroups\.inapp\.frequency/}});
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
            var error = null;
            testpref.setNotificationsUserGroupsInappFrequency('immediate', 'test').save()
                .then(function (p) {
                    expect(p.notifications.userGroups.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.userGroups\.inapp\.frequency/}});
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
            usersToClear.push('setNotificationsUserGroupsInappFrequency');
            done();
        });
    });

    describe('Preferences.this.notifications.userGroups.inapp.lastSent', function () {
        var testpref = null;
        before(function (done) {
            //email, organisation, locale, by
            Preferences.create('setNotificationsUserGroupsInappLastSent', 'silver lining', 'hi', 'test')
                .then(function (p) {
                    testpref = p;
                    testpref.notifications.userGroups.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    return testpref.save();
                })
                .then(function () {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', function (done) {
            var error = null;
            testpref.setNotificationsUserGroupsInappLastSent(testpref.notifications.userGroups.inapp.lastSent, 'test').save()
                .then(function (p) {
                    expect(moment(p.notifications.userGroups.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.userGroups\.inapp\.lastSent/}});
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
            var error = null;
            testpref.setNotificationsUserGroupsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then(function (p) {
                    expect(moment(p.notifications.userGroups.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^notifications\.userGroups\.inapp\.lastSent/}});
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
            usersToClear.push('setNotificationsUserGroupsInappLastSent');
            done();
        });
    });

    describe('Preferences.this.addNotificationsUserGroupsBlocked', function () {
        before(function (done) {
            Preferences.create('addNotificationsUserGroupsBlocked1', 'silver lining', 'en', 'test')
                .then(function(p1) {
                    p1.notifications.userGroups.blocked.push('blocked1');
                    return p1.save();
                })
                .then(function () {
                    return Preferences.create('addNotificationsUserGroupsBlocked2', 'silver lining', 'en', 'test');
                })
                .then(function (p2) {
                    p2.notifications.userGroups.blocked.push('blocked1');
                    return p2.save();
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
        it('should add a new entry to blocked when an item is newly blocked', function (done) {
            var error = null;
            Preferences._findOne({email: 'addNotificationsUserGroupsBlocked1', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['newBlocked'], 'notifications.userGroups.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.userGroups.blocked, 'newBlocked')).to.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^add notifications\.userGroups\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add notifications\.userGroups\.blocked/);
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
            var error = null;
            Preferences._findOne({email: 'addNotificationsUserGroupsBlocked2', organisation: 'silver lining'})
                .then(function (found) {
                    return found.add(['blocked1'], 'notifications.userGroups.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.userGroups.blocked, 'blocked1')).to.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^add notifications\.userGroups\.blocked/}});
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
            Preferences.create('removeNotificationsUserGroupsBlocked', 'silver lining', 'en', 'test')
                .then(function (p) {
                    p.notifications.userGroups.blocked.push('toBeRemoved');
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
            var error = null;
            Preferences._findOne({email: 'removeNotificationsUserGroupsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['unknownBlog'], 'notifications.userGroups.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.userGroups.blocked, 'unknownBlog1')).to.not.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^remove notifications\.userGroups\.blocked/}});
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
            var error = null;
            Preferences._findOne({email: 'removeNotificationsUserGroupsBlocked', organisation: 'silver lining'})
                .then(function (found) {
                    return found.remove(['toBeRemoved'], 'notifications.userGroups.blocked', 'test').save();
                })
                .then(function (p) {
                    expect(_.findWhere(p.notifications.userGroups.blocked, 'toBeRemoved')).to.not.exist();
                    return Audit.findAudit('preferences',  p.email, {'change.action': {$regex: /^remove notifications\.userGroups\.blocked/}});
                })
                .then(function (paudit) {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove notifications\.userGroups\.blocked/);
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
