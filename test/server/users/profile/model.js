'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let tu = require('./../../testutils');
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
