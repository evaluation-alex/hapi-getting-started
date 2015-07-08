'use strict';
let _ = require('lodash');
let Model = require('./model');
let decorateWithInsert = require('./mixins/insert');
let decorateWithSave = require('./mixins/save');
let decorateWithTrackChanges = require('./mixins/track-changes');
let decorateWithSoftDelete = require('./mixins/soft-delete');
let decorateWithUpdate = require('./mixins/update');
let decorateWithI18N = require('./mixins/i18n');
let decorateWithAreValid = require('./mixins/exist');
let ModelBuilder = function ModelBuilder () {
};
ModelBuilder.prototype.virtualModel = () => {
    this.model = function virtualModel() {};
    return this;
};
ModelBuilder.prototype.onModel = (model) => {
    this.model = model;
    _.extend(this.model, Model);
    return this;
};
ModelBuilder.prototype.extendVirtualModel = (fromVirtualModel) => {
    _.extend(this.model, _.omit(fromVirtualModel, ['schema', 'create']));
    _.extend(this.model.prototype, fromVirtualModel.prototype);
    return this;
};
ModelBuilder.prototype.usingConnection = (name) => {
    this.model.connection = name;
    return this;
};
ModelBuilder.prototype.inMongoCollection = (collection) => {
    this.model.collection = collection;
    return this;
};
ModelBuilder.prototype.usingSchema = (schema) => {
    this.model.schema = schema;
    return this;
};
ModelBuilder.prototype.addIndex = (index) => {
    if (!this.model.indexes) {
        this.model.indexes = [];
    }
    this.model.indexes.push(index);
    return this;
};
ModelBuilder.prototype.decorateWithInsertAndAudit = (idToUse, action) => {
    decorateWithInsert(this.model, idToUse, action);
    return this;
};
ModelBuilder.prototype.decorateWithSave = () => {
    decorateWithSave(this.model.prototype, this.model);
    return this;
};
ModelBuilder.prototype.decorateWithTrackChanges = (idToUse) => {
    decorateWithTrackChanges(this.model.prototype, this.model.collection, idToUse ? idToUse : '_id');
    return this;
};
ModelBuilder.prototype.decorateWithSoftDeletes = () => {
    decorateWithSoftDelete(this.model.prototype);
    return this;
};
ModelBuilder.prototype.decorateWithUpdates = (properties, lists, updateMethod, affectedRole, needsApproval) => {
    updateMethod = updateMethod ? updateMethod : 'update';
    decorateWithUpdate(this.model.prototype, properties, lists, updateMethod, affectedRole, needsApproval);
    return this;
};
ModelBuilder.prototype.decorateWithI18N = (fields) => {
    decorateWithI18N(this.model.prototype, fields);
    return this;
};
ModelBuilder.prototype.decorateWithAreValidQuery = (field) => {
    decorateWithAreValid(this.model, field);
    return this;
};
ModelBuilder.prototype.doneConfiguring = () => {
    return this.model;
};
module.exports = ModelBuilder;
