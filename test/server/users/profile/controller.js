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
describe('Profile', () => {
    let rootAuthHeader = null;
    let server = null;
    before((done) =>  {
        tu.setupServer()
            .then((res) =>  {
                server = res.server;
                rootAuthHeader = res.authheader;
                done();
            })
            .catch((err) =>  {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    describe('PUT /profile/{id}', () => {
        let authheader = '';
        let id = '';
        before((done) =>  {
            tu.findAndLogin('root')
                .then((u) =>  {
                    authheader = u.authheader;
                    done();
                });
        });
        it('should return unauthorised if someone other than root or the user tries to modify user attributes', (done) =>  {
            let oneauthheader = '';
            tu.findAndLogin('one@first.com')
                .then((u) =>  {
                    oneauthheader = u.authheader;
                    return Users.findOne({email: 'root'});
                })
                .then((u) =>  {
                    id = u._id.toString();
                })
                .then(() =>  {
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
                    server.inject(request, (response) =>  {
                        try {
                            expect(response.statusCode).to.equal(401);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
        it('should return not found if the profile is not found', (done) =>  {
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
            server.inject(request, (response) =>  {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should modify profile and audit changes', (done) =>  {
            Users.findOne({email: 'root'})
                .then((p) =>  {
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
                    server.inject(request, (response) =>  {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Users.findOne({email: 'root'})
                                .then((p) =>  {
                                    expect(p.profile.preferredName).to.equal('mr. me');
                                    return Audit.findAudit('users', 'root', {'change.action': 'profile.preferredName'});
                                })
                                .then((audit) =>  {
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
    after((done) =>  {
        done();
    });
});

