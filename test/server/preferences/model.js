'use strict';
let Users = require('./../../../build/users/model');
let Audit = require('./../../../build/audit/model');
let moment = require('moment');
let _ = require('lodash');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('Preferences DAO', () => {
    let usersToClear = [];
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    describe('Preferences.this.setLocale', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setLocale', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    done();
                });
        });
        it('should do nothing if there is no change in the locale', (done) => {
            let error = null;
            testpref.setPreferencesLocale(testpref.locale, 'test').save()
                .then((p) => {
                    expect(p.preferences.locale).to.equal('hi');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.locale/}});
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
        it('should update to the new locale', (done) => {
            let error = null;
            testpref.setPreferencesLocale('en', 'test').save()
                .then((p) => {
                    expect(p.preferences.locale).to.equal('en');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.locale/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('en');
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
            usersToClear.push('setLocale');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.blogs.inapp.frequency', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsBlogsInappFrequency', 'silver lining', 'password', 'en')
                .then((p) => {
                    testpref = p;
                    testpref.preferences.notifications.blogs.inapp.frequency = 'daily';
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogsInappFrequency', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsBlogsInappFrequency(testpref.preferences.notifications.blogs.inapp.frequency, 'test').save()
                .then((p) => {
                    expect(p.preferences.notifications.blogs.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.blogs\.inapp\.frequency/}});
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
        it('should update to the new Inapp frequency', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsBlogsInappFrequency('immediate', 'test').save()
                .then((p) => {
                    expect(p.preferences.notifications.blogs.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.blogs\.inapp\.frequency/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('immediate');
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
            usersToClear.push('setPreferencesNotificationsBlogsInappFrequency');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.blogs.inapp.lastSent', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsBlogsInappLastSent', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.preferences.notifications.blogs.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsBlogsInappLastSent(testpref.preferences.notifications.blogs.inapp.lastSent, 'test').save()
                .then((p) => {
                    expect(moment(p.preferences.notifications.blogs.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.blogs\.inapp\.lastSent/}});
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
        it('should update to the new blogs inapp lastSent', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsBlogsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then((p) => {
                    expect(moment(p.preferences.notifications.blogs.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.blogs\.inapp\.lastSent/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(moment(paudit[0].change[0].newValues).format('YYYYMMDD')).to.equal('20150324');
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
            usersToClear.push('setPreferencesNotificationsBlogsInappLastSent');
            done();
        });
    });
    describe('Preferences.this.addNotificationsBlogsBlocked', () => {
        before((done) => {
            Users.create('addNotificationsBlogsBlocked1', 'silver lining', 'password', 'en')
                .then((p1) => {
                    p1.preferences.notifications.blogs.blocked.push('blocked1');
                    p1.__isModified = true;
                    return p1.save();
                })
                .then(() => {
                    return Users.create('addNotificationsBlogsBlocked2', 'silver lining', 'password', 'en');
                })
                .then((p2) => {
                    p2.preferences.notifications.blogs.blocked.push('blocked1');
                    p2.__isModified = true;
                    return p2.save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should add a new entry to blocked when an item is newly blocked', (done) => {
            let error = null;
            Users.findOne({email: 'addNotificationsBlogsBlocked1', organisation: 'silver lining'})
                .then((found) => {
                    return found.addPreferencesNotificationsBlogsBlocked(['newBlocked'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.blogs.blocked, item => item === 'newBlocked')).to.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.blogs\.blocked/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add preferences\.notifications\.blogs\.blocked/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the item is already in the blocked list', (done) => {
            let error = null;
            Users.findOne({email: 'addNotificationsBlogsBlocked2', organisation: 'silver lining'})
                .then((found) => {
                    return found.addPreferencesNotificationsBlogsBlocked(['blocked1'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.blogs.blocked, item => item === 'blocked1')).to.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.blogs\.blocked/}});
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
            usersToClear.push('addNotificationsBlogsBlocked2');
            usersToClear.push('addNotificationsBlogsBlocked1');
            done();
        });
    });
    describe('Preferences.this.removeNotificationsBlogsBlocked', () => {
        before((done) => {
            Users.create('removeNotificationsBlogsBlocked', 'silver lining', 'password', 'en')
                .then((p) => {
                    p.preferences.notifications.blogs.blocked.push('toBeRemoved');
                    p.__isModified = true;
                    return p.save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should do nothing if the item is not present in the blocked list', (done) => {
            let error = null;
            Users.findOne({email: 'removeNotificationsBlogsBlocked', organisation: 'silver lining'})
                .then((found) => {
                    return found.removePreferencesNotificationsBlogsBlocked(['unknownBlog'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.blogs.blocked, item => item === 'unknownBlog1')).to.not.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.blogs\.blocked/}});
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
        it('should remove item if present in the blocked list and audit changes', (done) => {
            let error = null;
            Users.findOne({email: 'removeNotificationsBlogsBlocked', organisation: 'silver lining'})
                .then((found) => {
                    return found.removePreferencesNotificationsBlogsBlocked(['toBeRemoved'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.blogs.blocked, item => item === 'toBeRemoved')).to.not.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.blogs\.blocked/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove preferences\.notifications\.blogs\.blocked/);
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
            usersToClear.push('removeNotificationsBlogsBlocked');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.posts.inapp.frequency', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsPostsInappFrequency', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.preferences.notifications.posts.inapp.frequency = 'daily';
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsPostsInappFrequency', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsPostsInappFrequency(testpref.preferences.notifications.posts.inapp.frequency, 'test').save()
                .then((p) => {
                    expect(p.preferences.notifications.posts.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.posts\.inapp\.frequency/}});
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
        it('should update to the new Inapp frequency', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsPostsInappFrequency('immediate', 'test').save()
                .then((p) => {
                    expect(p.preferences.notifications.posts.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.posts\.inapp\.frequency/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('immediate');
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
            usersToClear.push('setPreferencesNotificationsPostsInappFrequency');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.posts.inapp.lastSent', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsPostsInappLastSent', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.preferences.notifications.posts.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsPostsInappLastSent(testpref.preferences.notifications.posts.inapp.lastSent, 'test').save()
                .then((p) => {
                    expect(moment(p.preferences.notifications.posts.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.posts\.inapp\.lastSent/}});
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
        it('should update to the new posts inapp lastSent', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsPostsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then((p) => {
                    expect(moment(p.preferences.notifications.posts.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.posts\.inapp\.lastSent/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(moment(paudit[0].change[0].newValues).format('YYYYMMDD')).to.equal('20150324');
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
            usersToClear.push('setPreferencesNotificationsPostsInappLastSent');
            done();
        });
    });
    describe('Preferences.this.addNotificationsPostsBlocked', () => {
        before((done) => {
            Users.create('addNotificationsPostsBlocked1', 'silver lining', 'password', 'en')
                .then((p1) => {
                    p1.preferences.notifications.posts.blocked.push('blocked1');
                    p1.__isModified = true;
                    return p1.save();
                })
                .then(() => {
                    return Users.create('addNotificationsPostsBlocked2', 'silver lining', 'password', 'en');
                })
                .then((p2) => {
                    p2.preferences.notifications.posts.blocked.push('blocked1');
                    p2.__isModified = true;
                    return p2.save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should add a new entry to blocked when an item is newly blocked', (done) => {
            let error = null;
            Users.findOne({email: 'addNotificationsPostsBlocked1', organisation: 'silver lining'})
                .then((found) => {
                    return found.addPreferencesNotificationsPostsBlocked(['newBlocked'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.posts.blocked, item => item === 'newBlocked')).to.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.posts\.blocked/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add preferences\.notifications\.posts\.blocked/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the item is already in the blocked list', (done) => {
            let error = null;
            Users.findOne({email: 'addNotificationsPostsBlocked2', organisation: 'silver lining'})
                .then((found) => {
                    return found.addPreferencesNotificationsPostsBlocked(['blocked1'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.posts.blocked, item => item === 'blocked1')).to.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.posts\.blocked/}});
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
            usersToClear.push('addNotificationsPostsBlocked2');
            usersToClear.push('addNotificationsPostsBlocked1');
            done();
        });
    });
    describe('Preferences.this.removeNotificationsPostsBlocked', () => {
        before((done) => {
            Users.create('removeNotificationsPostsBlocked', 'silver lining', 'password', 'en')
                .then((p) => {
                    p.preferences.notifications.posts.blocked.push('toBeRemoved');
                    p.__isModified = true;
                    return p.save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should do nothing if the item is not present in the blocked list', (done) => {
            let error = null;
            Users.findOne({email: 'removeNotificationsPostsBlocked', organisation: 'silver lining'})
                .then((found) => {
                    return found.removePreferencesNotificationsPostsBlocked(['unknownBlog'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.posts.blocked, item => item === 'unknownBlog1')).to.not.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.posts\.blocked/}});
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
        it('should remove item if present in the blocked list and audit changes', (done) => {
            let error = null;
            Users.findOne({email: 'removeNotificationsPostsBlocked', organisation: 'silver lining'})
                .then((found) => {
                    return found.removePreferencesNotificationsPostsBlocked(['toBeRemoved'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.posts.blocked, item => item === 'toBeRemoved')).to.not.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.posts\.blocked/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove preferences\.notifications\.posts\.blocked/);
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
            usersToClear.push('removeNotificationsPostsBlocked');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.userGroups.inapp.frequency', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsUserGroupsInappFrequency', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.preferences.notifications.userGroups.inapp.frequency = 'daily';
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsUserGroupsInappFrequency', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsUserGroupsInappFrequency(testpref.preferences.notifications.userGroups.inapp.frequency, 'test').save()
                .then((p) => {
                    expect(p.preferences.notifications.userGroups.inapp.frequency).to.equal('daily');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.userGroups\.inapp\.frequency/}});
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
        it('should update to the new Inapp frequency', (done) => {
            let error = null;
            testpref.__isModified = true;
            testpref.setPreferencesNotificationsUserGroupsInappFrequency('immediate', 'test').save()
                .then((p) => {
                    expect(p.preferences.notifications.userGroups.inapp.frequency).to.equal('immediate');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.userGroups\.inapp\.frequency/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('immediate');
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
            usersToClear.push('setPreferencesNotificationsUserGroupsInappFrequency');
            done();
        });
    });
    describe('Preferences.this.preferences.notifications.userGroups.inapp.lastSent', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setPreferencesNotificationsUserGroupsInappLastSent', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.preferences.notifications.userGroups.inapp.lastSent = new Date(2015, 2, 23, 0, 0, 0, 0);
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the NotificationsBlogInAppLastSent', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsUserGroupsInappLastSent(testpref.preferences.notifications.userGroups.inapp.lastSent, 'test').save()
                .then((p) => {
                    expect(moment(p.preferences.notifications.userGroups.inapp.lastSent).format('YYYYMMDD')).to.equal('20150323');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.userGroups\.inapp\.lastSent/}});
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
        it('should update to the new userGroups inapp lastSent', (done) => {
            let error = null;
            testpref.setPreferencesNotificationsUserGroupsInappLastSent(new Date(2015, 2, 24, 0, 0, 0, 0), 'test').save()
                .then((p) => {
                    expect(moment(p.preferences.notifications.userGroups.inapp.lastSent).format('YYYYMMDD')).to.equal('20150324');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^preferences.notifications\.userGroups\.inapp\.lastSent/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(moment(paudit[0].change[0].newValues).format('YYYYMMDD')).to.equal('20150324');
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
            usersToClear.push('setPreferencesNotificationsUserGroupsInappLastSent');
            done();
        });
    });
    describe('Preferences.this.addNotificationsUserGroupsBlocked', () => {
        before((done) => {
            Users.create('addNotificationsUserGroupsBlocked1', 'silver lining', 'password', 'hi')
                .then((p1) => {
                    p1.preferences.notifications.userGroups.blocked.push('blocked1');
                    p1.__isModified = true;
                    return p1.save();
                })
                .then(() => {
                    return Users.create('addNotificationsUserGroupsBlocked2', 'silver lining', 'password', 'hi');
                })
                .then((p2) => {
                    p2.preferences.notifications.userGroups.blocked.push('blocked1');
                    p2.__isModified = true;
                    return p2.save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should add a new entry to blocked when an item is newly blocked', (done) => {
            let error = null;
            Users.findOne({email: 'addNotificationsUserGroupsBlocked1', organisation: 'silver lining'})
                .then((found) => {
                    return found.addPreferencesNotificationsUserGroupsBlocked(['newBlocked'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.userGroups.blocked, item => item === 'newBlocked')).to.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.userGroups\.blocked/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^add preferences\.notifications\.userGroups\.blocked/);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if the item is already in the blocked list', (done) => {
            let error = null;
            Users.findOne({email: 'addNotificationsUserGroupsBlocked2', organisation: 'silver lining'})
                .then((found) => {
                    return found.addPreferencesNotificationsUserGroupsBlocked(['blocked1'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.userGroups.blocked, item => item === 'blocked1')).to.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^add preferences\.notifications\.userGroups\.blocked/}});
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
            usersToClear.push('addNotificationsUserGroupsBlocked2');
            usersToClear.push('addNotificationsUserGroupsBlocked1');
            done();
        });
    });
    describe('Preferences.this.removeNotificationsUserGroupsBlocked', () => {
        before((done) => {
            Users.create('removeNotificationsUserGroupsBlocked', 'silver lining', 'password', 'en')
                .then((p) => {
                    p.preferences.notifications.userGroups.blocked.push('toBeRemoved');
                    p.__isModified = true;
                    return p.save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should do nothing if the item is not present in the blocked list', (done) => {
            let error = null;
            Users.findOne({email: 'removeNotificationsUserGroupsBlocked', organisation: 'silver lining'})
                .then((found) => {
                    return found.removePreferencesNotificationsUserGroupsBlocked(['unknownBlog'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.userGroups.blocked, item => item === 'unknownBlog')).to.not.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.userGroups\.blocked/}});
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
        it('should remove item if present in the blocked list and audit changes', (done) => {
            let error = null;
            Users.findOne({email: 'removeNotificationsUserGroupsBlocked', organisation: 'silver lining'})
                .then((found) => {
                    return found.removePreferencesNotificationsUserGroupsBlocked(['toBeRemoved'], 'test').save();
                })
                .then((p) => {
                    expect(_.find(p.preferences.notifications.userGroups.blocked, item => item === 'toBeRemoved')).to.not.exist;
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^remove preferences\.notifications\.userGroups\.blocked/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].action).to.match(/^remove preferences\.notifications\.userGroups\.blocked/);
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
            usersToClear.push('removeNotificationsUserGroupsBlocked');
            done();
        });
    });
    after((done) => {
        return tu.cleanup({users: usersToClear}, done);
    });
});
