'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let relativeToServer = './../../../../server/';
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
let tu = require('./../../testutils');
let expect = require('chai').expect;
describe('Profile Model', () => {
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
    after((done) => {
        tu.cleanup({users: usersToClear}, done);
    });
});
