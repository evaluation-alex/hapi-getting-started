'use strict';
var relativeToServer = './../../../../server/';
var Users = require(relativeToServer + 'users/model');
var Audit = require(relativeToServer + 'audit/model');
var _ = require('lodash');
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

describe('Profile Model', function () {
    var usersToClear = [];
    before(function (done) {
        tu.setupRolesAndUsers()
            .then(function () {
                done();
            });
    });

    after(function (done) {
        tu.cleanup({users: usersToClear}, done);
    });

});
