'use strict';
const Bluebird = require('bluebird');
const _ = require('./../lodash');
const {merge, pick} = _;
const ArchivedPostUpdateError = require('./../common/errors').ArchivedPostUpdateError;
const newObjectFunc = function newObjectFunc(klass, contentType) {
    return function newObject(doc, by, org) {
        const blog = doc.pre.blogs;
        merge(doc.payload, pick(blog, ['access', 'allowComments', 'needsReview']));
        if (doc.payload.state === 'published') {
            if (doc.payload.needsReview && !(blog.isPresentInOwners(by) || by === 'root')) {
                doc.payload.state = 'pending review';
            }
        }
        return klass.create(blog._id,
            doc.payload.title,
            doc.payload.state,
            doc.payload.access,
            doc.payload.allowComments,
            doc.payload.needsReview,
            doc.payload.tags,
            doc.payload.attachments,
            contentType,
            doc.payload.content,
            by,
            org)
            .then(post => {
                post.blog = blog;
                return post;
            });
    };
};
const createFunc = function createFunc(klass) {
    return function create(blogId, title, state, access, allowComments, needsReview, tags, attachments, contentType, content, by, organisation) {
        const now = new Date();
        const toCreate = merge({
            blogId,
            state,
            access,
            allowComments,
            needsReview,
            title,
            tags,
            attachments,
            contentType,
            content,
            publishedBy: by
        }, state === 'published' ? {
            publishedOn: now,
            reviewedBy: by,
            reviewedOn: now
        } : {});
        return klass.insertAndAudit(toCreate, by, organisation);
    };
};
const updateFunc = function updateFunc(updateMethod) {
    return function update(doc, by) {
        if (this.state !== 'archived') {
            return this[updateMethod](doc, by);
        } else {
            return Bluebird.reject(new ArchivedPostUpdateError());
        }
    };
};
const daoOptions = {
    updateMethod: {
        method: 'updatePost',
        props: [
            'isActive',
            'state',
            'title',
            'access',
            'allowComments',
            'needsReview',
            'content'
        ],
        arrProps: [
            'tags',
            'attachments'
        ]
    }
};
module.exports = {
    newObjectFunc,
    createFunc,
    updateFunc,
    daoOptions
};
