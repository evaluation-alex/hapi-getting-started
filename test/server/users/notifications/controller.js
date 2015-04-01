'use strict';
var relativeToServer = './../../../../server/';

var _ = require('lodash');
var moment = require('moment');
var Users = require(relativeToServer + 'users/model');
var Notifications = require(relativeToServer + 'users/notifications/model');
var Audit = require(relativeToServer + 'audit/model');
var Promise = require('bluebird');
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

describe('Notifications', function () {
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

    describe('GET /notifications', function () {
        beforeEach(function (done) {
            /*jshint unused:false*/
            //email, organisation, objectType, objectId, title, state, action, priority, content, by
            var n1 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root');
            var n2 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abc1234', 'titles dont matter', 'starred', 'fyi', 'low', 'content is useful', 'root');
            var n3 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abcd1234', 'titles dont matter', 'cancelled', 'fyi', 'low', 'content is useful', 'root');
            Promise.join(n1, n2, n3, function (n11, n21, n31) {
                n31[0].deactivate('test').save();
                n21[0].createdOn.setFullYear(2015, 1, 14);
                n21[0].save();
            })
                .then(function () {
                    done();
                }).
                catch(function (err) {
                    done(err);
                });
            /*jshint unused:true*/
        });
        it('should give active notifications when isactive = true is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/notifications?isActive="true"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(2);
                    expect(p.data[0].isActive).to.be.true();
                    expect(p.data[1].isActive).to.be.true();
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give inactive notifications when isactive = false is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/notifications?isActive="false"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].isActive).to.be.false();
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give only the notifications whose state is sent in the parameter', function (done) {
            var request = {
                method: 'GET',
                url: '/notifications?state=unread',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].objectId).to.match(/abc123/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give only the notifications of the user making the query', function (done) {
            var request = {
                method: 'GET',
                url: '/notifications',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(3);
                    expect(p.data[0].email).to.match(/root/);
                    expect(p.data[1].email).to.match(/root/);
                    expect(p.data[2].email).to.match(/root/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should give all notifications in a given time period', function (done) {
            var request = {
                method: 'GET',
                url: '/notifications?createdOnBefore=2015-02-15&createdOnAfter=2015-02-13',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(moment(d.publishedOn).format('YYYYMMDD')).to.equal('20150214');
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });

        it('should give all posts in a given time period2', function (done) {
            var request = {
                method: 'GET',
                url: '/notifications?createdOnAfter=2015-02-13',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(moment(d.publishedOn).isAfter('2015-02-13')).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should filter out blocked notifications based on preferences', function (done) {
            var authHeader = '';
            Users._findOne({email: 'one@first.com'})
                .then(function (user) {
                    user.preferences.notifications.userGroups.blocked.push('abc123');
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (u) {
                    authHeader = tu.authorizationHeader(u);
                    var request = {
                        method: 'GET',
                        url: '/notifications',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            var p = JSON.parse(response.payload);
                            _.forEach(p.data, function (d) {
                                expect(d.objectId).to.not.equal(/abc123/);
                            });
                            done();
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
    });

    describe('PUT /notifications/{id}', function () {
        it('should send back not found error when you try to modify a non existent notification', function (done) {
            var request = {
                method: 'PUT',
                url: '/notifications/54c894fe1d1d4ab4032ed94e',
                headers: {
                    Authorization: rootAuthHeader
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
        it('should return unauthorized if someone other than the owner of the notification tries to change it', function (done) {
            var id = null;
            Notifications.create('root', 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root')
                .then(function (n) {
                    id = n._id.toString();
                    return Users._findOne({email: 'one@first.com'});
                })
                .then(function (user) {
                    return user.loginSuccess('test', 'test').save();
                })
                .then(function (user) {
                    var request = {
                        method: 'PUT',
                        url: '/notifications/' + id,
                        headers: {
                            Authorization: tu.authorizationHeader(user)
                        },
                        payload: {
                            isActive: false
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
        it('should deactivate notification and have changes audited', function (done) {
            Notifications.create('root', 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root')
                .then(function (n) {
                    var id = n._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/notifications/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            isActive: false
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Notifications._findOne({_id: Notifications.ObjectID(id)})
                                .then(function (found) {
                                    expect(found.isActive).to.be.false();
                                    return Audit.findAudit('notifications', n._id, {'change.action': /isActive/});
                                })
                                .then(function (audit) {
                                    expect(audit.length).to.equal(1);
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
        it('should update state and have changes audited', function (done) {
            Notifications.create('root', 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root')
                .then(function (n) {
                    var id = n._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/notifications/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            state: 'starred'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Notifications._findOne({_id: Notifications.ObjectID(id)})
                                .then(function (found) {
                                    expect(found.state).to.equal('starred');
                                    return Audit.findAudit('notifications', n._id, {'change.action': /state/});
                                })
                                .then(function (audit) {
                                    expect(audit.length).to.equal(1);
                                    done();
                                });
                        } catch (err) {
                            done(err);
                        }
                    });
                });
        });
    })
    ;

    afterEach(function (done) {
        /*jshint unused:false*/
        Notifications.deleteMany({title: 'titles dont matter'}, function (err, doc) {
            if (err) {
                done(err);
            }
            else {
                return tu.cleanup({}, done);
            }
        });
        /*jshint unused:true*/
    });
});

