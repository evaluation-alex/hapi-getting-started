'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let Users = require('./../../../../build/users/model');
let Audit = require('./../../../../build/audit/model');
let tu = require('./../../testutils');
let expect = require('chai').expect;
describe('Profile DAO', () => {
    let usersToClear = [];
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    describe('Profile.this.setFirstName', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setProfileFirstName', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.profile.firstName = 'ksheth';
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the firstName', (done) => {
            let error = null;
            testpref.setProfileFirstName(testpref.profile.firstName, 'test').save()
                .then((p) => {
                    expect(p.profile.firstName).to.equal('ksheth');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.firstName/}});
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
        it('should update to the new firstName', (done) => {
            let error = null;
            testpref.setProfileFirstName('kumarpal', 'test').save()
                .then((p) => {
                    expect(p.profile.firstName).to.equal('kumarpal');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.firstName/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('kumarpal');
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
            usersToClear.push('setProfileFirstName');
            done();
        });
    });
    describe('Profile.this.setLastName', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setProfileLastName', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.profile.lastName = 'seth';
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the lastName', (done) => {
            let error = null;
            testpref.setProfileLastName(testpref.profile.lastName, 'test').save()
                .then((p) => {
                    expect(p.profile.lastName).to.equal('seth');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.lastName/}});
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
        it('should update to the new lastName', (done) => {
            let error = null;
            testpref.setProfileLastName('sheth', 'test').save()
                .then((p) => {
                    expect(p.profile.lastName).to.equal('sheth');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.lastName/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('sheth');
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
            usersToClear.push('setProfileLastName');
            done();
        });
    });
    describe('Profile.this.setPreferredName', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setProfilePreferredName', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.profile.preferredName = 'kumar';
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the preferredName', (done) => {
            let error = null;
            testpref.setProfilePreferredName(testpref.profile.preferredName, 'test').save()
                .then((p) => {
                    expect(p.profile.preferredName).to.equal('kumar');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.preferredName/}});
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
        it('should update to the new preferredName', (done) => {
            let error = null;
            testpref.setProfilePreferredName('ks', 'test').save()
                .then((p) => {
                    expect(p.profile.preferredName).to.equal('ks');
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.preferredName/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.equal('ks');
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
            usersToClear.push('setProfilePreferredName');
            done();
        });
    });
    describe('Profile.this.setFacebook', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setProfileFacebook', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.profile.facebook = {fbid: 1, graph: 'whatever'};
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the facebook profile', (done) => {
            let error = null;
            testpref.setProfileFacebook(testpref.profile.facebook, 'test').save()
                .then((p) => {
                    expect(p.profile.facebook).to.deep.equal({fbid: 1, graph: 'whatever'});
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.facebook/}});
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
        it('should update to the new facebook profile', (done) => {
            let error = null;
            testpref.setProfileFacebook({fbid: 1, graph: 'whatever2'}, 'test').save()
                .then((p) => {
                    expect(p.profile.facebook).to.deep.equal({fbid: 1, graph: 'whatever2'});
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.facebook/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.deep.equal({fbid: 1, graph: 'whatever2'});
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
            usersToClear.push('setProfileFacebook');
            done();
        });
    });
    describe('Profile.this.setGoogle', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setProfileGoogle', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.profile.google = {gid: 1, graph: 'whatever'};
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the facebook profile', (done) => {
            let error = null;
            testpref.setProfileGoogle(testpref.profile.google, 'test').save()
                .then((p) => {
                    expect(p.profile.google).to.deep.equal({gid: 1, graph: 'whatever'});
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.google/}});
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
        it('should update to the new google profile', (done) => {
            let error = null;
            testpref.setProfileGoogle({gid: 1, graph: 'whatever2'}, 'test').save()
                .then((p) => {
                    expect(p.profile.google).to.deep.equal({gid: 1, graph: 'whatever2'});
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.google/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.deep.equal({gid: 1, graph: 'whatever2'});
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
            usersToClear.push('setProfileGoogle');
            done();
        });
    });
    describe('Profile.this.setTwitter', () => {
        let testpref = null;
        before((done) => {
            //email, organisation, locale, by
            Users.create('setProfileTwitter', 'silver lining', 'password', 'hi')
                .then((p) => {
                    testpref = p;
                    testpref.profile.twitter = {tid: 1, followers: 'whatever'};
                    testpref.__isModified = true;
                    return testpref.save();
                })
                .then(() => {
                    done();
                });
        });
        it('should do nothing if there is no change in the twitter profile', (done) => {
            let error = null;
            testpref.setProfileTwitter(testpref.profile.twitter, 'test').save()
                .then((p) => {
                    expect(p.profile.twitter).to.deep.equal({tid: 1, followers: 'whatever'});
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.twitter/}});
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
        it('should update to the new twitter profile', (done) => {
            let error = null;
            testpref.setProfileTwitter({tid: 1, followers: 'whatever2'}, 'test').save()
                .then((p) => {
                    expect(p.profile.twitter).to.deep.equal({tid: 1, followers: 'whatever2'});
                    return Audit.findAudit('users', p.email, {'change.action': {$regex: /^profile\.twitter/}});
                })
                .then((paudit) => {
                    expect(paudit.length).to.equal(1);
                    expect(paudit[0].change[0].newValues).to.deep.equal({tid: 1, followers: 'whatever2'});
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
            usersToClear.push('setProfileTwitter');
            done();
        });
    });
    after((done) => {
        tu.cleanup({users: usersToClear}, done);
    });
});
