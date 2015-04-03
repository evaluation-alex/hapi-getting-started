'use strict';
let relativeToServer = './../../../../server/';
let Users = require(relativeToServer + 'users/model');
let utils = require(relativeToServer + 'common/utils');
let Uuid = require('node-uuid');
let Audit = require(relativeToServer + 'audit/model');
let moment = require('moment');
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
describe('Session Model', function () {
    let firstEmail = 'test.create@session.module';
    let secondEmail = 'test.search@session.module';
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                return Users.create(firstEmail, 'silver lining', 'passwor', 'en');
            })
            .then(function () {
                return Users.create(secondEmail, 'silver lining', 'passwor', 'en');
            })
            .then(function () {
                done();
            });
    });
    describe('Session.findBySessionCredentials', function () {
        it('should returns a result when finding by login and by credentials correctly', function (done) {
            let error = null;
            Users.findOne({email: secondEmail})
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (user) {
                    let a = user.afterLogin('test');
                    return Users.findBySessionCredentials(secondEmail, a.session.key);
                })
                .then(function (foundUser2) {
                    expect(foundUser2.email).to.equal(secondEmail);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error and user for find by session credentials when password match fails', function (done) {
            let error = null;
            Users.findBySessionCredentials(secondEmail, 'wrongpassword')
                .then(function (foundUser) {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch(function (err) {
                    expect(err.name).to.equal('SessionCredentialsNotMatchingError');
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error for find by session credentials when user does not exist', function (done) {
            let error = null;
            Users.findBySessionCredentials('test.search.fail@users.module', 'unknownuser')
                .then(function (foundUser) {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch(function (err) {
                    expect(err.name).to.equal('UserNotFoundError');
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error for find by session credentials when user session has expired', function (done) {
            let error = null;
            Users.findOne({email: secondEmail})
                .then(function (user) {
                    user.session[0].expires = moment().subtract(5, 'days').toDate();
                    return user.save();
                })
                .then(function (user) {
                    return Users.findBySessionCredentials(secondEmail, user.session[0].key);
                })
                .then(function (foundUser) {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch(function (err) {
                    expect(err.name).to.equal('SessionExpiredError');
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error for find by session credentials when user is not logged in', function (done) {
            let error = null;
            Users.findOne({email: secondEmail})
                .then(function (user) {
                    return user.logout('test', 'test').save();
                })
                .then(function () {
                    return Users.findBySessionCredentials(secondEmail, 'something');
                })
                .then(function (foundUser) {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch(function (err) {
                    expect(err.name).to.equal('UserNotLoggedInError');
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Session.this.loginSuccess', function () {
        it('should do nothing if the user is already logged in from that ip', function (done) {
            let error = null;
            Users.findOne({email: firstEmail})
                .then(function (user) {
                    user.session.push({
                        ipaddress: 'test',
                        key: utils.secureHash(Uuid.v4().toString()),
                        expires: moment().add(1, 'month').toDate()
                    });
                    return user.save();
                }).then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (user) {
                    expect(user.session.length).to.equal(1);
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then(function (userAudit) {
                    expect(userAudit.length).to.equal(0);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should remove the expired session and login the user', function (done) {
            let error = null;
            Users.findOne({email: firstEmail})
                .then(function (user) {
                    user.session = [];
                    user.session.push({
                        ipaddress: 'test',
                        key: utils.secureHash(Uuid.v4().toString()),
                        expires: moment().subtract(1, 'minute').toDate()
                    });
                    return user.save();
                }).then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (user) {
                    expect(user.session.length).to.equal(1);
                    expect(moment().isBefore(user.session[0].expires)).to.be.true();
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then(function (userAudit) {
                    expect(userAudit.length).to.equal(1);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should create a new session object on the user and should create an audit entry, if user hasnt logged in already', function (done) {
            let error = null;
            Audit.remove({objectChangedId: firstEmail})
                .then(function () {
                    return Users.findOne({email: firstEmail});
                })
                .then(function (user) {
                    user.session = [];
                    return user.save();
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                }).then(function (user) {
                    expect(user.session.length).to.equal(1);
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].newValues.ipaddress).to.equal('test');
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should create a new session object on the user and should create an audit entry, if user hasnt logged in from that ip', function (done) {
            let error = null;
            Audit.remove({objectChangedId: firstEmail})
                .then(function () {
                    return Users.findOne({email: firstEmail});
                })
                .then(function (user) {
                    user.session = [{
                        ipaddress: 'test',
                        key: utils.secureHash(Uuid.v4()),
                        expires: moment().add(1, 'month').toDate()
                    }];
                    return user.save();
                })
                .then(function (user) {
                    return user.loginSuccess('test2', 'test').save();
                }).then(function (user) {
                    expect(user.session.length).to.equal(2);
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].newValues.ipaddress).to.equal('test2');
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
    describe('Session.this.logout', function () {
        it('should remove the session object on the user and should create an audit entry', function (done) {
            let error = null;
            Audit.remove({objectChangedId: firstEmail})
                .then(function () {
                    return Users.findOne({email: firstEmail});
                })
                .then(function (user) {
                    user.session = [{
                        ipaddress: 'test',
                        key: utils.secureHash(Uuid.v4()),
                        expires: moment().add(1, 'month').toDate()
                    }];
                    return user.save();
                })
                .then(function (user) {
                    return user.logout('test', 'test').save();
                })
                .then(function (user) {
                    expect(user.session.length).to.equal(0);
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
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
    describe('Session.this.loginFail', function () {
        it('should remove the session object on the user and should create an audit entry', function (done) {
            let error = null;
            Users.findOne({email: firstEmail})
                .then(function (user) {
                    return user.loginFail('test', 'test').save();
                })
                .then(function (user) {
                    expect(user.session.length).to.equal(0);
                    return Audit.findAudit('users', user.email, {'change.action': 'login fail'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].newValues).to.equal('test');
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
    after(function (done) {
        let testUsers = [firstEmail, secondEmail];
        return tu.cleanup({users: testUsers}, done);
    });
});
