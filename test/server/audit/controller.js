'use strict';
let tu = require('./../testutils');
let Users = require('./../../../build/server/users/model');
let expect = require('chai').expect;
describe('Audit', () => {
    let authheader = '';
    let server = null;
    let emails = [];
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                authheader = res.authheader;
                done();
            })
            .catch(done);
    });
    describe('POST /audit/search', () => {
        describe('users', () => {
            before((done) => {
                Users.create('test.users@test.api', 'password123', 'en')
                    .then((newUser) => {
                        return newUser.loginSuccess('test', 'test').save();
                    })
                    .then(() => {
                        return Users.create('test.users2@test.api', 'password123', 'en');
                    })
                    .then((newUser2) => {
                        return newUser2.loginSuccess('test', 'test').save();
                    })
                    .then((newUser2) => {
                        return newUser2.deactivate('test').save();
                    })
                    .then(() => {
                        emails.push('test.users2@test.api');
                        emails.push('test.users@test.api');
                        done();
                    })
                    .catch((err) => {
                        emails.push('test.users2@test.api');
                        emails.push('test.users@test.api');
                        done(err);
                    });
            });
            it('should give audit of only the user whose email is sent in the parameter', (done) => {
                let request = {
                    method: 'POST',
                    url: '/audit/search',
                    payload: {
                        objectChangedId: 'test.users2@test.api',
                        objectType: 'users'
                    },
                    headers: {
                        Authorization: authheader
                    }
                };
                server.injectThen(request).then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.contain('test.users2@test.api');
                    expect(response.payload).to.not.contain('test.users@test.api');
                    done();
                }).catch(done);
            });
            it('should give audit of all changes done by user', (done) => {
                let request = {
                    method: 'POST',
                    url: '/audit/search',
                    payload: {
                        by: 'test',
                        objectType: 'users'
                    },
                    headers: {
                        Authorization: authheader
                    }
                };
                server.injectThen(request).then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.contain('test');
                    done();
                }).catch(done);
            });
            it('should give audit of all changes', (done) => {
                let request = {
                    method: 'POST',
                    url: '/audit/search', payload: {},
                    headers: {
                        Authorization: authheader
                    }
                };
                server.injectThen(request).then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    done();
                }).catch(done);
            });
            it('should give nothing if no search criterion satisfied', (done) => {
                let request = {
                    method: 'POST',
                    url: '/audit/search',
                    payload: {
                        by: 'xxxxx'
                    },
                    headers: {
                        Authorization: authheader
                    }
                };
                server.injectThen(request).then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    done();
                }).catch(done);
            });
        });
    });
    after((done) => {
        return tu.cleanup({users: emails}, done);
    });
});

