'use strict';
let relativeToServer = './../../../server/';
let Users = require(relativeToServer + 'users/model');
let Code = require('code');
let Lab = require('lab');
let tu = require('./../testutils');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Audit', () => {
    let authheader = '';
    let server = null;
    let emails = [];
    before({timeout: 60000000}, (done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                authheader = res.authheader;
                done();
            })
            .catch((err) => {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    describe('GET /audit', () => {
        describe('users', () => {
            before((done) => {
                Users.create('test.users@test.api', 'silver lining', 'password123', 'en')
                    .then((newUser) => {
                        return newUser.loginSuccess('test', 'test').save();
                    })
                    .then(() => {
                        return Users.create('test.users2@test.api', 'silver lining', 'password123', 'en');
                    })
                    .then((newUser2) => {
                        return newUser2.loginSuccess('test', 'test').save();
                    }).then((newUser2) => {
                        newUser2.deactivate('test').save();
                        emails.push('test.users2@test.api');
                        emails.push('test.users@test.api');
                        done();
                    })
                    .catch((err) => {
                        emails.push('test.users2@test.api');
                        emails.push('test.users@test.api');
                        done(err);
                    })
                    .done();
            });
            it('should give audit of only the user whose email is sent in the parameter', (done) => {
                let request = {
                    method: 'GET',
                    url: '/audit?objectChangedId=test.users2@test.api&objectType=users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, (response) => {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        expect(response.payload).to.contain('test.users2@test.api');
                        expect(response.payload).to.not.contain('test.users@test.api');
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
            it('should give audit of all changes done by user', (done) => {
                let request = {
                    method: 'GET',
                    url: '/audit?by=test&objectType=users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, (response) => {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        expect(response.payload).to.contain('test');
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
            it('should give audit of all changes', (done) => {
                let request = {
                    method: 'GET',
                    url: '/audit',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, (response) => {
                    try {
                        expect(response.statusCode).to.equal(200);
                        expect(response.payload).to.exist();
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
        });
    });
    after((done) => {
        return tu.cleanup({users: emails}, done);
    });
});

