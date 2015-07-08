'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let relativeToServer = './../../../../server/';
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
let _ = require('lodash');
let tu = require('./../../testutils');
let expect = require('chai').expect;
describe('Profile Model', () => {
    let usersToClear = [];
    before((done) => {
        tu.setupRolesAndUsers()
            .then(() => {
                done();
            });
    });
    after((done) => {
        tu.cleanup({users: usersToClear}, done);
    });
});
