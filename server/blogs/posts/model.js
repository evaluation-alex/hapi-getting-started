'use strict';
const {merge, pick} = require('lodash');
const Bluebird = require('bluebird');
const {ArchivedPostUpdateError} = require('./../../common/errors');
const {org} = require('./../../common/utils');
const {build} = require('./../../common/dao');
const UserGroups = require('./../../user-groups/model');
const Blogs = require('./../model');
const schemas = require('./schemas');
class Posts {
    constructor(attrs) {
        this.init(attrs);
    }

    static newObject(doc, by) {
        const blog = doc.pre.blogs;
        merge(doc.payload, pick(blog, ['access', 'allowComments', 'needsReview']));
        if (doc.payload.state === 'published') {
            if (doc.payload.needsReview && !(blog.isPresentInOwners(by) || by === 'root')) {
                doc.payload.state = 'pending review';
            }
        }
        return Posts.create(blog._id,
            org(doc),
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
            by)
            .then(post => {
                post.blog = blog;
                return post;
            });
    }

    static create(blogId, organisation, title, state, access, allowComments, needsReview, category, tags, attachments, contentType, content, by) {
        const now = new Date();
        return Posts.insertAndAudit({
            blogId,
            organisation,
            title,
            state,
            access,
            allowComments,
            needsReview,
            category,
            tags,
            attachments,
            contentType,
            content,
            publishedBy: by,
            publishedOn: state === 'published' ? now : null,
            reviewedBy: state === 'published' ? by : null,
            reviewedOn: state === 'published' ? now : null
        }, by);
    }

    update(doc, by) {
        if (this.state !== 'archived') {
            return this.updatePost(doc, by);
        } else {
            return Bluebird.reject(new ArchivedPostUpdateError());
        }
    }

    publish(doc, by) {
        if (['draft', 'pending review'].indexOf(this.state) !== -1) {
            const blog = doc.pre.blogs;
            if (this.needsReview && !(by === 'root' || blog.isPresentInOwners(by))) {
                this.setState('pending review', by);
            } else {
                this.setState('published', by);
                this.reviewedBy = by;
                this.reviewedOn = this.publishedOn = new Date();
            }
        }
        return this;
    }

    reject(doc, by) {
        if (['draft', 'pending review'].indexOf(this.state) !== -1) {
            this.setState('do not publish', by);
            this.reviewedBy = by;
            this.reviewedOn = new Date();
        }
        return this;
    }

    populate(user) {
        return Blogs.findOne({_id: Blogs.ObjectID(this.blogId)})
            .then(blog => {
                this.blog = blog;
                return {canSee: this.access === 'public', blog: this.blog};
            })
            .then(res => res.canSee ? res : res.blog)
            .then(blog =>
                blog.canSee ?
                    blog : {
                    canSee: blog.access === 'public' ||
                    blog.isPresentInOwners(user.email) ||
                    blog.isPresentInContributors(user.email) ||
                    blog.isPresentInSubscribers(user.email),
                    blog: blog
                })
            .then(res =>
                res.canSee ?
                    res.canSee :
                    UserGroups.count({
                        members: user.email,
                        organisation: user.organisation,
                        name: {$in: res.blog.subscriberGroups}
                    }).then(count => count > 0))
            .then(canSee => {
                if (!canSee) {
                    this.content = 'restricted because you are not an owner, contributor or subscriber to this blog and it is not a public post';
                }
                return this;
            });
    }
}
build(Posts, schemas.dao, schemas.model, [], '_id');
module.exports = Posts;
