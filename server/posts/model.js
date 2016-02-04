'use strict';
const Bluebird = require('bluebird');
const utils = require('./../common/utils');
const {org, hasItems} = utils;
const build = require('./../common/dao').build;
const UserGroups = require('./../user-groups/model');
const Blogs = require('./../blogs/model');
const schemas = require('./schemas');
const shared = require('./shared');
const Posts = function Posts(attrs) {
    this.init(attrs);
    return this;
};
Posts.newObject = shared.newObjectFunc(Posts, 'post');
Posts.create = shared.createFunc(Posts);
Posts.prototype = {
    update: shared.updateFunc('updatePost'),
    publish(doc, by) {
        const blog = doc.pre.blogs;
        if (['draft', 'pending review'].indexOf(this.state) !== -1) {
            if (this.needsReview && !(by === 'root' || blog.isPresentInOwners(by))) {
                this.setState('pending review', by);
            } else {
                this.setState('published', by);
                this.reviewedBy = by;
                this.reviewedOn = this.publishedOn = new Date();
            }
        }
        return this;
    },
    reject(doc, by) {
        if (['draft', 'pending review'].indexOf(this.state) !== -1) {
            this.setState('do not publish', by);
            this.reviewedBy = by;
            this.reviewedOn = new Date();
        }
        return this;
    },
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
};
module.exports = build(Posts, schemas.dao, schemas.model, [], '_id');
