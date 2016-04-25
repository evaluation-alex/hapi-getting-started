'use strict';
const Bluebird = require('bluebird');
const _ = require('./../lodash');
const {merge} = _;
const utils = require('./../common/utils');
const {hasItems} = utils;
const build = require('./../common/dao').build;
const Blogs = require('./../blogs/model');
const PostsStats = require('./../posts-stats/model');
const Comments = require('./../posts-comments/model');
const shared = require('./shared');
const modelSchema = require('./../../shared/model')(require('joi'), _).posts;
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
    populateBlog(user) {
        return Blogs.findOne({_id: Blogs.ObjectID(this.blogId)})
            .then(blog => {
                return blog.populate(user);
            })
            .then(blog => merge(this, {blog}))
    },
    populatePermissions(user) {
        const isOwner = this.blog.isOwner;
        const isSubscriber = this.blog.isSubscriber;
        const isContributor = this.blog.isContributor;
        const isAuthor = this.publishedBy === user.email;
        const isDraft = this.state === 'draft';
        const isPublished = this.state === 'published';
        const isArchived = this.state === 'archived';
        const isDoNotPublish = this.state === 'do not publish';
        return Bluebird.resolve(merge(this, {
            isOwner,
            isSubscriber,
            isContributor,
            isAuthor,
            isDraft,
            isPublished,
            isArchived,
            isDoNotPublish,
            canEdit: isAuthor,
            canDelete: isAuthor || isOwner,
            canPublish: this.needsReview ? isDraft && !isAuthor && isOwner : isDraft && isAuthor,
            canSaveDraft: isDraft && isAuthor,
            canArchive: isPublished && (isAuthor || isOwner),
            canReject: this.needsReview ? isDraft && !isAuthor && isOwner : isDraft && isAuthor,
            canMakePublic: this.access === 'restricted' && isOwner,
            canMakePrivate: this.access === 'public' && isOwner,
            canStopComments: this.allowComments && isOwner,
            canAllowComments: !this.allowComments && isOwner,
            canComment: this.allowComments && (isOwner || isSubscriber || isContributor) && isPublished
        }));
    },
    populatePosts(user) {
        if (!(this.access === 'public' || this.isSubscriber || this.isOwner || this.isContributor || user.email === 'root')) {
            this.content = 'restricted because you are not an owner, contributor or subscriber to this blog and it is not a public post';
        } else {
            /*istanbul ignore else*/
            if (this.contentType === 'meal' && hasItems(this.content.recipes)) {
                return Posts.find({_id: {$in: this.content.recipes.map(recipe => Posts.ObjectID(recipe))}})
                    .then(recipes => {
                        return Bluebird.all(recipes.map(recipe => recipe.populate(user).reflect()))
                            .then((populatedRecipes) => {
                                this.content.recipes = recipes;
                                return this;
                            });
                    });
            }
        }
        return this;
    },
    populateViews(user) {
        return PostsStats.find({postId: this._id})
            .then(stats => {
                const {viewedOn, rating, ratedOn} = stats.find(vc => vc.email === user.email) || {};
                return merge(this, {
                    uniqueViews: stats.length,
                    totalViews: stats.reduce((p, c) => p + c.viewCount, 1),
                    totalLikes: stats.reduce((p, c) => p + (c.rating === 'like' ? 1 : 0), 0),
                    totalLoves: stats.reduce((p, c) => p + (c.rating === 'love' ? 1 : 0), 0),
                    viewedOn,
                    rating,
                    ratedOn,
                    canLike: (rating || 'none') !== 'like',
                    canUnlike: (rating || 'none') === 'like',
                    canLove: (rating || 'none') !== 'love',
                    canUnlove: (rating || 'none') === 'love'
                });
            });
    },
    populateComments(user) {
        return Comments.find({postId: this._id}, null, {updatedOn: 1})
            .then(comments => {
                return Bluebird.all(comments.map(comment =>
                    comment.populate(user)
                        .then(cmnt => merge(cmnt, {
                            canApprove: cmnt.isPending && (this.isOwner || this.isAuthor)
                        }))
                        .reflect()
                )).map(p => p.isFulfilled() ? p.value() :/*istanbul ignore next*/
                    p.reason()
                );
            })
            .then(comments => merge(this, {comments}));
    },
    populate(user) {
        return this.populateBlog(user)
            .then(post => this.populatePermissions(user))
            .then(post => this.populatePosts(user))
            .then(post => this.populateViews(user))
            .then(post => this.populateComments(user));
    }
};
module.exports = build(Posts, daoOptions, modelSchema, [], '_id');
