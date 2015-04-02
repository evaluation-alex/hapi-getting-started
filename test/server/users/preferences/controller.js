'use strict';
var relativeToServer = './../../../../server/';
var Users = require(relativeToServer + 'users/model');
var Audit = require(relativeToServer + 'audit/model');
//var expect = require('chai').expect;
var tu = require('./../../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var expect = Code.expect;
describe('Preferences', function () {
    var rootAuthHeader = null;
    var server = null;
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
    describe('PUT /preferences/{id}', function () {
        var authheader = '';
        var id = '';
        before(function (done) {
            Users.findOne({email: 'root'})
                .then(function (foundUser) {
                    return foundUser.loginSuccess('test', 'test').save();
                })
                .then(function (foundUser) {
                    authheader = tu.authorizationHeader(foundUser);
                    done();
                });
        });
        it('should return unauthorised if someone other than root or the user tries to modify user attributes', function (done) {
            var oneauthheader = '';
            Users.findOne({email: 'one@first.com'})
                .then(function (u) {
                    return u.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    oneauthheader = tu.authorizationHeader(u);
                    return Users.findOne({email: 'root'});
                })
                .then(function (u) {
                    id = u._id.toString();
                })
                .then(function () {
                    var request = {
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
        it('should return not found if the preferences are not found', function (done) {
            var request = {
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
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(404);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should modify preferences and audit changes', function (done) {
            Users.findOne({email: 'root'})
                .then(function (p) {
                    p.preferences.notifications.blogs.blocked.push('something');
                    p.preferences.notifications.posts.blocked.push('none of them');
                    id = p._id.toString();
                    return p.save();
                })
                .then(function () {
                    var request = {
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
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Users.findOne({email: 'root'})
                                .then(function (p) {
                                    expect(p.preferences.locale).to.equal('hi');
                                    expect(p.preferences.notifications.blogs.email.frequency).to.equal('daily');
                                    expect(p.preferences.notifications.userGroups.email.frequency).to.equal('weekly');
                                    expect(p.preferences.notifications.posts.inapp.frequency).to.equal('daily');
                                    expect(p.preferences.notifications.blogs.blocked[0]).to.equal('something');
                                    expect(p.preferences.notifications.userGroups.blocked[0]).to.equal('all of them');
                                    expect(p.preferences.notifications.posts.blocked.length).to.equal(0);
                                    return Audit.findAudit('users', 'root', {'change.action': 'preferences.locale'});
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

