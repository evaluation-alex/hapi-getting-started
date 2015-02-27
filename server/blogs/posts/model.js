'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../../common/extended-model');
var BaseModel = require('hapi-mongo-models').BaseModel;
var AddRemove = require('./../../common/model-mixins').AddRemove;
var IsActive = require('./../../common/model-mixins').IsActive;
var Update = require('./../../common/model-mixins').Update;
var Properties = require('./../../common/model-mixins').Properties;
var Save = require('./../../common/model-mixins').Save;
var CAudit = require('./../../common/model-mixins').Audit;
var Promise = require('bluebird');
var Audit = require('./../../audit/model');
var _ = require('lodash');
var moment = require('moment');
var Config = require('./../../../config');
var mkdirp = Promise.promisify(require('mkdirp'));
var readFileP = Promise.promisify(require('fs').readFile);
var writeFileP = Promise.promisify(require('fs').writeFile);
var LRUCache = require('lru-cache');

var cache = new LRUCache({
    max: 100 * 1024 * 1024, length: function (n) {
        return n.length;
    }, maxAge: 1000 * 60 * 60
});

var Posts = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    }
    /* jshint +W064 */
});

_.extend(Posts.prototype, new AddRemove({
    tags: 'tags',
    attachments: 'attachments'
}));
_.extend(Posts.prototype, IsActive);
_.extend(Posts.prototype, new Properties(['title', 'state', 'category', 'access', 'allowComments', 'needsReview', 'isActive']));
_.extend(Posts.prototype, new Update({
    isActive: 'isActive',
    category: 'category',
    title: 'title',
    access: 'access',
    allowComments: 'allowComments',
    needsReview: 'needsReview',
    content: 'content'
}, {
    tags: 'tags',
    attachments: 'attachments'
}));
_.extend(Posts.prototype, new Save(Posts, Audit));
_.extend(Posts.prototype, new CAudit('Posts', '_id'));

Posts._collection = 'posts';

Posts.schema = Joi.object().keys({
    _id: Joi.object(),
    blogId: Joi.object(),
    organisation: Joi.string(),
    title: Joi.string(),
    state: Joi.string().valid(['draft', 'pending review', 'published', 'archived', 'do not publish']).default('draft'),
    access: Joi.string().valid(['public', 'restricted']).default('public'),
    allowComments: Joi.boolean().default(true),
    needsReview: Joi.boolean().default(false),
    category: Joi.string(),
    tags: Joi.array().includes(Joi.string()).unique(),
    content: Joi.string(),
    attachments: Joi.array().includes(Joi.object()).unique(),
    publishedBy: Joi.string(),
    publishedOn: Joi.date(),
    reviewedBy: Joi.string(),
    reviewedOn: Joi.date(),
    isActive: Joi.boolean().default(true),
    createdBy: Joi.string(),
    createdOn: Joi.date(),
    updatedBy: Joi.string(),
    updatedOn: Joi.date()
});

Posts.indexes = [
    [{blogId: 1, organisation: 1, publishedOn: 1, state: 1}],
    [{title: 1}],
    [{tags: 1}]
];

Posts.filenameForPost = function (post) {
    return [(post.organisation + '/blogs/' + post.blogId.toString() + '/' + moment(post.createdOn).format('YYYYMMDD') + '/').replace(' ', '-'), post._id.toString()];
};

Posts.prototype.setContent = function (content, by) {
    var self = this;
    if (!_.isUndefined(content)) {
        var fnm = Posts.filenameForPost(self);
        var filename = fnm.join('');
        mkdirp(Config.storage.diskPath + '/' + fnm[0], {})
            .then(function () {
                return writeFileP(Config.storage.diskPath + '/' + filename, content, {});
            })
            .catch(function (err) {
                if (err) {
                    console.log(err);
                }
            })
            .done();
        cache.set(filename, content);
        self.content = filename;
        self.updatedBy = by;
        self.updatedOn = new Date();
    }
    return self;
};

