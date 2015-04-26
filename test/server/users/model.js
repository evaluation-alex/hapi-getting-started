'use strict';
let relativeToServer = './../../../server/';
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
let Roles = require(relativeToServer + 'users/roles/model');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('Users Model', () => {
    let firstEmail = 'test.create@users.module';
    let secondEmail = 'test.search@users.module';
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    describe('Users.create', () => {
        it('should create a new instance when create succeeds', (done) => {
            let error = null;
            Users.create(firstEmail, 'silver lining', 'test123', 'en')
                .then((result) => {
                    expect(result).to.be.an.instanceof(Users);
                    expect(result.roles).to.be.an.instanceof(Array);
                    expect(result.roles).to.deep.equal(['readonly']);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should throw an error when create fails if you try to create with the same email', (done) => {
            Users.create(firstEmail, 'silver lining', 'test123', 'en')
                .then((result) => {
                    expect(result).to.not.exist;
                })
                .catch((err) => {
                    expect(err).to.be.an.instanceof(Error);
                })
                .finally(() => {
                    tu.testComplete(done, null);
                });
        });
    });
    describe('Users.findByCredentials', () => {
        it('should returns a result when finding by login and by credentials correctly', (done) => {
            let error = null;
            Users.create(secondEmail, 'silver lining', 'test1234', 'en')
                .then((user) => {
                    return Users.findOne({email: user.email});
                })
                .then((foundUser) => {
                    expect(foundUser).to.be.an.instanceof(Users);
                    expect(foundUser.email).to.equal(secondEmail);
                    return Users.findByCredentials(secondEmail, 'test1234');
                })
                .then((foundUser2) => {
                    expect(foundUser2).to.be.an.instanceof(Users);
                    expect(foundUser2.email).to.equal(secondEmail);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error and user for find by credentials when password match fails', (done) => {
            let error = null;
            Users.findByCredentials(secondEmail, 'wrongpassword')
                .then((foundUser) => {
                    error = foundUser;
                    expect(foundUser).to.not.exist;
                })
                .catch((err) => {
                    expect(err.name).to.equal('IncorrectPasswordError');
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should returns error for find by credentials when user does not exist', (done) => {
            let error = null;
            Users.findByCredentials('test.search.fail@users.module', 'unknownuser')
                .then((foundUser) => {
                    error = foundUser;
                    expect(foundUser).to.not.exist;
                })
                .catch((err) => {
                    expect(err.name).to.equal('UserNotFoundError');
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Users.areValid', () => {
        it('should return empty array when nothing is sent', (done) => {
            let error = null;
            Users.areValid([], 'silver lining')
                .then((result) => {
                    expect(result).to.be.empty();
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should return an object with as many entries as emails sent, appropriately populated', (done) => {
            let error = null;
            Users.areValid([firstEmail, secondEmail, 'bogus'], 'silver lining')
                .then((result) => {
                    expect(result).to.exist;
                    expect(result[firstEmail]).to.be.true;
                    expect(result[secondEmail]).to.be.true;
                    expect(result.bogus).to.be.false;
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Users.this.hasPermissionsTo', () => {
        it('should return true for view users and false for modifying them by default users', (done) => {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) => {
                    return Roles.find({name: {$in: user.roles}})
                        .then((roles) => {
                            user._roles = roles;
                            return user;
                        });
                })
                .then((decoratedUser) => {
                    expect(decoratedUser.hasPermissionsTo('view', '*')).to.be.true;
                    expect(decoratedUser.hasPermissionsTo('update', '*')).to.be.false;
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('should return true for all operations for root', (done) => {
            let error = null;
            Users.findOne({email: 'root'})
                .then((user) => {
                    return Roles.find({name: {$in: user.roles}})
                        .then((roles) => {
                            user._roles = roles;
                            return user;
                        });
                })
                .then((decoratedUser) => {
                    expect(decoratedUser.hasPermissionsTo('view', '*')).to.be.true;
                    expect(decoratedUser.hasPermissionsTo('update', '*')).to.be.true;
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Users.this.setPassword, Users.this.resetPasswordSent', () => {
        it('resetPasswordsSent should create audit entries', (done) => {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) => {
                    return user.resetPasswordSent('test').save();
                })
                .then((user) => {
                    return Audit.findAudit('users', user.email, {'change.action': 'reset password sent'});
                })
                .then((userAudit) => {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('resetPassword should create audit entries and invalidate sessions', (done) => {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) => {
                    return user.setPassword('new password confirm', 'test').save();
                })
                .then((user) => {
                    return Audit.findAudit('users', user.email, {'change.action': 'reset password'});
                })
                .then((userAudit) => {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('setPassword should do nothing if called with a falsy password', (done) => {
            let error = null;
            Audit.remove({objectChangedId: firstEmail})
                .then(() => {
                    return Users.findOne({email: firstEmail});
                })
                .then((user) => {
                    return user.setPassword(undefined, 'test').save();
                })
                .then((user) => {
                    return Audit.findAudit('users', user.email, {'change.action': 'reset password'});
                })
                .then((userAudit) => {
                    expect(userAudit.length).to.equal(0);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Users.this.setRoles', () => {
        it('update Roles should create audit entries and invalidate sessions', (done) => {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) => {
                    return user.setRoles(['root'], 'test').save();
                }).then((user) => {
                    expect(user.roles).to.include('root');
                    return Audit.findAudit('users', user.email, {'change.action': 'roles'});
                })
                .then((userAudit) => {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].origValues).to.include('readonly');
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Users.this.reactivate, Users.this.deactivate', () => {
        it('deactivate should create audit entries and invalidate sessions and mark user as inactive', (done) => {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) => {
                    return user.deactivate('test').save();
                })
                .then((user) => {
                    expect(user.isActive).to.be.false;
                    return Audit.findAudit('users', user.email, {'change.action': 'isActive'});
                })
                .then((userAudit) => {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].origValues).to.be.true;
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
        it('reactivate should create audit entries and the user should be active again', (done) => {
            let error = null;
            Users.findOne({email: firstEmail})
                .then((user) => {
                    return user.reactivate('test').save();
                })
                .then((user) => {
                    expect(user.isActive).to.be.true;
                    return Audit.findAudit('users', user.email, {'change.action': 'isActive'});
                })
                .then((userAudit) => {
                    expect(userAudit.length).to.equal(2);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .finally(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    after((done) => {
        let testUsers = [firstEmail, secondEmail];
        return tu.cleanup({users: testUsers}, done);
    });
});
