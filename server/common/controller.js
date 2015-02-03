'use strict';
var Joi = require('joi');
var Boom = require('boom');
var Promise = require('bluebird');
var AuthPlugin = require('./../common/auth');
var BaseModel = require('hapi-mongo-models').BaseModel;

var Controller = {};

Controller.find = function (component, model, queryBuilder) {
    return {
        pre: [AuthPlugin.preware.ensurePermissions('view', component)],
        handler: function (request, reply) {
            var query = queryBuilder(request);
            var fields = request.query.fields;
            var sort = request.query.sort;
            var limit = request.query.limit;
            var page = request.query.page;
            model.pagedFind(query, fields, sort, limit, page, function (err, results) {
                if (err) {
                    reply(Boom.badImplementation(err));
                } else {
                    reply(results);
                }
            });
        }
    };
};

Controller.findOne = function (component, model) {
    return {
        pre: [AuthPlugin.preware.ensurePermissions('view', component)],
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            model._findOne({_id: id})
                .then(function (permission) {
                    if (!permission) {
                        reply(Boom.notFound(component + ' (' + id + ' ) not found'));
                    } else {
                        reply(permission);
                    }
                })
                .catch(function (err) {
                    if (err) {
                        reply(Boom.badImplementation(err));
                    }
                })
                .done();
        }
    };
};

module.exports.BaseController = Controller;
