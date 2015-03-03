'use strict';
var moment = require('moment');
var Config = require('./../../../config');
var Promise = require('bluebird');
var readFileP = Promise.promisify(require('fs').readFile);
var readFileS = require('fs').readFileSync;
var writeFile = require('fs').writeFile;
var LRUCache = require('lru-cache');
var _ = require('lodash');

var cache = new LRUCache({
    max: 100 * 1024 * 1024, length: function (n) {
        return n.length;
    }, maxAge: 1000 * 60 * 60
});

var resetCache = function () {
    cache.reset();
};

module.exports.resetCache = resetCache;

var filenameForPost = function (post) {
    return [('/' + post.organisation + '/blogs/' + post.blogId.toString() + '/').replace(' ', '-') + moment(post.createdOn).format('YYYYMMDD') + '__' + post._id.toString()];
};

module.exports.filenameForPost = filenameForPost;

var writeContent = function (post, content) {
    if (!_.isUndefined(content) && content !== null && content.length > 0) {
        var filename = filenameForPost(post);
        cache.set(filename, content);
        writeFile(Config.storage.diskPath + filename, content, {}, function (err) {
            if (err) {
                console.log(err);
            }
        });
    }
    return post;
};

module.exports.writeContent = writeContent;

/*jshint unused:false*/
var readContent = function (post) {
    return new Promise(function (resolve, reject) {
        var filename = filenameForPost(post);
        if (cache.has(filename)) {
            resolve(cache.get(filename));
        } else {
            readFileP(Config.storage.diskPath + filename)
                .then(function (content) {
                    content = content.toString();
                    cache.set(filename, content);
                    resolve(content);
                })
                .catch(function (err) {
                    resolve(JSON.stringify(err));
                });
        }
    });
};
/*jshint unused:true*/

module.exports.readContent = readContent;

var readContentSync = function (post) {
    var filename = filenameForPost(post);
    if (!cache.has(filename)) {
        var content = '';
        try {
            content = readFileS(Config.storage.diskPath + '/' + filename);
        } catch (err) {
            content = JSON.stringify(err);
        }
        content = content.toString();
        cache.set(filename, content);
    }
    return cache.get(filename);
/*
    var promise = readContent(post);
    while(!promise.isFulfilled()) {
        process.nextTick(function () {});
    }
    return promise.value();
*/
};

module.exports.readContentSync = readContentSync;
