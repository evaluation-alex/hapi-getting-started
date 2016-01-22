'use strict';
let Users = require('./../../../build/users/model');
let Blogs = require('./../../../build/blogs/model');
let Audit = require('./../../../build/audit/model');
let Mailer = require('./../../../build/common/plugins/mailer');
let Bluebird = require('bluebird');
let Fs = require('fs');
let tu = require('./../testutils');
let expect = require('chai').expect;
describe('Users', () => {
    let server = null;
    let emails = [];
    let blogs = [];
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
                return newUser.loginSuccess('127.0.0.1', 'test').save();
            }).
            then(() => {
                done();
            })
            .catch(done);
    });
    it('should send back a not authorized when user is not logged in', (done) => {
        let authheader = '';
        tu.findAndLogin('test.users@test.api')
            .then((u) => {
                authheader = u.authheader;
                return u.user.logout('127.0.0.1', 'test').save();
            })
            .then(() => {
                let request = {
                    method: 'GET',
                    url: '/users',
                    headers: {
                        Authorization: authheader
                    }
                };
                return server.injectThen(request);
            })
            .then((response) => {
                expect(response.statusCode).to.equal(401);
                done();
            })
            .catch(done);
    });
    it('should send back a not authorized when user does not have permissions to view', (done) => {
        tu.findAndLogin('test.users@test.api', [])
            .then((u) => {
                let authheader = u.authheader;
                let request = {
                    method: 'GET',
                    url: '/users',
                    headers: {
                        Authorization: authheader
                    }
                };
                return server.injectThen(request);
            })
            .then((response) => {
                expect(response.statusCode).to.equal(403);
                done();
            })
            .catch(done);
    });
    it('should send back users when requestor has permissions and is authenticated, Users:GET /users', (done) => {
        tu.findAndLogin('one@first.com')
            .then((u) => {
                let authheader = u.authheader;
                let request = {
                    method: 'GET',
                    url: '/users',
                    headers: {
                        Authorization: authheader
                    }
                };
                return server.injectThen(request);
            })
            .then((response) => {
                expect(response.statusCode).to.equal(200);
                expect(response.payload).to.exist;
                done();
            })
            .catch(done);
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
                    return newUser.loginSuccess('127.0.0.1', 'test').save();
                })
                .then((newUser) => {
                    return newUser.deactivate('test').save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
        it('should give active users when isactive = true is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/users?isActive="true"',
                headers: {
                    Authorization: authheader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.not.contain('test.users2@test.api');
                    done();
                })
                .catch(done);
        });
        it('should give inactive users when isactive = false is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/users?isActive="false"',
                headers: {
                    Authorization: authheader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.contain('test.users2@test.api');
                    done();
                })
                .catch(done);
        });
        it('should give only the user whose email is sent in the parameter', (done) => {
            let request = {
                method: 'GET',
                url: '/users?email=one@first.com',
                headers: {
                    Authorization: authheader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.not.contain('test.users2@test.api');
                    expect(response.payload).to.contain('one@first.com');
                    done();
                })
                .catch(done);
        });
        it('should return both inactive and active users when nothing is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/users',
                headers: {
                    Authorization: authheader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.contain('test.users2@test.api');
                    expect(response.payload).to.contain('one@first.com');
                    done();
                })
                .catch(done);
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
                .catch(done);
        });
        it('should only send back user with the id in params', (done) => {
            let request = {
                method: 'GET',
                url: '/users/' + id,
                headers: {
                    Authorization: authheader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.exist;
                    expect(response.payload).to.contain('one@first.com');
                    done();
                })
                .catch(done);
        });
        it('should send back not found when the user with the id in params is not found', (done) => {
            let request = {
                method: 'GET',
                url: '/users/abcdefabcdefabcdefabcdef',
                headers: {
                    Authorization: authheader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    done();
                })
                .catch(done);
        });
        it('should send back forbidden if the id in the url and authenticated user are different', (done) => {
            Users.findOne({email: 'root'})
                .then((u) => {
                    let request = {
                        method: 'GET',
                        url: '/users/' + u._id.toString(),
                        headers: {
                            Authorization: authheader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(403);
                    done();
                })
                .catch(done);
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
                    id = newUser._id.toString();
                    return newUser.loginSuccess('127.0.0.1', 'test').save();
                })
                .then(() => {
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
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Users.findOne({_id: Users.ObjectID(id)});
                })
                .then((foundUser) => {
                    expect(foundUser.isActive).to.be.false;
                    expect(foundUser.session.length).to.equal(0);
                    return Audit.findAudit('users', foundUser.email, {'change.audit': 'isActive'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    done();
                })
                .catch(done);
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
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Users.findOne({_id: Users.ObjectID(id)});
                })
                .then((foundUser) => {
                    expect(foundUser.roles).to.include('readonly');
                    expect(foundUser.roles).to.include('limitedupd');
                    expect(foundUser.session.length).to.equal(0);
                    return Audit.findAudit('users', foundUser.email, {'change.audit': 'update roles'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    done();
                })
                .catch(done);
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
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Users.findOne({_id: Users.ObjectID(id)});
                })
                .then((foundUser) => {
                    expect(foundUser.session.length).to.equal(0);
                    return Audit.findAudit('users', foundUser.email, {'change.audit': 'reset password'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    done();
                })
                .catch(done);
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
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Users.findOne({_id: Users.ObjectID(id)});
                })
                .then((foundUser) => {
                    expect(foundUser.session.length).to.equal(0);
                    expect(foundUser.roles).to.include('readonly');
                    expect(foundUser.isActive).to.be.true;
                    done();
                })
                .catch(done);
        });
        it('should return forbidden if someone other than root or the user tries to modify user attributes', (done) => {
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
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(403);
                    done();
                })
                .catch(done);
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
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    done();
                })
                .catch(done);
        });
    });
    describe('POST /signup', () => {
        it('returns a conflict when you try to signup with user that already exists', (done) => {
            let request = {
                method: 'POST',
                url: '/users/signup',
                payload: {
                    email: 'one@first.com',
                    organisation: 'silver lining',
                    password: 'try becoming the first'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(409);
                    done();
                })
                .catch(done);
        });
        it('creates a user succesfully if all validations are complete. The user has a valid session, user email is sent, and user audit shows signup, loginSuccess records and default preferences are setup and default private blog is created', (done) => {
            let request = {
                method: 'POST',
                url: '/users/signup',
                payload: {
                    email: 'test.signup2@signup.api',
                    organisation: 'silver lining',
                    password: 'an0th3r1'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Users.findOne({email: 'test.signup2@signup.api'});
                })
                .then((foundUser) => {
                    expect(foundUser).to.exist;
                    expect(foundUser.session).to.exist;
                    expect(foundUser.session.length).to.equal(1);
                    return Audit.findAudit('users', 'test.signup2@signup.api', {'change.audit': 'signup'});
                })
                .then((foundSignup) => {
                    expect(foundSignup).to.exist;
                    return Audit.findAudit('users', 'test.signup2@signup.api', {'change.audit': 'login success'});
                })
                .then((foundLogin) => {
                    expect(foundLogin).to.exist;
                    emails.push(request.payload.email);
                    return Blogs.findOne({createdBy: request.payload.email});
                })
                .then((foundBlog) => {
                    expect(foundBlog).to.exist;
                    expect(foundBlog.createdBy).to.equal('test.signup2@signup.api');
                    blogs.push(foundBlog.title);
                    done();
                })
                .catch((err) => {
                    blogs.push('test.signup2@signup.api\'s private blog');
                    emails.push(request.payload.email);
                    done(err);
                });
        });
    });
    describe('PUT /users/forgot', () => {
        it('returns an error when user does not exist', (done) => {
            let request = {
                method: 'PUT',
                url: '/users/forgot',
                payload: {
                    email: 'test.unknown@test.api'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain('Success');
                    done();
                })
                .catch(done);
        });
        it('successfully sends a reset password request', (done) => {
            let request = {
                method: 'PUT',
                url: '/users/forgot',
                payload: {
                    email: 'test.users@test.api'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain('Success');
                    return Audit.findAudit('users', 'test.users@test.api', {'change.audit': 'reset password sent'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    return Users.findOne({email: 'test.users@test.api'});
                })
                .then((foundUser) => {
                    expect(foundUser.resetPwd).to.exist;
                    done();
                })
                .catch(done);
        });
        it('gracefully handles errors and sends back boom message', (done) => {
            let prev = Mailer.sendEmail;
            Mailer.sendEmail = () => {
                return Bluebird.reject(new Error('test'));
            };
            let request = {
                method: 'PUT',
                url: '/users/forgot',
                payload: {
                    email: 'test.users@test.api'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(500);
                    Mailer.sendEmail = prev;
                    done();
                })
                .catch((err) => {
                    Mailer.sendEmail = prev;
                    done(err);
                });
        });
    });
    describe('PUT /users/reset', () => {
        it('returns an error when user does not exist', (done) => {
            let request = {
                method: 'PUT',
                url: '/users/reset',
                payload: {
                    key: 'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
                    email: 'test.unkown@test.api',
                    password: 'random'
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(400);
                    done();
                })
                .catch(done);
        });
        it('returns a bad request if the key does not match', (done) => {
            Users.findOne({email: 'test.users@test.api'})
                .then((foundUser) => {
                    return foundUser.resetPasswordSent('test').save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/users/reset',
                        payload: {
                            key: 'abcdefgh-ijkl-mnop-qrst-uvwxyz123456',
                            email: 'test.users@test.api',
                            password: 'password1234'
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(400);
                    done();
                })
                .catch(done);
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
                        method: 'PUT',
                        url: '/users/reset',
                        payload: {
                            key: key,
                            email: 'test.users@test.api',
                            password: 'password1234'
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.contain('Success');
                    return Audit.findAudit('users', 'test.users@test.api', {'change.action': 'reset password'});
                })
                .then((foundAudit) => {
                    expect(foundAudit).to.exist;
                    return Users.findOne({email: 'test.users@test.api'});
                })
                .then((foundUser) => {
                    expect(foundUser.resetPwd).to.not.exist;
                    done();
                })
                .catch(done);
        });
    });
    after((done) => {
        return tu.cleanup({users: emails, blogs: blogs}, done);
    });
});
