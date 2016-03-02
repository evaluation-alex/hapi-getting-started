'use strict';
const utils = require('./../common/utils');
const {hasItems} = utils;
const build = require('./../common/dao').build;
const UserGroups = require('./../user-groups/model');
const Blogs = require('./../blogs/model');
const shared = require('./shared');
const modelSchema = require('./../../shared/model')(require('joi'), require('./../lodash')).posts;
const daoOptions = {
    connection: 'app',
    collection: 'posts',
    indexes: [
        {fields: {organisation: 1, title: 1, blogId: 1, publishedOn: 1}},
        {fields: {tags: 1}},
        {fields: {state: 1, publishedOn: 1}}
    ],
    updateMethod: shared.daoOptions.updateMethod,
    saveAudit: true,
    nonEnumerables: ['audit'],
    schemaVersion: 1
};
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
                        name: {$in: res.blog.subscriberGroups}
                    }).then(count => count > 0))
            .then(canSee => {
                if (!canSee) {
                    this.content = 'restricted because you are not an owner, contributor or subscriber to this blog and it is not a public post';
                } else {
                    /*istanbul ignore else*/
                    if (this.contentType === 'meal' && hasItems(this.content.recipes)) {
                        return Posts.find({_id: {$in: this.content.recipes.map(recipe => Posts.ObjectID(recipe))}})
                            .then(recipes => {
                                this.content.recipes = recipes;
                                return this;
                            });
                    }
                }
                return this;
            });
    }
};
module.exports = build(Posts, daoOptions, modelSchema, [], '_id');
