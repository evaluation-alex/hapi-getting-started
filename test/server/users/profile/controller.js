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
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Profile', function () {
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

    describe('PUT /profile/{id}', function () {
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
            var oneauthheader = '';
            Users._findOne({email: 'one@first.com'})
                .then(function (u) {
                    return u.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    oneauthheader = tu.authorizationHeader(u);
                    return Users._findOne({email: 'root'});
                })
                .then(function (u) {
                    id = u._id.toString();
                })
                .then(function () {
                    var request = {
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
            var request = {
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
            Users._findOne({email: 'root'})
                .then(function (p) {
                    id = p._id.toString();
                    var request = {
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
                            Users._findOne({email: 'root'})
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

    afterEach(function (done) {
        done();
    });
});

