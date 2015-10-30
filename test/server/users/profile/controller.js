'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let Users = require('./../../../../build/users/model');
let Audit = require('./../../../../build/audit/model');
let tu = require('./../../testutils');
let expect = require('chai').expect;
describe('Profile', () => {
    let server = null;
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                done();
            })
            .catch((err) => {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    describe('PUT /profile/{id}', () => {
        let authheader = '';
        let id = '';
        before((done) => {
            tu.findAndLogin('root')
                .then((u) => {
                    authheader = u.authheader;
                    done();
                });
        });
        it('should return unauthorised if someone other than root or the user tries to modify user attributes', (done) => {
            let oneauthheader = '';
            tu.findAndLogin('one@first.com')
                .then((u) => {
                    oneauthheader = u.authheader;
                    return Users.findOne({email: 'root'});
                })
                .then((u) => {
                    id = u._id.toString();
                    return id;
                })
                .then((id) => {
                    let request = {
                        method: 'PUT',
                        url: '/profile/' + id,
                        headers: {
                            Authorization: oneauthheader
                        },
                        payload: {
                            profile: {
                                preferredName: 'mr. me'
                            }
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    done();
                    return null;
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should return not found if the profile is not found', (done) => {
            let request = {
                method: 'PUT',
                url: '/profile/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: authheader
                },
                payload: {
                    profile: {
                        preferredName: 'mr. me'
                    }
                }
            };
            server.injectThen(request).then((response) => {
                expect(response.statusCode).to.equal(404);
                done();
            }).catch((err) => {
                done(err);
            });
        });
        it('should modify profile and audit changes', (done) => {
            Users.findOne({email: 'root'})
                .then((p) => {
                    id = p._id.toString();
                    let request = {
                        method: 'PUT',
                        url: '/profile/' + id,
                        headers: {
                            Authorization: authheader
                        },
                        payload: {
                            profile: {
                                preferredName: 'mr. me'
                            }
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Users.findOne({email: 'root'});
                })
                .then((p1) => {
                    expect(p1.profile.preferredName).to.equal('mr. me');
                    return Audit.findAudit('users', 'root', {'change.action': 'profile.preferredName'});
                })
                .then((audit) => {
                    expect(audit).to.exist;
                    expect(audit.length).to.equal(1);
                    done();
                    return null;
                })
                .catch((err) => {
                    done(err);
                });
        });
    });
    after((done) => {
        done();
    });
});

