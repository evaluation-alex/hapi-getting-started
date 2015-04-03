'use strict';
let relativeToServer = './../../../../server/';
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
let _ = require('lodash');
//let expect = require('chai').expect;
let tu = require('./../../testutils');
let Code = require('code');   // assertion library
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Profile Model', function () {
    let usersToClear = [];
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
