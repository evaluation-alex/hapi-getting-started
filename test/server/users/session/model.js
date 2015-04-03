'use strict';
let relativeToServer = './../../../../server/';
let Users = require(relativeToServer + 'users/model');
let utils = require(relativeToServer + 'common/utils');
let Uuid = require('node-uuid');
let Audit = require(relativeToServer + 'audit/model');
let moment = require('moment');
let tu = require('./../../testutils');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Session Model', () => {
    let firstEmail = 'test.create@session.module';
    let secondEmail = 'test.search@session.module';
    before((done) =>  {
        tu.setupRolesAndUsers()
            .then(() =>  {
                return Users.create(firstEmail, 'silver lining', 'passwor', 'en');
            })
            .then(() =>  {
                return Users.create(secondEmail, 'silver lining', 'passwor', 'en');
            })
            .then(() =>  {
                done();
            });
    });
    describe('Session.findBySessionCredentials', () => {
        it('should returns a result when finding by login and by credentials correctly', (done) =>  {
            let error = null;
            Users.findOne({email: secondEmail})
                .then((user) =>  {
                    return user.loginSuccess('test', 'test').save();
                })
                .then((user) =>  {
                    let a = user.afterLogin('test');
                    return Users.findBySessionCredentials(secondEmail, a.session.key);
                })
                .then((foundUser2) =>  {
                    expect(foundUser2.email).to.equal(secondEmail);
                })
                .catch((err) =>  {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error and user for find by session credentials when password match fails', (done) =>  {
            let error = null;
            Users.findBySessionCredentials(secondEmail, 'wrongpassword')
                .then((foundUser) =>  {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch((err) =>  {
                    expect(err.name).to.equal('SessionCredentialsNotMatchingError');
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error for find by session credentials when user does not exist', (done) =>  {
            let error = null;
            Users.findBySessionCredentials('test.search.fail@users.module', 'unknownuser')
                .then((foundUser) =>  {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch((err) =>  {
                    expect(err.name).to.equal('UserNotFoundError');
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error for find by session credentials when user session has expired', (done) =>  {
            let error = null;
            Users.findOne({email: secondEmail})
                .then((user) =>  {
                    user.session[0].expires = moment().subtract(5, 'days').toDate();
                    return user.save();
                })
                .then((user) =>  {
                    return Users.findBySessionCredentials(secondEmail, user.session[0].key);
                })
                .then((foundUser) =>  {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch((err) =>  {
                    expect(err.name).to.equal('SessionExpiredError');
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error for find by session credentials when user is not logged in', (done) =>  {
            let error = null;
            Users.findOne({email: secondEmail})
                .then((user) =>  {
                    return user.logout('test', 'test').save();
                })
                .then(() =>  {
                    return Users.findBySessionCredentials(secondEmail, 'something');
                })
                .then((foundUser) =>  {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch((err) =>  {
                    expect(err.name).to.equal('UserNotLoggedInError');
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Session.this.loginSuccess', () => {
        it('should do nothing if the user is already logged in from that ip', (done) =>  {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) =>  {
                    user.session.push({
                        ipaddress: 'test',
                        key: utils.secureHash(Uuid.v4().toString()),
                        expires: moment().add(1, 'month').toDate()
                    });
                    return user.save();
                }).then((user) =>  {
                    return user.loginSuccess('test', 'test').save();
                })
                .then((user) =>  {
                    expect(user.session.length).to.equal(1);
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then((userAudit) =>  {
                    expect(userAudit.length).to.equal(0);
                })
                .catch((err) =>  {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should remove the expired session and login the user', (done) =>  {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) =>  {
                    user.session = [];
                    user.session.push({
                        ipaddress: 'test',
                        key: utils.secureHash(Uuid.v4().toString()),
                        expires: moment().subtract(1, 'minute').toDate()
                    });
                    return user.save();
                }).then((user) =>  {
                    return user.loginSuccess('test', 'test').save();
                })
                .then((user) =>  {
                    expect(user.session.length).to.equal(1);
                    expect(moment().isBefore(user.session[0].expires)).to.be.true();
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then((userAudit) =>  {
                    expect(userAudit.length).to.equal(1);
                })
                .catch((err) =>  {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should create a new session object on the user and should create an audit entry, if user hasnt logged in already', (done) =>  {
            let error = null;
            Audit.remove({objectChangedId: firstEmail})
                .then(() =>  {
                    return Users.findOne({email: firstEmail});
                })
                .then((user) =>  {
                    user.session = [];
                    return user.save();
                })
                .then((user) =>  {
                    return user.loginSuccess('test', 'test').save();
                }).then((user) =>  {
                    expect(user.session.length).to.equal(1);
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then((userAudit) =>  {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].newValues.ipaddress).to.equal('test');
                })
                .catch((err) =>  {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should create a new session object on the user and should create an audit entry, if user hasnt logged in from that ip', (done) =>  {
            let error = null;
            Audit.remove({objectChangedId: firstEmail})
                .then(() =>  {
                    return Users.findOne({email: firstEmail});
                })
                .then((user) =>  {
                    user.session = [{
                        ipaddress: 'test',
                        key: utils.secureHash(Uuid.v4()),
                        expires: moment().add(1, 'month').toDate()
                    }];
                    return user.save();
                })
                .then((user) =>  {
                    return user.loginSuccess('test2', 'test').save();
                }).then((user) =>  {
                    expect(user.session.length).to.equal(2);
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then((userAudit) =>  {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].newValues.ipaddress).to.equal('test2');
                })
                .catch((err) =>  {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Session.this.logout', () => {
        it('should remove the session object on the user and should create an audit entry', (done) =>  {
            let error = null;
            Audit.remove({objectChangedId: firstEmail})
                .then(() =>  {
                    return Users.findOne({email: firstEmail});
                })
                .then((user) =>  {
                    user.session = [{
                        ipaddress: 'test',
                        key: utils.secureHash(Uuid.v4()),
                        expires: moment().add(1, 'month').toDate()
                    }];
                    return user.save();
                })
                .then((user) =>  {
                    return user.logout('test', 'test').save();
                })
                .then((user) =>  {
                    expect(user.session.length).to.equal(0);
                    return Audit.findAudit('users', user.email, {'change.action': 'user.session'});
                })
                .then((userAudit) =>  {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                })
                .catch((err) =>  {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Session.this.loginFail', () => {
        it('should remove the session object on the user and should create an audit entry', (done) =>  {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) =>  {
                    return user.loginFail('test', 'test').save();
                })
                .then((user) =>  {
                    expect(user.session.length).to.equal(0);
                    return Audit.findAudit('users', user.email, {'change.action': 'login fail'});
                })
                .then((userAudit) =>  {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].newValues).to.equal('test');
                })
                .catch((err) =>  {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    after((done) =>  {
        let testUsers = [firstEmail, secondEmail];
        return tu.cleanup({users: testUsers}, done);
    });
});
