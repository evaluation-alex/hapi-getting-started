'use strict';
var Joi = require('joi');
var Boom = require('boom');
var AuthPlugin = require('./../common/auth');
var BaseModel = require('hapi-mongo-models').BaseModel;
var _ = require('lodash');

var Controller = {};

var isUnique = function (Model, queryBuilder) {
    return function (request, reply) {
        var query = queryBuilder(request);
        Model._findOne(query)
            .then(function (f) {
                if (f) {
                    reply(Boom.conflict('Object already exists'));
                } else {
                    reply(true);
                }
            })
            .catch(function (err) {
                reply(Boom.badImplementation(err));
            });
    };
};

var areValid = function (Model, docPropertyToLookup, payloadPropertyToLookup) {
    return function (request, reply) {
        if (request.payload[payloadPropertyToLookup] && request.payload[payloadPropertyToLookup].length > 0) {
            var msg = 'Bad data : ';
            Model.areValid(docPropertyToLookup, request.payload[payloadPropertyToLookup], request.auth.credentials.user.organisation)
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
                    reply(Boom.badImplementation(err));
                });
        } else {
            reply();
        }
    };
};

module.exports.areValid = areValid;

Controller.find = function (component, model, validator, queryBuilder) {
    validator.query.fields = Joi.string();
    validator.query.sort = Joi.string();
    validator.query.limit = Joi.number().default(20);
    validator.query.page = Joi.number().default(1);

    return {
        validator: validator,
        pre: [AuthPlugin.preware.ensurePermissions('view', component)],
        handler: function (request, reply) {
            var query = queryBuilder(request);
            query.organisation = query.organisation || {$regex: new RegExp('^.*?' + request.auth.credentials.user.organisation + '.*$', 'i')};
            if (request.query.isActive) {
                query.isActive = request.query.isActive === '"true"';
            }
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

Controller.findOne = function (component, Model) {
    return {
        pre: [AuthPlugin.preware.ensurePermissions('view', component)],
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            Model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                    } else {
                        reply(f);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

Controller.new = function (component, Model, validator, prereqs, uniqueCheck) {
    return {
        validator: validator,
        pre: _.flatten([AuthPlugin.preware.ensurePermissions('update', component),
            {assign: 'isUnique', method: isUnique(Model, uniqueCheck)},
            prereqs]),
        handler: function (request, reply) {
            var by = request.auth.credentials.user.email;
            Model.newObject(request, by)
                .then(function (n) {
                    if (!n) {
                        reply(Boom.notFound(component + ' could not be created.'));
                    } else {
                        reply(n).code(201);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

Controller.update = function (component, Model, validator, prereqs) {
    return {
        validator: validator,
        pre: _.flatten([AuthPlugin.preware.ensurePermissions('update', component), prereqs]),
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            Model._findOne({_id: id})
                .then(function (u) {
                    if (!u) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                        return false;
                    } else {
                        var by = request.auth.credentials.user.email;
                        return u.update(request.payload, by).save();
                    }
                })
                .then(function (u) {
                    if (u) {
                        reply(u);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

Controller.updateSpecial = function (component, Model, validator, prereqs, updateCb) {
    return {
        validator: validator,
        pre: _.flatten([prereqs]),
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            Model._findOne({_id: id})
                .then(function (u) {
                    if (!u) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                        return false;
                    } else {
                        return updateCb(u, request);
                    }
                })
                .then(function (u) {
                    if (u) {
                        reply(u);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

Controller.delete = function (component, Model) {
    return {
        pre: [AuthPlugin.preware.ensurePermissions('update', component)],
        handler: function (request, reply) {
            var id = BaseModel.ObjectID(request.params.id);
            Model._findOne({_id: id})
                .then(function (f) {
                    if (!f) {
                        reply(Boom.notFound(component + ' (' + id.toString() + ' ) not found'));
                        return false;
                    } else {
                        if (f.deactivate) {
                            var by = request.auth.credentials.user.email;
                            return f.deactivate(by).save();
                        } else {
                            return Model._findByIdAndRemove(id);
                        }
                    }
                })
                .then(function (f) {
                    if (f) {
                        reply(f);
                    }
                })
                .catch(function (err) {
                    reply(Boom.badImplementation(err));
                });
        }
    };
};

module.exports.BaseController = Controller;
