'use strict';
const Bluebird = require('bluebird');
const _ = require('./../lodash');
const {merge} = _;
const build = require('./../common/dao').build;
const modelSchema = require('./../../shared/model')(require('joi'), _)['posts-comments'];
const daoOptions = {
    connection: 'app',
    collection: 'posts-comments',
    idForAudit: undefined,
    indexes: [
        {fields: {email: 1, postId: 1, updatedOn: 1, organisation: 1}}
    ],
    updateMethod: {
        method: 'update',
        props: [
            'isActive',
            'comment',
            'status'
        ],
        arrProps: []
    },
    saveAudit: true,
    nonEnumerables: ['audit'],
    schemaVersion: 1
};
const Comments = function Comments(attrs) {
    this.init(attrs);
    return this;
};
Comments.newObject = function newObject(doc, by, org) {
    return Comments.create(Comments.ObjectID(doc.payload.postId),
        doc.payload.comment,
        doc.payload.replyTo ? Comments.ObjectID(doc.payload.replyTo) : undefined,
        doc.payload.status,
        by,
        org);
};
Comments.create = function create(postId, comment, replyTo, status, by, organisation) {
    return Comments.insertAndAudit({
        email: by,
        postId,
        comment,
        replyTo,
        status
    }, by, organisation);
};
Comments.prototype = {
    populate(user) {
        const me = user.email;
        const isAuthor = this.email === me;
        return Bluebird.resolve(merge(this, {
            isAuthor,
            isPending: this.status === 'pending',
            isApproved: this.status === 'approved',
            isSpam: this.status === 'spam',
            canEdit: isAuthor,
            canDelete: isAuthor
        }));
    },
    approve(doc, by) {
        return this.setStatus('approved', by);
    },
    spam(doc, by) {
        return this.setStatus('spam', by);
    }
};
module.exports = build(Comments, daoOptions, modelSchema);
