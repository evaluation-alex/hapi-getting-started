'use strict';
var relativeToServer = './../../../../server/';

var Users = require(relativeToServer + 'users/model');
var Audit = require(relativeToServer + 'audit/model');
var Preferences = require(relativeToServer + 'users/preferences/model');
//var expect = require('chai').expect;
var tu = require('./../../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Preferences', function () {
    var rootAuthHeader = null;
    var server = null;
    beforeEach(function (done) {
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

    describe('GET /preferences/{id}', function () {
        var authheader = '';
        var id = '';
        before(function (done) {
            Users._findOne({email: 'one@first.com'})
                .then(function (foundUser) {
                    return foundUser.loginSuccess('test', 'test').save();
                })
                .then(function (foundUser) {
                    authheader = tu.authorizationHeader(foundUser);
                    done();
                })
                .catch(function (err) {
                    if (err) {
                        done(err);
                    }
                });
        });

        it('should only send back preferences with the id in params', function (done) {
            Preferences._findOne({email: 'one@first.com'})
            .then(function (p) {
                    id = p._id.toString();
                    var request = {
                        method: 'GET',
                        url: '/preferences/' + id,
                        headers: {
                            Authorization: authheader
                        }
                    };
                    server.inject(request, function (response) {
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
        });

        it('should send back not found when the preferences with the id in params is not found', function (done) {
            var request = {
                method: 'GET',
                url: '/preferences/abcdefabcdefabcdefabcdef',
                headers: {
                    Authorization: authheader
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

        it('should send back unauthorized if the id in the url and authenticated user are different', function (done) {
            Preferences._findOne({email: 'root'})
                .then(function (u) {
                    var request = {
                        method: 'GET',
                        url: '/preferences/' + u._id.toString(),
                        headers: {
                            Authorization: authheader
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
    });

    describe('PUT /preferences/{id}', function () {
        var authheader = '';
        var id = '';
        beforeEach(function (done) {
            Users._findOne({email: 'root'})
                .then(function (foundUser) {
                    return foundUser.loginSuccess('test', 'test').save();
                })
                .then(function (foundUser) {
                    authheader = tu.authorizationHeader(foundUser);
                    done();
                });
        });

        it('should return unauthorised if someone other than root or the user tries to modify user attributes', function (done) {
            Users._findOne({email: 'one@first.com'})
                .then(function (u) {
                    return u.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    authheader = tu.authorizationHeader(u);
                    return Preferences._findOne({email: 'root'});
                })
                .then(function (p) {
                    id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/preferences/' + id,
                        headers: {
                            Authorization: authheader
                        },
                        payload: {
                            isActive: true,
                            locale: 'hi'
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
                    isActive: true
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
            Preferences._findOne({email: 'root'})
                .then(function (p) {
                    p.notifications.blogs.blocked.push('something');
                    p.notifications.posts.blocked.push('none of them');
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
                            isActive: true,
                            locale: 'hi',
                            notifications: {
                                blogs: {
                                    email : {
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
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Preferences._findOne({email: 'root'})
                                .then(function (p) {
                                    expect(p.locale).to.equal('hi');
                                    expect(p.notifications.blogs.email.frequency).to.equal('daily');
                                    expect(p.notifications.userGroups.email.frequency).to.equal('weekly');
                                    expect(p.notifications.posts.inapp.frequency).to.equal('daily');
                                    expect(p.notifications.blogs.blocked[0]).to.equal('something');
                                    expect(p.notifications.userGroups.blocked[0]).to.equal('all of them');
                                    expect(p.notifications.posts.blocked.length).to.equal(0);
                                    return Audit.findAudit('preferences', 'root', {'change.action': 'locale'});
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

    afterEach(function (done) {
        done();
    });
});

