'use strict';
var relativeToServer = './../../../server/';

var Users = require(relativeToServer + 'users/model');
var Audit = require(relativeToServer + 'audit/model');
var Roles = require(relativeToServer + 'users/roles/model');
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;

describe('Users Model', function () {
    var firstEmail = 'test.create@users.module';
    var secondEmail = 'test.search@users.module';
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                done();
            });
    });

    describe('Users.create', function () {
        it('should create a new instance when create succeeds', function (done) {
            var error = null;
            Users.create(firstEmail, 'silver lining', 'test123', 'en')
                .then(function (result) {
                    expect(result).to.be.an.instanceof(Users);
                    expect(result.roles).to.be.an.instanceof(Array);
                    expect(result.roles).to.deep.equal(['readonly']);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });

        it('should throw an error when create fails if you try to create with the same email', function (done) {
            Users.create(firstEmail, 'silver lining', 'test123', 'en')
                .then(function (result) {
                    expect(result).to.not.exist();
                })
                .catch(function (err) {
                    expect(err).to.be.an.instanceof(Error);
                })
                .finally(function () {
                    tu.testComplete(done, null);
                });
        });
    });

    describe('Users.findByCredentials', function () {
        it('should returns a result when finding by login and by credentials correctly', function (done) {
            var error = null;
            Users.create(secondEmail, 'silver lining', 'test1234', 'en')
                .then(function (user) {
                    return Users._findOne({email: user.email});
                })
                .then(function (foundUser) {
                    expect(foundUser).to.be.an.instanceof(Users);
                    expect(foundUser.email).to.equal(secondEmail);
                    return Users.findByCredentials(secondEmail, 'test1234');
                })
                .then(function (foundUser2) {
                    expect(foundUser2).to.be.an.instanceof(Users);
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

        it('should returns error and user for find by credentials when password match fails', function (done) {
            var error = null;
            Users.findByCredentials(secondEmail, 'wrongpassword')
                .then(function (foundUser) {
                    error = foundUser;
                    expect(foundUser).to.not.exist();
                })
                .catch(function (err) {
                    expect(err.name).to.equal('IncorrectPasswordError');
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });

        it('should returns error for find by credentials when user does not exist', function (done) {
            var error = null;
            Users.findByCredentials('test.search.fail@users.module', 'unknownuser')
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

    });

    describe('Users.areValid', function () {
        it('should return empty array when nothing is sent', function (done) {
            var error = null;
            Users.areValid([], 'silver lining')
                .then(function (result) {
                    expect(result).to.be.empty();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should return an object with as many entries as emails sent, appropriately populated', function (done) {
            var error = null;
            Users.areValid([firstEmail, secondEmail, 'bogus'], 'silver lining')
                .then(function (result) {
                    expect(result).to.exist();
                    expect(result[firstEmail]).to.be.true();
                    expect(result[secondEmail]).to.be.true();
                    expect(result.bogus).to.be.false();
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

    describe('Users.this.hasPermissionsTo', function () {
        it('should return true for view users and false for modifying them by default users', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return Roles._find({name: {$in: user.roles}})
                        .then(function (roles) {
                            user._roles = roles;
                            return user;
                        });
                })
                .then(function (decoratedUser) {
                    expect(decoratedUser.hasPermissionsTo('view', '*')).to.be.true();
                    expect(decoratedUser.hasPermissionsTo('update', '*')).to.be.false();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });

        it('should return true for all operations for root', function (done) {
            var error = null;
            Users._findOne({email: 'root'})
                .then(function (user) {
                    return Roles._find({name: {$in: user.roles}})
                        .then(function (roles) {
                            user._roles = roles;
                            return user;
                        });
                })
                .then(function (decoratedUser) {
                    expect(decoratedUser.hasPermissionsTo('view', '*')).to.be.true();
                    expect(decoratedUser.hasPermissionsTo('update', '*')).to.be.true();
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

    describe('Users.this.setPassword, Users.this.resetPasswordSent', function () {
        it('resetPasswordsSent should create audit entries', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return user.resetPasswordSent('test').save();
                })
                .then(function (user) {
                    return Audit.findAudit('users', user.email, {'change.action': 'reset password sent'});
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
        it('resetPassword should create audit entries and invalidate sessions', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return user.setPassword('new password confirm', 'test').save();
                })
                .then(function (user) {
                    return Audit.findAudit('users', user.email, {'change.action': 'reset password'});
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
        it('setPassword should do nothing if called with a falsy password', function (done) {
            var error = null;
            Audit.remove({objectChangedId: firstEmail}, function (err) {
                if (err) {
                    done(err);
                }
                Users._findOne({email: firstEmail})
                    .then(function (user) {
                        return user.setPassword(undefined, 'test').save();
                    })
                    .then(function (user) {
                        return Audit.findAudit('users', user.email, {'change.action': 'reset password'});
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
        });
    });

    describe('Users.this.setRoles', function () {
        it('update Roles should create audit entries and invalidate sessions', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return user.setRoles(['root'], 'test').save();
                }).then(function (user) {
                    expect(user.roles).to.include(['root']);
                    return Audit.findAudit('users', user.email, {'change.action': 'roles'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].origValues).to.include(['readonly']);
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

    describe('Users.this.reactivate, Users.this.deactivate', function () {
        it('deactivate should create audit entries and invalidate sessions and mark user as inactive', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return user.deactivate('test').save();
                })
                .then(function (user) {
                    expect(user.isActive).to.be.false();
                    return Audit.findAudit('users', user.email, {'change.action': 'isActive'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].change[0].origValues).to.be.true();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('reactivate should create audit entries and the user should be active again', function (done) {
            var error = null;
            Users._findOne({email: firstEmail})
                .then(function (user) {
                    return user.reactivate('test').save();
                })
                .then(function (user) {
                    expect(user.isActive).to.be.true();
                    return Audit.findAudit('users', user.email, {'change.action': 'isActive'});
                })
                .then(function (userAudit) {
                    expect(userAudit.length).to.equal(2);
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
