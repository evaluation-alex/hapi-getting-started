'use strict';
let relativeToServer = './../../../../server/';
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
let tu = require('./../../testutils');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Profile', function () {
    let rootAuthHeader = null;
    let server = null;
    before(function (done) {
        tu.setupServer()
            .then(function (res) {
                server = res.server;
                rootAuthHeader = res.authheader;
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    describe('PUT /profile/{id}', function () {
        let authheader = '';
        let id = '';
        before(function (done) {
            tu.findAndLogin('root')
                .then(function (u) {
                    authheader = u.authheader;
                    done();
                });
        });
        it('should return unauthorised if someone other than root or the user tries to modify user attributes', function (done) {
            let oneauthheader = '';
            tu.findAndLogin('one@first.com')
                .then(function (u) {
                    oneauthheader = u.authheader;
                    return Users.findOne({email: 'root'});
                })
                .then(function (u) {
                    id = u._id.toString();
                })
                .then(function () {
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
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(401);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
        it('should return not found if the profile is not found', function (done) {
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
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should modify profile and audit changes', function (done) {
            Users.findOne({email: 'root'})
                .then(function (p) {
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
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Users.findOne({email: 'root'})
                                .then(function (p) {
                                    expect(p.profile.preferredName).to.equal('mr. me');
                                    return Audit.findAudit('users', 'root', {'change.action': 'profile.preferredName'});
                                })
                                .then(function (audit) {
                                    expect(audit).to.exist();
                                    expect(audit.length).to.equal(1);
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
    });
    after(function (done) {
        done();
    });
});

