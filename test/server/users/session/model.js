'use strict';
var relativeToServer = './../../../../server/';

var Users = require(relativeToServer + 'users/model');
var Audit = require(relativeToServer + 'audit/model');
var moment = require('moment');
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

describe('Session Model', function () {
    var firstEmail = 'test.create@session.module';
    var secondEmail = 'test.search@session.module';
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
            var error = null;
            Users._findOne({email: secondEmail})
                .then(function (user) {
                    return user.loginSuccess('test').save();
                })
                .then(function (user) {
                    var a = user.afterLogin();
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
            var error = null;
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
            var error = null;
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
            var error = null;
            Users._findOne({email: secondEmail})
                .then(function (user) {
                    user.session.expires = moment().subtract(5, 'days').toDate();
                    return user.save();
                })
                .then(function (user) {
                    return Users.findBySessionCredentials(secondEmail, user.session.key);
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
            var error = null;
            Users._findOne({email: secondEmail})
                .then(function (user) {
                    return user.logout('tests').save();
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
        it('should create a new session object on the user and should create an audit entry', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                }).then(function (user) {
                    expect(user.session).to.exist();
                    return Audit.findAudit('users', user.email, {'change.action': 'login success'});
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

    describe('Session.this.logout', function () {
        it('should remove the session object on the user and should create an audit entry', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return user.logout('test', 'test').save();
                })
                .then(function (user) {
                    expect(user.session).to.not.exist();
                    return Audit.findAudit('users', user.email, {'change.action': 'logout'});
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

    describe('Session.this.loginFail', function () {
        it('should remove the session object on the user and should create an audit entry', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return user.loginFail('test', 'test').save();
                })
                .then(function (user) {
                    expect(user.session).to.not.exist();
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
        var testUsers = [firstEmail, secondEmail];
        return tu.cleanup({users: testUsers}, done);
    });
});
