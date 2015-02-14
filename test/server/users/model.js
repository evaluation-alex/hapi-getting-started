'use strict';
var relativeToServer = './../../../server/';

var Users = require(relativeToServer+'users/model');
var Audit = require(relativeToServer+'audit/model');
var Roles = require(relativeToServer+'roles/model');
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
            .then(function() {
                done();
            });
    });

    describe('Users.create', function () {
        it('should create a new instance when create succeeds', function (done) {
            var error = null;
            Users.create(firstEmail, 'test123')
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
            Users.create(firstEmail, 'test123')
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

    describe('Users.findByCredentials, Users.findByEmail', function () {
        it('should returns a result when finding by login and by credentials correctly', function (done) {
            var error = null;
            Users.create(secondEmail, 'test1234')
                .then(function (user) {
                    return Users.findByEmail(user.email);
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

        it('should returns false and user for find by credentials when password match fails', function (done) {
            var error = null;
            Users.findByCredentials(secondEmail, 'wrongpassword')
                .then(function (foundUser) {
                    expect(foundUser.fail).to.be.true();
                    expect(foundUser.user.email).to.equal(secondEmail);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });

        it('should returns false for find by credentials when user does not exist', function (done) {
            var error = null;
            Users.findByCredentials('test.search.fail@users.module', 'unknownuser')
                .then(function (foundUser) {
                    expect(foundUser).to.be.false();
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });

        it('should returns a null when finding by email that does not exist', function (done) {
            var error = null;
            Users.findByEmail({email: 'test.not.found@users.module'})
                .then(function (foundUser) {
                    expect(foundUser).to.be.false();
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

    describe('Users.areValid', function () {
        it('should return empty array when nothing is sent', function (done) {
            var error = null;
            Users.areValid('email', [])
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
        it('should return an object with as many entries as emails sent, appropriately populated', function(done) {
            var error = null;
            Users.areValid('email', [firstEmail, secondEmail, 'bogus'])
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

    describe('Users.this._hydrateRoles', function () {
        it('should populate _roles', function (done) {
            var error = null;
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.hydrateRoles();
                })
                .then(function (decoratedUser) {
                    expect(decoratedUser._roles).to.be.an.instanceof(Array);
                    expect(decoratedUser._roles[0]).to.be.an.instanceof(Roles);
                    expect(decoratedUser._roles[0].name).to.equal(decoratedUser.roles[0]);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should have _roles to be an empty object / not exist when there are no roles', function (done) {
            var error = null;
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    user.roles = [];
                    return user.hydrateRoles();
                })
                .then(function (decoratedUser) {
                    expect(decoratedUser._roles).to.be.empty();
                    decoratedUser.roles = ['readonly'];
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .finally(function () {
                    tu.testComplete(done, error);
                });
        });
        it('should do nothing if already populated or no roles defined', function (done) {
            var error = null;
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    delete user.roles;
                    return user;
                })
                .then(function (user) {
                    return user.hydrateRoles();
                })
                .then(function (decoratedUser) {
                    expect(decoratedUser._roles).to.be.undefined();
                    decoratedUser.roles = ['readonly'];
                    return decoratedUser.hydrateRoles();
                })
                .then(function (decoratedUser) {
                    expect(decoratedUser._roles.length).to.equal(1);
                    return decoratedUser.hydrateRoles();
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
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.hydrateRoles();
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
            Users.findByEmail('root')
                .then(function (user) {
                    return user.hydrateRoles();
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

    describe('Users.this.loginSuccess', function () {
        it('should create a new session object on the user and should create an audit entry', function (done) {
            var error = null;
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.loginSuccess('test', 'test')._save();
                }).then(function (user) {
                    expect(user.session).to.exist();
                    return Audit.findAudit('Users',  user.email, {action: 'login success'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].newValues).to.equal('test');
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

    describe('Users.this.logout', function () {
        it('should remove the session object on the user and should create an audit entry', function (done) {
            var error = null;
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.logout('test', 'test')._save();
                })
                .then(function (user) {
                    expect(user.session).to.not.exist();
                    return Audit.findAudit('Users',  user.email, {action: 'logout'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].newValues).to.equal('test');
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

    describe('Users.this.loginFail', function () {
        it('should remove the session object on the user and should create an audit entry', function (done) {
            var error = null;
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.loginFail('test', 'test')._save();
                })
                .then(function (user) {
                    expect(user.session).to.not.exist();
                    return Audit.findAudit('Users',  user.email, {action: 'login fail'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].newValues).to.equal('test');
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

    describe('Users.this.resetPassword, Users.this.resetPasswordSent', function () {
        it('resetPasswordsSent should create audit entries', function (done) {
            var error = null;
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.resetPasswordSent('test')._save();
                })
                .then(function (user) {
                    return Audit.findAudit('Users',  user.email, {action: 'reset password sent'});
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
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.resetPassword('new password confirm', 'test')._save();
                })
                .then(function (user) {
                    expect(user.session).to.not.exist();
                    return Audit.findAudit('Users',  user.email, {action: 'reset password'});
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

    describe('Users.this.updateRoles', function () {
        it('update Roles should create audit entries and invalidate sessions', function (done) {
            var error = null;
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.updateRoles(['root'], 'test')._save();
                }).then(function (user) {
                    expect(user.session).to.not.exist();
                    expect(user.roles).to.include(['root']);
                    return Audit.findAudit('Users',  user.email, {action: 'update roles'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].origValues).to.include(['readonly']);
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
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.deactivate('test')._save();
                })
                .then(function (user) {
                    expect(user.isActive).to.be.false();
                    return Audit.findAudit('Users',  user.email, {action: 'isActive'});
                })
                .then(function (userAudit) {
                    expect(userAudit[0]).to.be.an.instanceof(Audit);
                    expect(userAudit[0].origValues).to.be.true();
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
            Users.findByEmail(firstEmail)
                .then(function (user) {
                    return user.reactivate('test')._save();
                })
                .then(function (user) {
                    expect(user.isActive).to.be.true();
                    return Audit.findAudit('Users',  user.email, {action: 'isActive'});
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
