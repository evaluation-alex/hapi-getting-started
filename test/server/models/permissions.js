'use strict';
var Config = require('./../../../config').config({argv: []});
var Permissions = require('./../../../server/models/permissions');
//var expect = require('chai').expect;
var Promise = require('bluebird');
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

describe('Permissions Model', function () {
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
        Permissions.connect(Config.hapiMongoModels.mongodb, function (err, db) {
            if (err || !db) {
                throw err;
            }
            done();
        });
    });

    describe('Permissions.create', function () {
        it('should create a new document when it succeeds', function(done) {
            done();
        });
        it('should create a new Permissions audit entry when it succeeds', function (done) {
            done();
        });
        it('should not allow two objects with the same action, object set on it', function (done) {
            done();
        });
    });

    describe('Permissions.findByDescription', function () {
        it('should return a permissions array with permissions that matches the description', function (done) {
            done();
        });
        it('should return an empty array when nothing matches', function (done) {
            done();
        });
        it('should only return permissions that are currently active', function (done) {
            done();
        });
    });

    describe('Permissions.findAllPermissionsForUser', function() {
        it('should return permissions array with permissions that directly have the user', function (done) {
            done();
        });
        it('should return permissions array with permissions with users groups the user is part of', function (done) {
            done();
        });
        it('should return permissions only where the user is active or is active in the group he is part of', function (done) {
            done();
        });
        it('should return an empty array when user has no permissions', function (done) {
            done();
        });
    });

    describe('Permissions.isPermitted', function() {
        it('should return true when the user is root irrespective of object / action', function (done) {
            done();
        });
        it('should return true when user has permissions directly granted', function (done) {
            done();
        });
        it('should return true when user has permissions because of a user group membership', function (done) {
            done();
        });
        it('should return false array when user has no permissions', function (done) {
            done();
        });
    });

    describe('Permissions.this.addUsers', function (){
        it('should add a new entry to users when user/group is newly added', function (done) {
            done();
        });
        it('should do nothing if the user/group is already active in the group', function (done) {
            done();
        });
        it('should mark the user/group as active again when it was deactivated and added again', function (done) {
            done();
        });
    });

    describe('Permissions.this.removeUsers', function() {
        it('should do nothing if the user/group is already inactive in the group', function (done) {
            done();
        });
        it('should do nothing if the user/group is not present in the group', function (done) {
            done();
        });
        it('should mark the user/group as inactive if it is active', function (done) {
            done();
        });
    });

    describe('Permissions.this.activate/deactivate', function() {
        it('should do nothing if the permission is already inactive/active and you deactivate/activate', function (done) {
            done();
        });
        it('should mark the group as inactive / active when you deactivate / activate', function (done) {
            done();
        });
    });

    describe('Permissions.this.updateDesc', function() {
        it('should do nothing if there is no change in the description', function (done) {
            done();
        });
        it('should update to the new description', function (done) {
            done();
        });
    });

    describe('Permissions.this.hasPermissions', function() {
        it('returns true when the user is present and active in the users array, action matches or is * and object matches or is *', function (done) {
            done();
        });
        it('returns false if user not present or active', function (done) {
            done();
        });
        it('returns false if action does not match', function (done) {
            done();
        });
        it('returns false if object does not match', function (done) {
            done();
        });
    });

    after(function (done) {
        Permissions.remove({}, function (err, result) {
            if (err) {
                throw err;
            }
            done();
        });
    });

});
