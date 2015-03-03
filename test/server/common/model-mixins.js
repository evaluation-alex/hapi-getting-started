'use strict';
var relativeToServer = './../../../server/';

var _ = require('lodash');
var Mixins = relativeToServer + 'common/model-mixins';
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var expect = Code.expect;

describe('Model mixins', function () {

    describe('CommonMixinAddRemove', function () {
        describe('add', function () {
            it('should do nothing if passed in an empty or undefined list of items to add', function (done) {
                done();
            });
            it('should do nothing if you try to add to a list not configured with the mixin', function (done) {
                done();
            });
            it('should do nothing if item already exists in that named list / role', function (done) {
                done();
            });
            it('should add the item if it doesnt exist and audit the addition', function (done) {
                done();
            });
        });
        describe('remove', function () {
            it('should do nothing if passed in an empty or undefined list of items to remove', function (done) {
                done();
            });
            it('should do nothing if you try to remove from a list not configured with the mixin', function (done) {
                done();
            });
            it('should do nothing if item does not exist in that named list / role', function (done) {
                done();
            });
            it('should remove the item if it exists and audit the deletions', function (done) {
                done();
            });
        });
    });

    describe('CommonMixinJoinApproveReject', function () {
        it ('should add directly to the appropriate list if public access is specified', function (done) {
            done();
        });
        it ('should add to the needs approval list if restricted access is specified', function (done) {
            done();
        });
        it ('should move from needs approval to the list when approved and removed from the needs approval list', function (done) {
            done();
        });
        it ('should remove from needs approval to the list when rejected', function (done) {
            done();
        });
    });

    describe('CommonMixinProperties', function () {
        it('should add a set property for every item sent in the parameters', function (done) {
            done();
        });
        it ('should modify and audit the value only if the parameter passed is not undefined and different in value from the current value', function (done) {
            done();
        });
        it ('should do nothing if the value passed is undefined', function (done) {
            done();
        });
        it ('should do nothing if the value passed is unchanged from that on the object', function (done) {
            done();
        });
    });

    describe('CommonMixinUpdate', function () {
        it ('should call set for properties being updated', function(done) {
            done();
        });
        it ('should call add / remove for lists being updated', function (done) {
            done();
        });
        it ('should ignore properties not defined for the mixin', function (done) {
            done();
        });
    });

    describe('CommonMixinIsActive', function () {
        it('should set isActive to false when you call deactivate', function (done) {
            done();
        });
        it('should do nothing when isActive is false and you call deactivate', function (done) {
            done();
        });
        it('should set isActive to true when you call reactivate', function (done) {
            done();
        });
        it('should do nothing when isActive is true and you call reactivate', function (done) {
            done();
        });
        it('should set isActive to false when you call del', function (done) {
            done();
        });
        it('should do nothing when isActive is false and you call del', function (done) {
            done();
        });
    });

    describe('CommonMixinSave', function () {
        it ('should save all the audit entries and then the object', function (done) {
            done();
        });
    });

    describe('CommonMixinAudit', function () {
        it ('should add an element to the audit list', function (done) {
            done();
        });
    });

});
