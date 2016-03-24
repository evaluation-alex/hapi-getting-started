'use strict';
const _ = require('./../lodash');
const utils = require('./../common/utils');
const pre = require('./../common/prereqs');
const post = require('./../common/posthandlers');
const {merge} = _;
const {by, org, logAndBoom, profile} = utils;
const {canUpdate, areValidPosts, buildMongoQuery} = pre;
const {populateObject, hashCodeOn} = post;
const schema = require('./../../shared/rest-api')(require('joi'), _)['posts-stats'];
const PostsStats = require('./model');
const buildUpdateHandler = function buildUpdateHandler({collection}, updateCb) {
    const timing = profile('handler', {collection, method: 'update', type: 'main'});
    return function updateHandler(request, reply) {
        const start = Date.now();
        const user = by(request);
        PostsStats.findOne(merge({email: user}, request.pre.mongoQuery))
            .then(ps => !ps ? PostsStats.newObject(request, user, org(request)) : ps)
            .then(ps => updateCb(ps, request))
            .then(u => u.save())
            .catch(logAndBoom)
            .then(reply)
            .finally(() => timing(start));
    };
};
module.exports = {
    incrementView: {
        validate: schema.incrementView,
        pre: [
            canUpdate(PostsStats.collection),
            areValidPosts(['postId']),
            buildMongoQuery(PostsStats, schema.incrementFindOptions)
        ],
        handler: buildUpdateHandler(PostsStats, (vc) => vc.incrementView()),
        post: [
            populateObject(PostsStats),
            hashCodeOn(PostsStats)
        ]
    },
    rate: {
        validate: schema.rate,
        pre: [
            canUpdate(PostsStats.collection),
            areValidPosts(['postId']),
            buildMongoQuery(PostsStats, schema.incrementFindOptions)
        ],
        handler: buildUpdateHandler(PostsStats, (ps, request) => ps.rate(request, by(request))),
        post: [
            populateObject(PostsStats),
            hashCodeOn(PostsStats)
        ]
    }
};
