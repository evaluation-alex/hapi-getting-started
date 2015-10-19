'use strict';
/*eslint-disable no-unused-expressions*/
/*jshint -W079*/
let relativeToServer = './../../../../build/';
let _ = require('lodash');
let moment = require('moment');
let Notifications = require(relativeToServer + 'users/notifications/model');
let Audit = require(relativeToServer + 'audit/model');
let Bluebird = require('bluebird');
let tu = require('./../../testutils');
let expect = require('chai').expect;
describe('Notifications', () => {
    let rootAuthHeader = null;
    let server = null;
    before((done) => {
        tu.setupServer()
            .then((res) => {
                server = res.server;
                rootAuthHeader = res.authheader;
                done();
            })
            .catch((err) => {
                if (err) {
                    done(err);
                }
            })
            .done();
    });
    describe('GET /notifications', () => {
        before((done) => {
            /*jshint unused:false*/
            //email, organisation, objectType, objectId, title, state, action, priority, content, by
            let n1 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abc123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root');
            let n2 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abc1234', 'titles dont matter', 'starred', 'fyi', 'low', 'content is useful', 'root');
            let n3 = Notifications.create(['root', 'one@first.com'], 'silver lining', 'user-groups', 'abcd1234', 'titles dont matter', 'cancelled', 'fyi', 'low', 'content is useful', 'root');
            Bluebird.join(n1, n2, n3, (n11, n21, n31) => {
                n31[0].deactivate('test');
                n21[0].createdOn.setFullYear(2015, 1, 14);
                return Bluebird.join(n21[0].save(), n31[0].save(), (n211, n311) => {
                    return [n211, n311];
                });
            })
                .then(() => {
                    done();
                })
                .catch((err) => {
                    done(err);
                });
            /*jshint unused:true*/
        });
        it('should give active notifications when isactive = true is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/notifications?isActive="true"&objectType=user-groups',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(2);
                    expect(p.data[0].isActive).to.be.true;
                    expect(p.data[1].isActive).to.be.true;
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give inactive notifications when isactive = false is sent', (done) => {
            let request = {
                method: 'GET',
                url: '/notifications?isActive="false"&objectType=user-groups',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].isActive).to.be.false;
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give only the notifications whose state is sent in the parameter', (done) => {
            let request = {
                method: 'GET',
                url: '/notifications?state=unread&objectType=user-groups',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(1);
                    expect(p.data[0].objectId).to.match(/abc123/);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give only the notifications of the user making the query', (done) => {
            let request = {
                method: 'GET',
                url: '/notifications?objectType=user-groups',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    expect(p.data.length).to.equal(3);
                    expect(p.data[0].email).to.match(/root/);
                    expect(p.data[1].email).to.match(/root/);
                    expect(p.data[2].email).to.match(/root/);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give all notifications in a given time period', (done) => {
            let request = {
                method: 'GET',
                url: '/notifications?createdOnBefore=2015-02-15&createdOnAfter=2015-02-13&objectType=user-groups',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(moment(d.createdOn).format('YYYYMMDD')).to.equal('20150214');
                    });
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should give all posts in a given time period2', (done) => {
            let request = {
                method: 'GET',
                url: '/notifications?createdOnAfter=2015-02-13&objectType=user-groups',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(moment(d.publishedOn).isAfter('2015-02-13')).to.be.true;
                    });
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should filter out blocked notifications based on preferences', (done) => {
            let authHeader = '';
            tu.findAndLogin('one@first.com')
                .then((u) => {
                    authHeader = u.authheader;
                    u.user.preferences.notifications.userGroups.blocked.push('abc123');
                    return u.user.save();
                })
                .then(() => {
                    let request = {
                        method: 'GET',
                        url: '/notifications?objectType=user-groups',
                        headers: {
                            Authorization: authHeader
                        }
                    };
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    let p = JSON.parse(response.payload);
                    _.forEach(p.data, (d) => {
                        expect(d.objectId).to.not.equal(/abc123/);
                    });
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
    });
    describe('PUT /notifications/{id}', () => {
        it('should send back not found error when you try to modify a non existent notification', (done) => {
            let request = {
                method: 'PUT',
                url: '/notifications/54c894fe1d1d4ab4032ed94e',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {}
            };
            server.injectThen(request)
                .then((response) => {
                    expect(response.statusCode).to.equal(404);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should return unauthorized if someone other than the owner of the notification tries to change it', (done) => {
            let id = null;
            Notifications.create('root', 'silver lining', 'blogs', 'xyz123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root')
                .then((n) => {
                    id = n._id.toString();
                    return tu.findAndLogin('one@first.com');
                })
                .then((u) => {
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
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(401);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
        it('should deactivate notification and have changes audited', (done) => {
            let id = '';
            Notifications.create('root', 'silver lining', 'blogs', 'pqr123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root')
                .then((n) => {
                    id = n._id.toString();
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
                    return server.injectThen(request);
                })
                .then((response) => {
                    expect(response.statusCode).to.equal(200);
                    return Notifications.findOne({_id: Notifications.ObjectID(id)});
                })
                .then((found) => {
                    expect(found.isActive).to.be.false;
                    return Audit.findAudit('notifications', Notifications.ObjectID(id), {'change.action': /isActive/});
                })
                .then((audit) => {
                    expect(audit.length).to.equal(1);
                    done();
                })
                .catch((err) => {
                    done(err);
                });
        });
    });
    it('should update state and have changes audited', (done) => {
        let id = '';
        Notifications.create('root', 'silver lining', 'blogs', 'def123', 'titles dont matter', 'unread', 'fyi', 'low', 'content is useful', 'root')
            .then((n) => {
                id = n._id.toString();
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
                return server.injectThen(request);
            })
            .then((response) => {
                expect(response.statusCode).to.equal(200);
                return Notifications.findOne({_id: Notifications.ObjectID(id)});
            })
            .then((found) => {
                expect(found.state).to.equal('starred');
                return Audit.findAudit('notifications', Notifications.ObjectID(id), {'change.action': /state/});
            })
            .then((audit) => {
                expect(audit.length).to.equal(1);
                done();
            })
            .catch((err) => {
                done(err);
            });
    });
    after((done) => {
        Notifications.remove({title: 'titles dont matter'})
            .then(() => {
                return tu.cleanup({}, done);
            });
    });
});
