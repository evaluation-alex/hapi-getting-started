'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let relativeToServer = './../../../../server/';
let Roles = require(relativeToServer + '/users/roles/model');
let tu = require('./../../testutils');
let expect = require('chai').expect;
describe('Roles Model', () => {
    let rolesToClear = [];
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    describe('Roles.create', () => {
        it('should create a new document', (done) => {
            let error = null;
            Roles.create('newRole', 'silver lining', [{
                action: 'view',
                object: 'self'
            }, {
                action: 'update',
                object: 'nooneelse'
            }])
                .then((r) => {
                    expect(r).to.exist;
                    expect(r).to.be.an.instanceof(Roles);
                })
                .catch((err) => {
                    expect(err).to.not.exist;
                    error = err;
                })
                .done(() => {
                    rolesToClear.push('newRole');
                    tu.testComplete(done, error);
                });
        });
        it('should not allow two objects with the same name', (done) => {
            let error = null;
            Roles.ensureIndexes()
                .then(() => Roles.create('newRole', 'silver lining', [{
                    action: 'view',
                    object: 'self'
                }, {
                    action: 'update',
                    object: 'nooneelse'
                }]))
                .then((r) => {
                    error = r;
                    expect(r).to.not.exist;
                })
                .catch((err) => {
                    expect(err).to.exist;
                })
                .done(() => {
                    tu.testComplete(done, error);
                });
        });
    });
    describe('Roles.this.hasPermissionsTo', () => {
        let role = null;
        before((done) => {
            Roles.create('hasPermissions', 'silver lining', [{
                action: 'view',
                object: 'test'
            }, {
                action: 'update',
                object: 'test2'
            }])
                .then((r) => {
                    role = r;
                    done();
                })
                .catch((err) => {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should return true if you match a specific action, object combination', (done) => {
            try {
                expect(role.hasPermissionsTo('view', 'test')).to.be.true;
                done();
            } catch (err) {
                if (err) {
                    done(err);
                }
            }
        });
        it('should return true if you ask for view when you have update permissions set on the role for the givn object', (done) => {
            try {
                expect(role.hasPermissionsTo('view', 'test2')).to.be.true;
                done();
            } catch (err) {
                if (err) {
                    done(err);
                }
            }
        });
        it('should return false if you dont match any permissions for the role', (done) => {
            try {
                expect(role.hasPermissionsTo('view', 'test3')).to.be.false;
                expect(role.hasPermissionsTo('update', 'test3')).to.be.false;
                done();
            } catch (err) {
                if (err) {
                    done(err);
                }
            }
        });
        it('should return true if you have permissions permissions on *', (done) => {
            Roles.find({name: 'root', organisation: 'silver lining'})
                .then((root) => {
                    expect(root[0].hasPermissionsTo('view', 'test3')).to.be.true;
                    expect(root[0].hasPermissionsTo('update', 'test3')).to.be.true;
                    expect(root[0].hasPermissionsTo('update', '*')).to.be.true;
                    done();
                })
                .catch((err) => {
                    if (err) {
                        done(err);
                    }
                });
        });
        after((done) => {
            rolesToClear.push('hasPermissions');
            done();
        });
    });
    after((done) => {
        tu.cleanupRoles(rolesToClear)
            .then(() => {
                tu.cleanup({}, done);
            })
            .done();
    });
})
;
