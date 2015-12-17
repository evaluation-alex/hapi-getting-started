'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let _ = require('lodash');
let Users = require('./../../../../build/users/model');
let Audit = require('./../../../../build/audit/model');
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
            .catch(done);
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
                    return id;
                })
                .then((id) => {
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
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    done();
                })
                .catch(done);
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
            }).
                catch(done);
        });
        it('should modify preferences and audit changes', (done) => {
            let original;
            Users.findOne({email: 'root'})
                .then((p) => {
                    original = p;
                    p.preferences.notifications.blogs.blocked.push({id: 'something'});
                    p.preferences.notifications.posts.blocked.push({id: 'none of them'});
                    id = p._id.toString();
                    p.__isModified = true;
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
                                        addedBlocked: [{id: 'something'}]
                                    },
                                    userGroups: {
                                        email: {
                                            frequency: 'weekly'
                                        },
                                        addedBlocked: [{id: 'all of them'}]
                                    },
                                    posts: {
                                        inapp: {
                                            frequency: 'daily'
                                        },
                                        removedBlocked: [{id: 'none of them'}]
                                    }
                                }
                            }
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Users.findOne({email: 'root'});
                })
                .then((p) => {
                    expect(p.preferences.locale).to.equal('hi');
                    expect(p.preferences.notifications.blogs.email.frequency).to.equal('daily');
                    expect(p.preferences.notifications.userGroups.email.frequency).to.equal('weekly');
                    expect(p.preferences.notifications.posts.inapp.frequency).to.equal('daily');
                    expect(p.preferences.notifications.blogs.blocked[0]).to.deep.equal({id: 'something'});
                    expect(p.preferences.notifications.userGroups.blocked[0]).to.deep.equal({id: 'all of them'});
                    expect(p.preferences.notifications.posts.blocked.length).to.equal(0);
                    return Audit.findAudit('users', 'root', {'change.action': 'preferences.locale'});
                })
                .then((audit) => {
                    expect(audit).to.exist;
                    expect(audit.length).to.equal(1);
                    original.preferences.notifications.blogs.blocked.pop();
                    original.preferences.notifications.posts.blocked.pop();
                    original.__isModified = true;
                    return original.save();
                })
                .then(() => {
                    done();
                })
                .catch(done);
        });
    });
    after((done) => {
        done();
    });
});

