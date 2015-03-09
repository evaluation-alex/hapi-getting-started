'use strict';
var moment = require('moment');
var Config = require('./../../../config');
var Promise = require('bluebird');
var readFileP = Promise.promisify(require('fs').readFile);
var writeFile = require('fs').writeFile;
var LRUCache = require('lru-cache');
var _ = require('lodash');
var logger = Config.logger;

var cache = new LRUCache({
    max: 100 * 1024 * 1024, length: function length (n) {
        return n.length;
    }, maxAge: 1000 * 60 * 60
});

module.exports.resetCache = function resetCache () {
    cache.reset();
};

module.exports.filenameForPost = function filenameForPost (post) {
    return [('/' +
        post.organisation +
        '/blogs/' +
        post.blogId.toString() + '/').replace(' ', '-') +
        moment(post.createdOn).format('YYYYMMDD') +
        '__' +
        post._id.toString()
    ];
};

module.exports.writeContent = function writeContent (post, content) {
    if (!_.isUndefined(content) && content.length > 0) {
        var filename = module.exports.filenameForPost(post);
        cache.set(filename, content);
        writeFile(Config.storage.diskPath + filename, content, {}, function (err) {
            if (err) {
                logger.error({error: err});
            }
        });
    }
    return post;
};

module.exports.readContent = function readContent (post) {
    var filename = module.exports.filenameForPost(post);
    if (cache.has(filename)) {
        return Promise.resolve(cache.get(filename));
    } else {
        return readFileP(Config.storage.diskPath + filename)
            .then(function (content) {
                content = content.toString();
                cache.set(filename, content);
                return content;
            }, function (err) {
                logger.error({error: err});
                return JSON.stringify(err);
            });
    }
};


module.exports.readContentMultiple = function readContentMultiple (posts) {
    return Promise.settle(_.map(posts, module.exports.readContent));
};

