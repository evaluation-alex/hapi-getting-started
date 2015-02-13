'use strict';
var relativeToServer = './../../../server/';
var relativeTo = './../../../';

var Users = require(relativeToServer + 'users/model');
var Blogs = require(relativeToServer + 'blogs/model');
var UserGroups = require(relativeToServer + 'user-groups/model');
var Audit = require(relativeToServer + 'audit/model');
var _ = require('lodash');
var Promise = require('bluebird');
var BaseModel = require('hapi-mongo-models').BaseModel;
//var expect = require('chai').expect;
var tu = require('./../testutils');
var Code = require('code');   // assertion library
var Lab = require('lab');
var lab = exports.lab = Lab.script();
var describe = lab.describe;
var it = lab.it;
var before = lab.before;
var after = lab.after;
var beforeEach = lab.beforeEach;
var afterEach = lab.afterEach;
var expect = Code.expect;

describe('Blogs', function () {
    var rootAuthHeader = null;
    var server = null;
    var blogsToClear = [];
    var groupsToClear = [];
    beforeEach(function (done) {
        server = tu.setupServer()
            .then(function (s) {
                server = s;
                return tu.setupRolesAndUsers();
            })
            .then(function () {
                return Users.findByEmail('root');
            })
            .then(function (root) {
                return root.loginSuccess('test', 'test')._save();
            })
            .then(function (root) {
                rootAuthHeader = tu.authorizationHeader(root);
                done();
            })
            .catch(function (err) {
                if (err) {
                    done(err);
                }
            })
            .done();

    });

    describe('GET /blogs', function () {
        before(function (done) {
            Blogs.create('test GET /blogs is active', 'test GET /blogs', ['owner1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], 'test')
                .then(function (p) {
                    return Blogs.create('test GET /blogs is active = false', ['owner2'], ['contributor2'], ['subscriber2'], ['subscriberGroup2'], 'test');
                })
                .then(function (p) {
                    p.isActive = false;
                    p._save();
                    done();
                });
        });
        it('should give blogs when isactive = true is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs?isActive="true"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(d.isActive).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give inactive blogs when isactive = false is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs?isActive="false"',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    _.forEach(p.data, function (d) {
                        expect(d.isActive).to.be.false();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should give the blogs where the user sent is a member of the owners list', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs?owner=owner1',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    var p = JSON.parse(response.payload);
                    var patt = /owner1/i;
                    _.forEach(p.data, function (d) {
                        var match = false;
                        _.find(d.owners, function (u) {
                            match = match || patt.test(u);
                        });
                        expect(match).to.be.true();
                    });
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should return both inactive and active blogs when nothing is sent', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs',
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        after(function (done) {
            blogsToClear.push('test GET /blogs is active');
            blogsToClear.push('test GET /blogs is active = false');
            done();
        });
    });

    describe('GET /blogs/{id}', function () {
        var id = '';
        before(function (done) {
            Blogs.create('test GET /blogs/id', 'test GET /blogs/id', ['user1'], ['contributor1'], ['subscriber1'], ['subscriberGroup1'], 'test')
                .then(function (p) {
                    id = p._id.toString();
                    done();
                });
        });
        it('should only send back blog with the id in params', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs/' + id,
                headers: {
                    Authorization: rootAuthHeader
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(200);
                    expect(response.payload).to.match(/blog/);
                    done();
                } catch (err) {
                    done(err);
                }
            });
        });
        it('should send back not found when the blog with the id in params is not found', function (done) {
            var request = {
                method: 'GET',
                url: '/blogs/' + id.replace('a', '0').replace('b', '0').replace('c', '0').replace('d', '0').replace('e', '0').replace('f', '0'),
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
        after(function (done) {
            blogsToClear.push('test GET /blogs/id');
            done();
        });
    });

    describe('PUT /blogs/{id}', function () {
        it('should send back not found error when you try to modify non existent blogs', function (done) {
            var request = {
                method: 'PUT',
                url: '/blogs/54d4430eed61ad701cc7a721',
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
        it('should send back error if any of the users to be added are not valid', function (done) {
            Blogs.create('test PUT /blogs invalidusers', 'test PUT /blogs invalidusers', [], [], [], [], 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedOwners: ['one@first.com', 'bogus']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            expect(response.payload).to.match(/bogus/);
                            blogsToClear.push('test PUT /blogs invalidusers');
                            done();
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs invalidusers');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should send back error if any of the groups to be added are not valid', function (done) {
            Blogs.create('test PUT /blogs invalidgroups', 'test PUT /blogs invalidgroups', [], [], [], [], 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscriberGroups: ['bogus']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(422);
                            expect(response.payload).to.match(/bogus/);
                            blogsToClear.push('test PUT /blogs invalidgroups');
                            done();
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs invalidgroups');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should activate blogs and have changes audited', function (done) {
            Blogs.create('test PUT /blogs isActive=true', [], [], [], [], 'test')
                .then(function (p) {
                    p.isActive = false;
                    p._save();
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            isActive: true
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].isActive).to.be.true();
                                    return Audit.findAudit('Blogs', found[0].title, {action: 'isActive'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/isActive/);
                                    blogsToClear.push('test PUT /blogs isActive=true');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs isActive=true');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should deactivate blogs and have changes audited', function (done) {
            Blogs.create('test PUT /blogs isActive=false', [], [], [], [], 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
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
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].isActive).to.be.false();
                                    return Audit.findAudit('Blogs', found[0].title, {action: 'isActive'});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/isActive/);
                                    blogsToClear.push('test PUT /blogs isActive=false');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs isActive=false');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should add subscriber / subscriber groups and have changes audited', function (done) {
            UserGroups.create('testBlogsAddGroup', 'test PUT /blogs', 'test')
                .then(function (u) {
                    return Blogs.create('test PUT /blogs add subscribers and subscriber groups', 'test PUT /blogs add subscribers and subscriber groups', [], [], [], [], 'test');
                })
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            addedSubscribers: ['one@first.com'],
                            addedSubscriberGroups: ['testBlogsAddGroup']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].subscribers[0]).to.equal('one@first.com');
                                    expect(found[0].subscriberGroups[0]).to.equal('testBlogsAddGroup');
                                    return Audit.findAudit('Blogs', found[0].title, {action: {$regex: /add/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(2);
                                    expect(foundAudit[0].action).to.match(/add/);
                                    expect(foundAudit[1].action).to.match(/add/);
                                    blogsToClear.push('test PUT /blogs add subscribers and subscriber groups');
                                    groupsToClear.push('testBlogsAddGroup');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs add subscribers and subscriber groups');
                            groupsToClear.push('testBlogsAddGroup');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should remove subscribers / subscriber groups and have changes audited', function (done) {
            Blogs.create('test PUT /blogs remove subscribers and sub groups', 'test PUT /blogs remove subscribers and sub groups', [], [], ['toRemove'], ['toRemove'], 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            removedSubscribers: ['toRemove'],
                            removedSubscriberGroups: ['toRemove']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].subscribers.length).to.equal(0);
                                    expect(found[0].subscriberGroups.length).to.equal(0);
                                    return Audit.findAudit('Blogs', found[0].title, {action: {$regex: /remove/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(2);
                                    expect(foundAudit[0].action).to.match(/remove/);
                                    expect(foundAudit[1].action).to.match(/remove/);
                                    blogsToClear.push('test PUT /blogs remove subscribers and sub groups');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs remove subscribers and sub groups');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should update description and have changes audited', function (done) {
            Blogs.create('test PUT /blogs update desc', 'test PUT /blogs update desc', [], [], [], [], 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'PUT',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            description: 'updated'
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (found) {
                                    expect(found[0].description).to.equal('updated');
                                    return Audit.findAudit('Blogs', found[0].title, {action: {$regex: /change desc/}});
                                })
                                .then(function (foundAudit) {
                                    expect(foundAudit).to.exist();
                                    expect(foundAudit.length).to.equal(1);
                                    expect(foundAudit[0].action).to.match(/change desc/);
                                    blogsToClear.push('test PUT /blogs update desc');
                                    blogsToClear.push('updated');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test PUT /blogs update desc');
                            blogsToClear.push('updated');
                            done(err);
                        }
                    });
                })
                .done();
        });
    });

    describe('POST /blogs', function () {
        it('should send back conflict when you try to create a blog with a title that already exists', function (done) {
            Blogs.create('test POST /blogs dupe', 'test POST /permissions dupe', [], [], [], [], 'test')
                .then(function (p) {
                    var request = {
                        method: 'POST',
                        url: '/blogs',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            title: 'test POST /blogs dupe',
                            description: 'test POST /blogs dupe',
                            owners: [],
                            contributors: [],
                            subscribers: [],
                            subscriberGroups: []
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(409);
                            blogsToClear.push('test POST /blogs dupe');
                            done();
                        } catch (err) {
                            blogsToClear.push('test POST /blogs dupe');
                            done(err);
                        }
                    });
                })
                .done();
        });
        it('should send back error if any user sent in the request does not exist', function (done) {
            var request = {
                method: 'POST',
                url: '/blogs',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    title: 'test POST /blogs invalid owner',
                    description: 'test POST /blogs invalid owner',
                    owners: ['unknown'],
                    contributors: [],
                    subscribers: [],
                    subscriberGroups: []
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/unknown/);
                    blogsToClear.push('test POST /blogs invalid owner');
                    done();
                } catch (err) {
                    blogsToClear.push('test POST /blogs invalid owner');
                    done(err);
                }
            });
        });
        it('should send back error if any group sent in the request does not exist', function (done) {
            var request = {
                method: 'POST',
                url: '/blogs',
                headers: {
                    Authorization: rootAuthHeader
                },
                payload: {
                    title: 'test POST /blogs invalidgroup',
                    description: 'test POST /blogs invalidgroup',
                    owners: [],
                    contributors: [],
                    subscribers: [],
                    subscriberGroups: ['madeup']
                }
            };
            server.inject(request, function (response) {
                try {
                    expect(response.statusCode).to.equal(422);
                    expect(response.payload).to.match(/madeup/);
                    blogsToClear.push('test POST /blogs invalidgroup');
                    done();
                } catch (err) {
                    blogsToClear.push('test POST /blogs invalidgroup');
                    done(err);
                }
            });
        });
        it('should create permissions successfully', function (done) {
            UserGroups.create('test post /blogs', 'success', 'test')
                .then(function (u) {
                    var request = {
                        method: 'POST',
                        url: '/blogs',
                        headers: {
                            Authorization: rootAuthHeader
                        },
                        payload: {
                            title: 'test post /blogs success',
                            description: 'test post /blogs sucess',
                            owners: ['one@first.com'],
                            contributors: [],
                            subscribers: [],
                            subscriberGroups: ['test post /blogs']
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(201);
                            Blogs._find({title: 'test post /blogs success'})
                                .then(function (found) {
                                    expect(found).to.exist();
                                    expect(found.length).to.equal(1);
                                    expect(found[0].description).to.equal('test post /blogs sucess');
                                    expect(found[0].title).to.equal('test post /blogs success');
                                    return Audit.findAudit('Blogs', 'test post /blogs success', {action: 'create'});
                                })
                                .then(function (fa) {
                                    expect(fa.length).to.equal(1);
                                    groupsToClear.push('test post /blogs');
                                    blogsToClear.push('test post /blogs success');
                                    done();
                                });
                        } catch (err) {
                            groupsToClear.push('test post /blogs');
                            blogsToClear.push('test post /blogs success');
                            done(err);
                        }
                    });
                })
                .done();
        });
    });

    describe('DELETE /blogs/{id}', function () {
        it('should send back not found error when you try to modify a non existent permissions', function (done) {
            var request = {
                method: 'DELETE',
                url: '/blogs/54d4430eed61ad701cc7a721',
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
        it('should deactivate blog and have changes audited', function (done) {
            Blogs.create('test DELETE /blogs/id', 'test DELETE /blogs/id', [], [], [], [], 'test')
                .then(function (p) {
                    var id = p._id.toString();
                    var request = {
                        method: 'DELETE',
                        url: '/blogs/' + id,
                        headers: {
                            Authorization: rootAuthHeader
                        }
                    };
                    server.inject(request, function (response) {
                        try {
                            expect(response.statusCode).to.equal(200);
                            Blogs._find({_id: BaseModel.ObjectID(id)})
                                .then(function (p) {
                                    expect(p[0].isActive).to.be.false;
                                    return Audit.findAudit('Blogs', p[0].title, {action: 'isActive'});
                                })
                                .then(function (a) {
                                    expect(a).to.exist();
                                    expect(a[0].action).to.match(/isActive/);
                                    blogsToClear.push('test DELETE /blogs/id');
                                    done();
                                });
                        } catch (err) {
                            blogsToClear.push('test DELETE /blogs/id');
                            done(err);
                        }
                    });
                }).done();
        });
    });

    afterEach(function (done) {
        return tu.cleanup({userGroups: groupsToClear, blogs: blogsToClear}, done);
    });

});

