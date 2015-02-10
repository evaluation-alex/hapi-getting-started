'use strict';
var Joi = require('joi');
var Boom = require('boom');
var Promise = require('bluebird');
var AuthPlugin = require('./../common/auth');
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');
var logger = require('./../manifest').logger;

var Controller = {};

var areValid = function (Model, docPropertyToLookup, payloadPropertyToLookup) {
    return function (request, reply) {
        if (request.payload[payloadPropertyToLookup] && request.payload[payloadPropertyToLookup].length > 0) {
            var msg = 'Bad data : ';
            Model.areValid(docPropertyToLookup, request.payload[payloadPropertyToLookup])
                .then(function (validated) {
                    _.forEach(request.payload[payloadPropertyToLookup], function (a) {
                        if (!validated[a]) {
                            msg += a + ',';
                        }
                    });
                })
                .then(function () {
                    if (msg.indexOf(',') > -1) {
                        reply(Boom.badData(msg));
                    } else {
                        reply();
                    }
                })
                .catch(function (err) {
                    if (err) {
                        reply(Boom.badImplementation(err));
                    }
                });
        } else {
            reply();
        }
    };
};

module.exports.areValid = areValid;

Controller.find = function (component, model, validator, queryBuilder) {
    validator.query.fields =  Joi.string();
    validator.query.sort = Joi.string();
    validator.query.limit = Joi.number().default(20);
    validator.query.page = Joi.number().default(1);

    return {
        validator: validator,
        pre: [AuthPlugin.preware.ensurePermissions('view', component)],
        handler: function (request, reply) {
            var query = queryBuilder(request);
            var fields = request.query.fields;
            var sort = request.query.sort;
            var limit = request.query.limit;
            var page = request.query.page;
            logger.info({component: component, query: query, fields: fields, sort: sort, limit: limit, page: page});
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

Controller.findOne = function (component, Model) {
    return {
        pre: [AuthPlugin.preware.ensurePermissions('view', component)],
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            logger.info({component: component, id: request.params.id});
            Model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                    } else {
                        reply(f);
                    }
                })
                .catch(function (err) {
                    if (err) {
                        logger.error({component: component, id: request.params.id, error: err});
                        reply(Boom.badImplementation(err));
                    }
                });
        }
    };
};

Controller.update = function (component, Model, validator) {
    return {
        validator: validator,
        pre: [AuthPlugin.preware.ensurePermissions('update', component)],
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            logger.info({component: component, id: request.params.id});
            Model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                        return false;
                    } else {
                        var by = request.auth.credentials.user.email;
                        return f.update(request.payload, by)._save();
                    }
                })
                .then(function(f) {
                    if (f) {
                        reply(f);
                    }
                })
                .catch(function (err) {
                    if (err) {
                        reply(Boom.badImplementation(err));
                    }
                });
        }
    };
};

Controller.delete = function (component, Model) {
    return {
        pre: [AuthPlugin.preware.ensurePermissions('update', component)],
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            logger.info({component: component, id: request.params.id});
            Model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                        return false;
                    } else {
                        var by = request.auth.credentials.user.email;
                        return f.deactivate(by)._save();
                    }
                })
                .then(function(f) {
                    if (f) {
                        reply(f);
                    }
                })
                .catch(function (err) {
                    if (err) {
                        reply(Boom.badImplementation(err));
                    }
                });
        }
    };
};

module.exports.BaseController = Controller;
