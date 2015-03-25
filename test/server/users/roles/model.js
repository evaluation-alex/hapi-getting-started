'use strict';
var relativeToServer = './../../../../server/';

var Roles = require(relativeToServer + '/users/roles/model');
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

describe('Roles Model', function () {
    var rolesToClear = [];
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                done();
            });
    });

    describe('Roles.create', function () {
        it('should create a new document', function (done) {
            var error = null;
            Roles.create('newRole', 'silver lining', [{
                action: 'view',
                object: 'self'
            }, {
                action: 'update',
                object: 'nooneelse'
            }])
                .then(function (r) {
                    expect(r).to.exist();
                    expect(r).to.be.an.instanceof(Roles);
                })
                .catch(function (err) {
                    expect(err).to.not.exist();
                    error = err;
                })
                .done(function () {
                    rolesToClear.push('newRole');
                    tu.testComplete(done, error);
                });
        });
        it('should not allow two objects with the same name', function (done) {
            var error = null;
            Roles.create('newRole', 'silver lining', [{
                action: 'view',
                object: 'self'
            }, {
                action: 'update',
                object: 'nooneelse'
            }])
                .then(function (r) {
                    error = r;
                    expect(r).to.not.exist();
                })
                .catch(function (err) {
                    expect(err).to.exist();
                })
                .done(function () {
                    tu.testComplete(done, error);
                });
        });
    });

    describe('Roles.this.hasPermissionsTo', function () {
        var role = null;
        before(function (done) {
            Roles.create('hasPermissions', 'silver lining', [{
                action: 'view',
                object: 'test'
            }, {
                action: 'update',
                object: 'test2'
            }])
                .then(function (r) {
                    role = r;
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        it ('should return true if you match a specific action, object combination', function (done) {
            try {
                expect(role.hasPermissionsTo('view', 'test')).to.be.true();
                done();
            } catch (err) {
                if (err) {
                    done(err);
                }
            }
        });
        it ('should return true if you ask for view when you have update permissions set on the role for the givn object', function (done) {
            try {
                expect(role.hasPermissionsTo('view', 'test2')).to.be.true();
                done();
            } catch (err) {
                if (err) {
                    done(err);
                }
            }
        });
        it ('should return false if you dont match any permissions for the role', function (done) {
            try{
                expect(role.hasPermissionsTo('view', 'test3')).to.be.false();
                expect(role.hasPermissionsTo('update', 'test3')).to.be.false();
                done();
            } catch (err) {
                if (err) {
                    done(err);
                }
            }
        });
        it ('should return true if you have permissions permissions on *', function (done) {
            Roles._find({name: 'root', organisation: 'silver lining'})
                .then(function (root) {
                    expect(root[0].hasPermissionsTo('view', 'test3')).to.be.true();
                    expect(root[0].hasPermissionsTo('update', 'test3')).to.be.true();
                    expect(root[0].hasPermissionsTo('update', '*')).to.be.true();
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });
        after(function(done) {
            rolesToClear.push('hasPermissions');
            done();
        });
    });

    after(function (done) {
        tu.cleanupRoles(rolesToClear)
            .then(function () {
                tu.cleanup({}, done);
            })
            .done();
    });
});
