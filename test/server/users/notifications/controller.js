'use strict';
let relativeToServer = './../../../../server/';
let _ = require('lodash');
let moment = require('moment');
let Notifications = require(relativeToServer + 'users/notifications/model');
let Audit = require(relativeToServer + 'audit/model');
var Promise = require('bluebird');
let tu = require('./../../testutils');
let Code = require('code');
let Lab = require('lab');
let lab = exports.lab = Lab.script();
let describe = lab.describe;
let it = lab.it;
let before = lab.before;
let after = lab.after;
let expect = Code.expect;
describe('Notifications', function () {
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
    describe('GET /notifications', function () {
        before(function (done) {
            /*jshint unused:false*/
            //email, organisation, objectType, objectId, title, state, action, priority, content, by
            let n1 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root');
            let n2 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abc1234', 'titles dont matter', 'starred', 'fyi', 'low', 'content is useful', 'root');
            let n3 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abcd1234', 'titles dont matter', 'cancelled', 'fyi', 'low', 'content is useful', 'root');
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
            let request = {
                method: 'GET',
                url: '/notifications?isActive="true"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
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
            let request = {
                method: 'GET',
                url: '/notifications?isActive="false"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].isActive).to.be.false();
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give only the notifications whose state is sent in the parameter', function (done) {
            let request = {
                method: 'GET',
                url: '/notifications?state=unread',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].objectId).to.match(/abc123/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give only the notifications of the user making the query', function (done) {
            let request = {
                method: 'GET',
                url: '/notifications',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
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
            let request = {
                method: 'GET',
                url: '/notifications?createdOnBefore=2015-02-15&createdOnAfter=2015-02-13',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
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
            let request = {
                method: 'GET',
                url: '/notifications?createdOnAfter=2015-02-13',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
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
            let authHeader = '';
            tu.findAndLogin('one@first.com')
                .then(function (u) {
                    authHeader = u.authheader;
                    u.user.preferences.notifications.userGroups.blocked.push('abc123');
                    return u.user.save();
                })
                .then(function () {
                    let request = {
                        method: 'GET',
                        url: '/notifications',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            let p = JSON.parse(response.payload);
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
            let request = {
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
            let id = null;
            Notifications.create('root', 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root')
                .then(function (n) {
                    id = n._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then(function (u) {
                    let authHeader = u.authheader;
                    let request = {
                        method: 'PUT',
                        url: '/notifications/' + id,
                        headers: {
                            Authorization: authHeader
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
                    let id = n._id.toString();
                    let request = {
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
                            Notifications.findOne({_id: Notifications.ObjectID(id)})
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
                    let id = n._id.toString();
                    let request = {
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
                            Notifications.findOne({_id: Notifications.ObjectID(id)})
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
    });
    after(function (done) {
        Notifications.remove({title: 'titles dont matter'})
            .then(function () {
                return tu.cleanup({}, done);
            });
    });
});

