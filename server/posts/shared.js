'use strict';
const Bluebird = require('bluebird');
const _ = require('./../lodash');
const {merge, pick} = _;
const org = require('./../common/utils').org;
const ArchivedPostUpdateError = require('./../common/errors').ArchivedPostUpdateError;
const newObjectFunc = function newObjectFunc(klass, contentType) {
    return function newObject(doc, by) {
        const blog = doc.pre.blogs;
        merge(doc.payload, pick(blog, ['access', 'allowComments', 'needsReview']));
        if (doc.payload.state === 'published') {
            if (doc.payload.needsReview && !(blog.isPresentInOwners(by) || by === 'root')) {
                doc.payload.state = 'pending review';
            }
        }
        return klass.create(blog._id,
            org(doc),
            doc.payload.title,
            doc.payload.state,
            doc.payload.access,
            doc.payload.allowComments,
            doc.payload.needsReview,
            doc.payload.tags,
            doc.payload.attachments,
            contentType,
            doc.payload.content,
            by)
            .then(post => {
                post.blog = blog;
                return post;
            });
    };
};
const createFunc = function createFunc(klass) {
    return function create(blogId, organisation, title, state, access, allowComments, needsReview, tags, attachments, contentType, content, by) {
        const now = new Date();
        return klass.insertAndAudit({
            organisation,
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
            publishedBy: by,
            publishedOn: state === 'published' ? now : null,
            reviewedBy: state === 'published' ? by : null,
            reviewedOn: state === 'published' ? now : null
        }, by);
    };
};
const updateFunc = function updateFunc(updateMethod) {
    return function update(doc, by) {
        if (this.state !== 'archived') {
            this.blog = doc.pre.blog;
            return this[updateMethod](doc, by);
        } else {
            return Bluebird.reject(new ArchivedPostUpdateError());
        }
    };
};
module.exports = {
    newObjectFunc,
    createFunc,
    updateFunc
};
