'use strict';
const Bluebird = require('bluebird');
const _ = require('./../lodash');
const {merge} = _;
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), _)['posts-stats'];
const daoOptions = {
    connection: 'app',
    collection: 'posts-stats',
    indexes: [{fields: {email: 1, postId: 1}, options: {unique: true}}],
    saveAudit: false,
    schemaVersion: 1
};
const PostsStats = function PostsStats(attrs) {
    this.init(attrs);
    return this;
};
PostsStats.newObject = function newObject(doc, by, org) {
    const {postId, rating} = doc.payload;
    return PostsStats.create(postId, rating, by, org);
};
PostsStats.create = function create(postId, rating = 'none', by, organisation) {
    const now = new Date();
    return PostsStats.upsert({
        email: by,
        postId: PostsStats.ObjectID(postId),
        viewCount: 0,
        rating,
        viewedOn: now,
        ratedOn: rating !== 'none' ? now : undefined,
        isActive: true,
        organisation
    });
};
PostsStats.prototype = {
    incrementView() {
        this.viewCount++;
        this.viewedOn = new Date();
        this.__isModified = true;
        return this;
    },
    rate(doc, by) {
        this.rating = doc.payload.rating;
        this.ratedOn = new Date();
        this.__isModified = true;
        return this;
    },
    populate(user) {
        const rating = this.rating;
        return Bluebird.resolve(merge(this, {
            canLike: rating !== 'like',
            canUnlike: rating === 'like',
            canLove: rating !== 'love',
            canUnlove: rating === 'love'
        }));
    }
};
module.exports = build(PostsStats, daoOptions, modelSchema);
