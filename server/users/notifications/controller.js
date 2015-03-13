'use strict';
var Joi = require('joi');
var _ = require('lodash');
var moment = require('moment');
var Notifications = require('./model');
var ControllerFactory = require('./../../common/controller-factory');

var Controller = new ControllerFactory(Notifications)
    .needsI18N()
    .findController({
        query: {
            title: Joi.string(),
            state: Joi.string(),
            objectType: Joi.string(),
            createdOnBefore: Joi.date(),
            createdOnAfter: Joi.date(),
            isActive: Joi.string()
        }
    }, function buildFindQuery (request) {
        var query = {};
        var fields = [['state', 'state'], ['objectType', 'objectType']];
        _.forEach(fields, function (pair) {
            if (request.query[pair[0]]) {
                query[pair[1]] = {$regex: new RegExp('^.*?' + request.query[pair[0]] + '.*$', 'i')};
            }
        });
        query.email = request.auth.credentials.user.email;
        if (request.query.createdOnBefore) {
            query.createdOn = {};
            query.createdOn.$lte = moment(request.query.createdOnBefore, ['YYYY-MM-DD']).toDate();
        }
        if (request.query.createdOnAfter) {
            query.createdOn = query.createdOn || {};
            query.createdOn.$gte = moment(request.query.createdOnAfter, ['YYYY-MM-DD']).toDate();
        }
        return query;
    })
    .updateController({
        payload: {
            state: Joi.string().only(['read', 'starred']),
            isActive: Joi.boolean()
        }
    }, [], 'update', 'update')
    .doneConfiguring();

module.exports = Controller;