Posts.prototype.readContentFromDisk = function () {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (cache.has(self.content)) {
            self.content = cache.get(self.content);
            resolve(self);
        } else {
            readFileP(Config.storage.diskPath + '/' + self.content)
                .then(function (content) {
                    content = content.toString();
                    cache.set(self.content, content);
                    self.content = content;
                    resolve(self);
                })
                .catch(function (err) {
                    reject(err);
                });
        }
    });
};

Posts.prototype.approve = function (doc, by) {
    var self = this;
    if (self.state === 'draft' || self.state === 'pending review' || self.state === 'do not publish') {
        var now = new Date();
        self.setState('published', by);
        self.reviewedBy = by;
        self.reviewedOn = now;
        self.publishedOn = now;
    }
    return self.update(doc, by);
};

Posts.prototype.reject = function (doc, by) {
    var self = this;
    if (self.state === 'draft' || self.state === 'pending review') {
        var now = new Date();
        self.setState('do not publish', by);
        self.reviewedBy = by;
        self.reviewedOn = now;
    }
    return self.update(doc, by);
};

Posts.newObject = function (doc, by) {
    var self = this;
    return self.create(doc.params.blogId,
        doc.auth.credentials.user.organisation,
        doc.payload.title,
        doc.payload.state,
        doc.payload.access,
        doc.payload.allowComments,
        doc.payload.needsReview,
        doc.payload.category,
        doc.payload.tags,
        doc.payload.content,
        doc.payload.attachments,
        by);
};
/*jshint unused:true*/

Posts.create = function (blogId, organisation, title, state, access, allowComments, needsReview, category, tags, content, attachments, by) {
    var self = this;
    return new Promise(function (resolve, reject) {
        var now = new Date();
        var id = BaseModel.ObjectID();
        var document = {
            _id: id,
            blogId: blogId,
            organisation: organisation,
            title: title,
            state: state,
            access: access,
            allowComments: allowComments,
            needsReview: needsReview,
            category: category,
            tags: tags,
            content: Posts.filenameForPost({
                organisation: organisation,
                blogId: blogId,
                createdOn: now,
                _id: id
            }).join(''),
            attachments: attachments,
            publishedBy: by,
            publishedOn: state === 'published' ? now : null,
            reviewedBy: state === 'published' ? by : null,
            reviewedOn: state === 'published' ? now : null,
            isActive: true,
            createdBy: by,
            createdOn: now,
            updatedBy: by,
            updatedOn: now
        };
        self._insert(document, false)
            .then(function (post) {
                if (post) {
                    Audit.create('Posts', post._id, 'create', null, post, by, organisation);
                    post.setContent(content, by);
                }
                process.nextTick(function () {
                    resolve(post);
                });
            })
            .catch(function (err) {
                reject(err);
            });
    });
};

Posts._find = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.find(conditions, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                if (!docs) {
                    resolve([]);
                } else {
                    process.nextTick(function () {
                        resolve(Promise.all(_.map(docs, function (doc) {
                            return doc.readContentFromDisk();
                        })));
                    });
                }
            }
        });
    });
};

Posts._findOne = function (conditions) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self.findOne(conditions, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                if (!doc) {
                    resolve(false);
                } else {
                    process.nextTick(function () {
                        resolve(doc.readContentFromDisk());
                    });
                }
            }
        });
    });
};

Posts._findByIdAndUpdate = function (id, obj) {
    var self = this;
    return new Promise(function (resolve, reject) {
        if (obj.content !== Posts.filenameForPost(obj).join('')) {
            obj.setContent(obj.content, obj.updatedBy);
        }
        self.findByIdAndUpdate(id, obj, function (err, doc) {
            err ? reject(err) : resolve(doc);
        });
    });
};

Posts.resetCache = function () {
    cache.reset();
};

module.exports = Posts;

