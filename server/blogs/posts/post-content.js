'use strict';
let moment = require('moment');
let Config = require('./../../../config');
let Promise = require('bluebird');
let readFileP = Promise.promisify(require('fs').readFile);
let writeFile = require('fs').writeFile;
let LRUCache = require('lru-cache');
let _ = require('lodash');
let utils = require('./../../common/utils');
let cache = new LRUCache({
    max: 100 * 1024 * 1024,
    length: (n) => n.length,
    maxAge: 1000 * 60 * 60
});
module.exports.resetCache = () => cache.reset();
module.exports.filenameForPost = (post) => [('/' +
post.organisation +
'/blogs/' +
post.blogId.toString() + '/').replace(' ', '-') +
moment(post.createdOn).format('YYYYMMDD') +
'__' +
post._id.toString()
];
module.exports.writeContent = (post, content) => {
    if (!_.isUndefined(content) && content.length > 0) {
        let filename = module.exports.filenameForPost(post);
        cache.set(filename, content);
        writeFile(Config.storage.diskPath + filename, content, {}, utils.errback);
    }
    return post;
};
module.exports.readContent = (post) => {
    let filename = module.exports.filenameForPost(post);
    if (cache.has(filename)) {
        return Promise.resolve(cache.get(filename));
    } else {
        return readFileP(Config.storage.diskPath + filename)
            .then((content) => {
                content = content.toString();
                cache.set(filename, content);
                return content;
            }, utils.errback);
    }
};
module.exports.readContentMultiple = (posts) => Promise.resolve(_.map(posts, module.exports.readContent));
