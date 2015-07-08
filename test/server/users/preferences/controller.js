'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let relativeToServer = './../../../../server/';
let Users = require(relativeToServer + 'users/model');
let Audit = require(relativeToServer + 'audit/model');
let tu = require('./../../testutils');
let expect = require('chai').expect;
describe('Preferences', () => {
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
    describe('PUT /preferences/{id}', () => {
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
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/preferences/' + id,
                        headers: {
                            Authorization: oneauthheader
                        },
                        payload: {
                            preferences: {
                                locale: 'hi'
                            }
                        }
                    };
                    server.injectThen(request).then((response) => {
                        expect(response.statusCode).to.equal(401);
                        done();
                    }).catch((err) => {
                        done(err);
                    });
                });
        });
        it('should return not found if the preferences are not found', (done) => {
            let request = {
                method: 'PUT',
                url: '/preferences/54d4430eed61ad701cc7a721',
                headers: {
                    Authorization: authheader
                },
                payload: {
                    preferences: {
                        locale: 'hi'
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
        it('should modify preferences and audit changes', (done) => {
            Users.findOne({email: 'root'})
                .then((p) => {
                    p.preferences.notifications.blogs.blocked.push('something');
                    p.preferences.notifications.posts.blocked.push('none of them');
                    id = p._id.toString();
                    return p.save();
                })
                .then(() => {
                    let request = {
                        method: 'PUT',
                        url: '/preferences/' + id,
                        headers: {
                            Authorization: authheader
                        },
                        payload: {
                            preferences: {
                                locale: 'hi',
                                notifications: {
                                    blogs: {
                                        email: {
                                            frequency: 'daily'
                                        },
                                        addedBlocked: ['something']
                                    },
                                    userGroups: {
                                        email: {
                                            frequency: 'weekly'
                                        },
                                        addedBlocked: ['all of them']
                                    },
                                    posts: {
                                        inapp: {
                                            frequency: 'daily'
                                        },
                                        removedBlocked: ['none of them']
                                    }
                                }
                            }
                        }
                    };
                    server.injectThen(request).then((response) => {
                        expect(response.statusCode).to.equal(200);
                        Users.findOne({email: 'root'})
                            .then((p) => {
                                expect(p.preferences.locale).to.equal('hi');
                                expect(p.preferences.notifications.blogs.email.frequency).to.equal('daily');
                                expect(p.preferences.notifications.userGroups.email.frequency).to.equal('weekly');
                                expect(p.preferences.notifications.posts.inapp.frequency).to.equal('daily');
                                expect(p.preferences.notifications.blogs.blocked[0]).to.equal('something');
                                expect(p.preferences.notifications.userGroups.blocked[0]).to.equal('all of them');
                                expect(p.preferences.notifications.posts.blocked.length).to.equal(0);
                                return Audit.findAudit('users', 'root', {'change.action': 'preferences.locale'});
                            })
                            .then((audit) => {
                                expect(audit).to.exist;
                                expect(audit.length).to.equal(1);
                                done();
                            });
                    }).catch((err) => {
                        done(err);
                    });
                });
        });
    });
    after((done) => {
        done();
    });
});

