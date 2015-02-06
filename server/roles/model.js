'use strict';
var Joi = require('joi');
var ObjectAssign = require('object-assign');
var ExtendedModel = require('./../common/extended-model').ExtendedModel;
var Promise = require('bluebird');

var Roles = ExtendedModel.extend({
    /* jshint -W064 */
    constructor: function (attrs) {
        ObjectAssign(this, attrs);
    }
    /* jshint +W064 */
});

Roles.prototype.hasPermissionsTo= function (performAction, onObject) {
        var ret = false;
        if (this.permissions) {
            this.permissions.forEach(function (permission) {
                if ((permission.object.indexOf(onObject) !== -1 || permission.object === '*') && (permission.action === 'update' || permission.action === performAction)) {
                    ret = ret || true;
                }
            });
        }
        return ret;
    };

Roles._collection = 'roles';
Roles.schema = Joi.object().keys({
    _id: Joi.object(),
    name: Joi.string().required(),
    permissions: Joi.array().includes(Joi.object().keys({
        action: Joi.string().valid('view', 'update'),
        object: Joi.string().required()
    })).unique()
});

Roles.indexes = [
    [{name: 1}, {unique: true}],
];

Roles.create = function (name, permissions) {
    var self = this;
    var document = {
        name: name,
        permissions: permissions
    };
    return self._insert(document, new Error('No role created - ' + name));
};

Roles.findByName = function (names) {
    var self = this;
    return new Promise(function (resolve, reject) {
        self._find({name: {$in: names}})
            .then(function (roles) {
                if (!roles) {
                    reject(new Error('no roles found'));
                } else {
                    resolve(roles);
                }
            })
            .catch(function (err) {
                if (err) {
                    reject(err);
                }
            });
    });
};

module.exports = Roles;
