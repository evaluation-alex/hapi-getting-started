'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var BaseModel = require('hapi-mongo-models').BaseModel;
var Promise = require('bluebird');

var Audit = BaseModel.extend({
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
});

Audit._collection = 'audit';

Audit.schema = Joi.object().keys({
    objectChangedType: Joi.string().required(),
    objectChangedId: Joi.string(),
    action: Joi.string(),
    origValues: Joi.object(),
    newValues: Joi.object(),
    timestamp: Joi.date(),
    by: Joi.string()
});

Audit.indexes = [
    [{objectChangedType: 1, objectChangedId: 1, action: 1}]
];

Audit.createUsersAudit = function (email, action, origValues, newValues, by) {
    var self = this;
    return self.create('Users', email, action, origValues, newValues, by);
};

Audit.createUserGroupsAudit = function (name, action, origValues, newValues, by) {
    var self = this;
    return self.create('UserGroups', name, action, origValues, newValues, by);
};

Audit.createPermissionsAudit = function (name, action, origValues, newValues, by) {
    var self = this;
    return self.create('Permissions', name, action, origValues, newValues, by);
};

Audit.create = function (type, id, action, origValues, newValues, by) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        var obj = {
            objectChangedType: type,
            objectChangedId: id,
            action: action,
            origValues: origValues,
            newValues: newValues,
            timestamp: new Date(),
            by: by
        };
        self.insert(obj, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                resolve(doc);
            }
        });
    });
    return promise;
};

Audit._findOne = function (conditions) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.findOne(conditions, function (err, doc) {
            if (err) {
                reject(err);
            } else {
                if (!doc) {
                    reject(new Error('Audit docs not found for conditions - ' + JSON.stringify(conditions)));
                } else {
                    resolve(doc);
                }
            }
        });
    });
    return promise;
};

Audit._find = function (conditions) {
    var self = this;
    var promise = new Promise(function (resolve, reject) {
        self.find(conditions, function (err, docs) {
            if (err) {
                reject(err);
            } else {
                if (!docs) {
                    reject(new Error('Audit docs not found for conditions - ' + JSON.stringify(conditions)));
                } else {
                    resolve(docs);
                }
            }
        });
    });
    return promise;
};

Audit.findUsersAudit = function (conditions) {
    var self = this;
    conditions.objectChangedType = 'Users';
    conditions.objectChangedId = conditions.userId;
    delete conditions.userId;
    return self._find(conditions);
};

Audit.findUserGroupsAudit = function (conditions) {
    var self = this;
    conditions.objectChangedType = 'UserGroups';
    conditions.objectChangedId = conditions.name;
    delete conditions.name;
    return self._find(conditions);
};

Audit.findPermissionsAudit = function (conditions) {
    var self = this;
    conditions.objectChangedType = 'Permissions';
    conditions.objectChangedId = conditions.name;
    delete conditions.name;
    return self._find(conditions);
};

Audit.findChangesByUser = function (by) {
    var self = this;
    return self._find({by: by});
};

module.exports = Audit;
