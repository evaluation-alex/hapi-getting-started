'use strict';
var Config = require('./../../../config').config({argv: []});
var Users = require('./../../../server/models/users');
var Audit = require('./../../../server/models/audit');
var Roles = require('./../../../server/models/roles');
//var expect = require('chai').expect;
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe.only('Users Model', function () {
    var firstEmail = 'test.create@users.module';
    var secondEmail = 'test.search@users.module';
    var testComplete = function (notify, err) {
        if (notify) {
            if (err) {
                notify(err);
            } else {
                notify();
            }
        }
    };

    before(function (done) {
        Users.connect(Config.hapiMongoModels.mongodb, function (err, db) {
            if (err || !db) {
                throw err;
            }
            done();
        });
    });

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
                testComplete(done, error);
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
                testComplete(done, null);
            });
    });

    it('should returns a result when finding by login and by credentials correctly', function (done) {
        var error = null;
        Users.create(secondEmail, 'test1234')
            .then(function (user) {
                Users.findByEmail(user.email)
                    .then(function (foundUser) {
                        expect(foundUser).to.be.an.instanceof(Users);
                        expect(foundUser.email).to.equal(user.email);
                        Users.findByCredentials(user.email, 'test1234')
                            .then(function (foundUser2) {
                                expect(foundUser2).to.be.an.instanceof(Users);
                                expect(foundUser2.email).to.equal(user.email);
                                expect(foundUser2.password).to.equal(user.password);
                            })
                            .done();
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
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
                testComplete(done, error);
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
                testComplete(done, error);
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
                testComplete(done, error);
            });
    });

    it('hydrate roles should populate _roles', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.hydrateRoles()
                    .then(function (decoratedUser) {
                        expect(decoratedUser._roles).to.be.an.instanceof(Array);
                        expect(decoratedUser._roles[0]).to.be.an.instanceof(Roles);
                        expect(decoratedUser._roles[0].name).to.equal(user.roles[0]);
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('hasPermissionsTo should return true for view users and false for modifying them by default users', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.hydrateRoles()
                    .then(function (decoratedUser) {
                        expect(decoratedUser.hasPermissionsTo('view', '*')).to.be.true();
                        expect(decoratedUser.hasPermissionsTo('update', '*')).to.be.false();
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('hasPermissionsTo should return true for all operations for root', function (done) {
        var error = null;
        Users.findByEmail('root')
            .then(function (user) {
                user.hydrateRoles()
                    .then(function (decoratedUser) {
                        expect(decoratedUser.hasPermissionsTo('view', '*')).to.be.true();
                        expect(decoratedUser.hasPermissionsTo('update', '*')).to.be.true();
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('signup should not create a new session object on the user and should create an audit entry', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.signup(user.email)
                    .then(function (user) {
                        expect(user.session).to.not.exist();
                        Audit.findUsersAudit({userId: user.email, action: 'signup'})
                            .then(function (userAudit) {
                                expect(userAudit[0]).to.be.an.instanceof(Audit);
                                expect(userAudit[0].newValues).to.contain(firstEmail);
                            });
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('loginSuccess should create a new session object on the user and should create an audit entry', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.loginSuccess('test', 'test').done();
                expect(user.session).to.exist();
                Audit.findUsersAudit({userId: user.email, action: 'login success'})
                    .then(function (userAudit) {
                        expect(userAudit[0]).to.be.an.instanceof(Audit);
                        expect(userAudit[0].newValues).to.equal('test');
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('logout should remove the session object on the user and should create an audit entry', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.logout('test', 'test').done();
                expect(user.session).to.not.exist();
                Audit.findUsersAudit({userId: user.email, action: 'logout'})
                    .then(function (userAudit) {
                        expect(userAudit[0]).to.be.an.instanceof(Audit);
                        expect(userAudit[0].newValues).to.equal('test');
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('loginfail should remove the session object on the user and should create an audit entry', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.loginFail('test').done();
                expect(user.session).to.not.exist();
                Audit.findUsersAudit({userId: user.email, action: 'login fail'})
                    .then(function (userAudit) {
                        expect(userAudit[0]).to.be.an.instanceof(Audit);
                        expect(userAudit[0].newValues).to.equal('test');
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('resetPasswordsSent, resetPassword should create audit entries and invalidate sessions', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.resetPasswordSent('test').done();
                Audit.findUsersAudit({userId: user.email, action: 'reset password sent'})
                    .then(function (userAudit) {
                        expect(userAudit[0]).to.be.an.instanceof(Audit);
                    })
                    .done();
            })
            .then(function () {
                Users.findByEmail(firstEmail)
                    .then(function (user) {
                        user.resetPassword('new password confirm', 'test').done();
                        Audit.findUsersAudit({userId: user.email, action: 'reset password'})
                            .then(function (userAudit) {
                                expect(userAudit[0]).to.be.an.instanceof(Audit);
                            })
                            .done();
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('update Roles should create audit entries and invalidate sessions', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.updateRoles(['root'], 'test').done();
                expect(user.session).to.not.exist();
                expect(user.roles).to.include(['root']);
                Audit.findUsersAudit({userId: user.email, action: 'update roles'})
                    .then(function (userAudit) {
                        expect(userAudit[0]).to.be.an.instanceof(Audit);
                        expect(userAudit[0].origValues).to.include(['readonly']);
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    it('deactivate and reactivate should create audit entries and invalidate sessions', function (done) {
        var error = null;
        Users.findByEmail(firstEmail)
            .then(function (user) {
                user.deactivate('test').done();
                expect(user.isActive).to.be.false();
                Audit.findUsersAudit({userId: user.email, action: 'deactivate'})
                    .then(function (userAudit) {
                        expect(userAudit[0]).to.be.an.instanceof(Audit);
                        expect(userAudit[0].origValues).to.be.true();
                    })
                    .done();
            })
            .then(function () {
                Users.findByEmail(firstEmail)
                    .then(function (user) {
                        user.reactivate('test').done();
                        expect(user.isActive).to.be.true();
                        Audit.findUsersAudit({userId: user.email, action: 'reactivate'})
                            .then(function (userAudit) {
                                expect(userAudit[0]).to.be.an.instanceof(Audit);
                                expect(userAudit[0].origValues).to.be.false();
                            })
                            .done();
                    })
                    .done();
            })
            .catch(function (err) {
                expect(err).to.not.exist();
                error = err;
            })
            .finally(function () {
                testComplete(done, error);
            });
    });

    after(function (done) {
        var testUsers = [firstEmail, secondEmail];
        Users.remove({email: { $in: testUsers}}, function (err) {
            if (err) {
                return done(err);
            }
            Audit.remove({objectChangedId: {$in: testUsers}}, function (err) {
                if (err) {
                    return done(err);
                }
                done();
            });
        });
    });

});
