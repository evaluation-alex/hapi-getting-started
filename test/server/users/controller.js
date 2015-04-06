'use strict';
let relativeToServer = './../../../server/';
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
let Mailer = require(relativeToServer + 'common/plugins/mailer');
var Promise = require('bluebird');
let tu = require('./../testutils');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Users', () => {
    let server = null;
    let emails = [];
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
            })
            .then(() => {
                emails.push('test.users@test.api');
                return Users.create('test.users@test.api', 'silver lining', 'password123', 'en');
            })
            .then((newUser) => {
                newUser.loginSuccess('test', 'test').save();
                done();
            })
            .catch((err) => {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    it('should send back a not authorized when user is not logged in', (done) => {
        let authheader = '';
        tu.findAndLogin('test.users@test.api')
            .then((u) => {
                authheader = u.authheader;
                return u.user.logout('test', 'test').save();
            })
            .then(() => {
                let request = {
                    method: 'GET',
                    url: '/users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, (response) => {
                    try {
                        expect(response.statusCode).to.equal(401);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
    });
    it('should send back a not authorized when user does not have permissions to view', (done) => {
        let authheader = '';
        tu.findAndLogin('test.users@test.api', [])
            .then((u) => {
                authheader = u.authheader;
                let request = {
                    method: 'GET',
                    url: '/users',
                    headers: {
                        Authorization: authheader
                    }
                };
                server.inject(request, (response) => {
                    try {
                        expect(response.statusCode).to.equal(403);
                        done();
                    } catch (err) {
                        done(err);
                    }
                });
            });
    });
    it('should send back users when requestor has permissions and is authenticated, Users:GET /users', (done) => {
        let authheader = '';
        tu.findAndLogin('one@first.com')
            .then((u) => {
                authheader = u.authheader;
                let request = {
                    method: 'GET',
                    url: '/users',
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
    describe('GET /users', () => {
        let authheader = '';
        before((done) => {
            tu.findAndLogin('one@first.com')
                .then((u) => {
                    authheader = u.authheader;
                    return Users.create('test.users2@test.api', 'silver lining', 'password123', 'en');
                })
                .then((newUser) => {
                    return newUser.loginSuccess('test', 'test').save();
                })
                .then((newUser) => {
                    newUser.deactivate('test').save();
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give active users when isactive = true is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/users?isActive="true"',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist();
                    expect(response.payload).to.not.contain('test.users2@test.api');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give inactive users when isactive = false is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/users?isActive="false"',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist();
                    expect(response.payload).to.contain('test.users2@test.api');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give only the user whose email is sent in the parameter', (done) => {
            let request = {
                method: 'GET',
                url: '/users?email=one@first.com',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist();
                    expect(response.payload).to.not.contain('test.users2@test.api');
                    expect(response.payload).to.contain('one@first.com');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should return both inactive and active users when nothing is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/users',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist();
                    expect(response.payload).to.contain('test.users2@test.api');
                    expect(response.payload).to.contain('one@first.com');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        after((done) => {
            emails.push('test.users2@test.api');
            done();
        });
    });
    describe('GET /users/{id}', () => {
        let authheader = '';
        let id = '';
        before((done) => {
            tu.findAndLogin('one@first.com')
                .then((u) => {
                    authheader = u.authheader;
                    id = u.user._id.toString();
                    done();
                })
                .catch((err) => {
                    if (err) {
                        done(err);
                    }
                });
        });
        it('should only send back user with the id in params', (done) => {
            let request = {
                method: 'GET',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist();
                    expect(response.payload).to.contain('one@first.com');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back not found when the user with the id in params is not found', (done) => {
            let request = {
                method: 'GET',
                url: '/users/abcdefabcdefabcdefabcdef',
                headers: {
                    Authorization: authheader
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back unauthorized if the id in the url and authenticated user are different', (done) => {
            Users.findOne({email: 'root'})
                .then((u) => {
                    let request = {
                        method: 'GET',
                        url: '/users/' + u._id.toString(),
                        headers: {
                            Authorization: authheader
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(401);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
    });
    describe('PUT /users/{id}', () => {
        let authheader = '';
        let id = '';
        before((done) => {
            tu.findAndLogin('root')
                .then((u) => {
                    authheader = u.authheader;
                    emails.push('test.users3@test.api');
                    return Users.create('test.users3@test.api', 'silver lining', 'password123', 'en');
                })
                .then((newUser) => {
                    newUser.loginSuccess('test', 'test').save();
                    id = newUser._id.toString();
                    done();
                });
        });
        it('should update is active, session should be deactivated and changes audited', (done) => {
            let request = {
                method: 'PUT',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                },
                payload: {
                    isActive: false
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    Users.findOne({_id: Users.ObjectID(id)})
                        .then((foundUser) => {
                            expect(foundUser.isActive).to.be.false();
                            expect(foundUser.session.length).to.equal(0);
                            return Audit.findAudit('users', foundUser.email, {'change.audit': 'isActive'});
                        })
                        .then((foundAudit) => {
                            expect(foundAudit).to.exist();
                            done();
                        })
                        .done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should update roles, session should be deactivated and changes audited', (done) => {
            let request = {
                method: 'PUT',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                },
                payload: {
                    roles: ['readonly', 'limitedupd']
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    Users.findOne({_id: Users.ObjectID(id)})
                        .then((foundUser) => {
                            expect(foundUser.roles).to.include(['readonly', 'limitedupd']);
                            expect(foundUser.session.length).to.equal(0);
                            return Audit.findAudit('users', foundUser.email, {'change.audit': 'update roles'});
                        })
                        .then((foundAudit) => {
                            expect(foundAudit).to.exist();
                            done();
                        })
                        .done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should update password, session should be deactivated and changes audited', (done) => {
            let request = {
                method: 'PUT',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                },
                payload: {
                    password: 'newpassword'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    Users.findOne({_id: Users.ObjectID(id)})
                        .then((foundUser) => {
                            expect(foundUser.session.length).to.equal(0);
                            return Audit.findAudit('users', foundUser.email, {'change.audit': 'reset password'});
                        })
                        .then((foundAudit) => {
                            expect(foundAudit).to.exist();
                            done();
                        })
                        .done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should update roles, password and is active, session should be deactivated and all changes audited', (done) => {
            let request = {
                method: 'PUT',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                },
                payload: {
                    isActive: true,
                    roles: ['readonly'],
                    password: 'newpassword'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    Users.findOne({_id: Users.ObjectID(id)})
                        .then((foundUser) => {
                            expect(foundUser.session.length).to.equal(0);
                            expect(foundUser.roles).to.include(['readonly']);
                            expect(foundUser.isActive).to.be.true();
                            done();
                        })
                        .done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should return unauthorised if someone other than root or the user tries to modify user attributes', (done) => {
            tu.findAndLogin('one@first.com')
                .then((u) => {
                    authheader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/users/' + id,
                        headers: {
                            Authorization: authheader
                        },
                        payload: {
                            isActive: true,
                            roles: ['readonly'],
                            password: 'newpassword'
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(401);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
        it('should return not found if the user is not found', (done) => {
            let request = {
                method: 'PUT',
                url: '/users/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: authheader
                },
                payload: {
                    isActive: true,
                    roles: ['readonly'],
                    password: 'newpassword'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
    });
    describe('POST /signup', () => {
        it('returns a conflict when you try to signup with user that already exists', (done) => {
            let request = {
                method: 'POST',
                url: '/signup',
                payload: {
                    email: 'one@first.com',
                    organisation: 'silver lining',
                    password: 'try becoming the first'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(409);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('creates a user succesfully if all validations are complete. The user has a valid session, user email is sent, and user audit shows signup, loginSuccess records and default preferences are setup', (done) => {
            let request = {
                method: 'POST',
                url: '/signup',
                payload: {
                    email: 'test.signup2@signup.api',
                    organisation: 'silver lining',
                    password: 'an0th3r1'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(201);
                    Users.findOne({email: 'test.signup2@signup.api'})
                        .then((foundUser) => {
                            expect(foundUser).to.exist();
                            expect(foundUser.session).to.exist();
                            expect(foundUser.session.length).to.equal(1);
                            return Audit.findAudit('users', 'test.signup2@signup.api', {'change.audit': 'signup'});
                        })
                        .then((foundSignup) => {
                            expect(foundSignup).to.exist();
                            return Audit.findAudit('users', 'test.signup2@signup.api', {'change.audit': 'login success'});
                        })
                        .then((foundLogin) => {
                            expect(foundLogin).to.exist();
                            emails.push(request.payload.email);
                            done();
                        });
                } catch (err) {
                    emails.push(request.payload.email);
                    done(err);
                }
            });
        });
    });
    describe('POST /login/forgot', () => {
        it('returns an error when user does not exist', (done) => {
            let request = {
                method: 'POST',
                url: '/login/forgot',
                payload: {
                    email: 'test.unknown@test.api'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain('Success');
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('successfully sends a reset password request', (done) => {
            let request = {
                method: 'POST',
                url: '/login/forgot',
                payload: {
                    email: 'test.users@test.api'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain('Success');
                    Audit.findAudit('users', 'test.users@test.api', {'change.audit': 'reset password sent'})
                        .then((foundAudit) => {
                            expect(foundAudit).to.exist();
                            return Users.findOne({email: 'test.users@test.api'});
                        })
                        .then((foundUser) => {
                            expect(foundUser.resetPwd).to.exist();
                            done();
                        });
                } catch (err) {
                    done(err);
                }
            });
        });
        it('gracefully handles errors and sends back boom message', (done) => {
            let prev = Mailer.sendEmail;
            Mailer.sendEmail = () => {
                return Promise.reject(new Error('test'));
            };
            let request = {
                method: 'POST',
                url: '/login/forgot',
                payload: {
                    email: 'test.users@test.api'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(500);
                    Mailer.sendEmail = prev;
                    done();
                } catch (err) {
                    Mailer.sendEmail = prev;
                    done(err);
                }
            });
        });
    });
    describe('POST /login/reset', () => {
        it('returns an error when user does not exist', (done) => {
            let request = {
                method: 'POST',
                url: '/login/reset',
                payload: {
                    key: 'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
                    email: 'test.unkown@test.api',
                    password: 'random'
                }
            };
            server.inject(request, (response) => {
                try {
                    expect(response.statusCode).to.equal(400);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('returns a bad request if the key does not match', (done) => {
            Users.findOne({email: 'test.users@test.api'})
                .then((foundUser) => {
                    return foundUser.resetPasswordSent('test').save();
                })
                .then(() => {
                    let request = {
                        method: 'POST',
                        url: '/login/reset',
                        payload: {
                            key: 'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
                            email: 'test.users@test.api',
                            password: 'password1234'
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(400);
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
        it('successfully sets a password, invalidates session and logs user out', (done) => {
            let key = '';
            Users.findOne({email: 'test.users@test.api'})
                .then((foundUser) => {
                    return foundUser.resetPasswordSent('test').save();
                })
                .then((foundUser) => {
                    key = foundUser.resetPwd.token;
                })
                .then(() => {
                    let request = {
                        method: 'POST',
                        url: '/login/reset',
                        payload: {
                            key: key,
                            email: 'test.users@test.api',
                            password: 'password1234'
                        }
                    };
                    server.inject(request, (response) => {
                        try {
                            expect(response.statusCode).to.equal(200);
                            expect(response.payload).to.contain('Success');
                            Audit.findAudit('users', 'test.users@test.api', {'change.audit': 'reset password'})
                                .then((foundAudit) => {
                                    expect(foundAudit).to.exist();
                                    return Users.findOne({email: 'test.users@test.api'});
                                })
                                .then((foundUser) => {
                                    expect(foundUser.resetPwd).to.not.exist();
                                    done();
                                });
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

