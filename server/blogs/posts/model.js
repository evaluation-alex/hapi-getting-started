'use strict';
let ModelBuilder = require('./../../common/model-builder');
let Blogs = require('./../model');
let UserGroups = require('./../../user-groups/model');
let schemas = require('./schemas');
let _ = require('lodash');
let Hoek = require('hoek');
let errors = require('./../../common/errors');
let Bluebird = require('bluebird');
var Posts = (new ModelBuilder())
    .onModel(function Posts (attrs) {
        _.assign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    })
    .inMongoCollection('posts')
    .usingConnection('app')
    .usingSchema(schemas.model)
    .addIndex([{organisation: 1, title: 1, blogId: 1, publishedOn: 1}])
    .addIndex([{tags: 1}])
    .addIndex([{state: 1, publishedOn: 1}])
    .decorateWithInsertAndAudit('_id', 'create')
    .decorateWithSoftDeletes()
    .decorateWithUpdates([
        'isActive',
        'state',
        'category',
        'title',
        'access',
        'allowComments',
        'needsReview',
        'content'
    ], [
        'tags',
        'attachments'
    ], 'updatePost')
    .decorateWithSave()
    .decorateWithTrackChanges()
    .doneConfiguring();
Posts.newObject = (doc, by) => {
    let self = this;
    let blog = doc.pre.blogs;
    doc.payload = Hoek.applyToDefaults(doc.payload, {
        access: blog.access,
        allowComments: blog.allowComments,
        needsReview: blog.needsReview
    });
    if (doc.payload.state === 'published') {
        if (doc.payload.needsReview && !(blog.isPresentInOwners(by) || by === 'root')) {
            doc.payload.state = 'pending review';
        }
    }
    return self.create(blog._id,
        doc.auth.credentials.user.organisation,
        doc.payload.title,
        doc.payload.state,
        doc.payload.access,
        doc.payload.allowComments,
        doc.payload.needsReview,
        doc.payload.category,
        doc.payload.tags,
        doc.payload.attachments,
        doc.payload.contentType || 'post',
        doc.payload.content,
        by);
};
Posts.create = (blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, contentType, content, by) => {
    let self = this;
    let now = new Date();
    let document = {
        blogId: blogId,
        organisation: organisation,
        title: title,
        state: state,
        access: access,
        allowComments: allowComments,
        needsReview: needsReview,
        category: category,
        tags: tags,
        attachments: attachments,
        contentType: contentType,
        content: content,
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
    return self.insertAndAudit(document);
};
Posts.prototype.update = (doc, by) => {
    let self = this;
    if (self.state !== 'archived') {
        return self.updatePost(doc, by);
    } else {
        return Bluebird.reject(new errors.ArchivedPostUpdateError());
    }
};
Posts.prototype.publish = (doc, by) => {
    let self = this;
    if (['draft', 'pending review'].indexOf(self.state) !== -1) {
        let blog = doc.pre.blogs;
        if (self.needsReview && !(by === 'root' || blog.isPresentInOwners(by))) {
            self.setState('pending review', by);
        } else {
            self.setState('published', by);
            self.reviewedBy = by;
            self.reviewedOn = new Date();
            self.publishedOn = new Date();
        }
    }
    return self;
};
Posts.prototype.reject = (doc, by) => {
    let self = this;
    if (['draft', 'pending review'].indexOf(self.state) !== -1) {
        self.setState('do not publish', by);
        self.reviewedBy = by;
        self.reviewedOn = new Date();
    }
    return self;
};
Posts.prototype.populate = (user) => {
    let self = this;
    return Bluebird.resolve({canSee: self.access === 'public'})
        .then((res) => res.canSee ? res : Blogs.findOne({_id: Blogs.ObjectID(self.blogId)}))
        .then((blog) =>
            blog.canSee ?
                blog : {
                canSee: blog.access === 'public' ||
                blog.isPresentInOwners(user.email) ||
                blog.isPresentInContributors(user.email) ||
                blog.isPresentInSubscribers(user.email),
                blog: blog
            }
        )
        .then((res) =>
            res.canSee ?
                res.canSee :
                UserGroups.count({
                    members: user.email,
                    organisation: user.organisation,
                    name: {$in: res.blog.subscriberGroups}
                }).then((count) => count > 0)
        )
        .then((canSee) => {
            if (canSee) {
                return self;
            } else {
                self.content = 'restricted because you are not an owner, contributor or subscriber to this blog and it is not a public post';
            }
            return self;
        });
};
module.exports = Posts;
