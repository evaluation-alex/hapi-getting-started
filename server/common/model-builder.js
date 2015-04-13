'use strict';
let _ = require('lodash');
let Model = require('./model');
let Insert = require('./mixins/insert');
let Save = require('./mixins/save');
let TrackChanges = require('./mixins/track-changes');
let SoftDelete = require('./mixins/soft-delete');
let Update = require('./mixins/update');
let I18N = require('./mixins/i18n');
let AreValid = require('./mixins/exist');
var ModelBuilder = function ModelBuilder () {
};
ModelBuilder.prototype.virtualModel = (model) => {
    this.model = model;
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
ModelBuilder.prototype.extendModel = (fromModel) => {
    _.extend(this.model, _.omit(fromModel, ['create', 'newObject', 'collection', 'schema', 'indexes']));
    _.extend(this.model.prototype, _.omit(fromModel.prototype, ['insertAndAudit', 'save', 'trackChanges']));
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
    _.extend(this.model, new Insert(idToUse, action));
    return this;
};
ModelBuilder.prototype.decorateWithSave = () => {
    _.extend(this.model.prototype, new Save(this.model));
    return this;
};
ModelBuilder.prototype.decorateWithTrackChanges = (idToUse) => {
    _.extend(this.model.prototype, new TrackChanges(this.model.collection, idToUse ? idToUse : '_id'));
    return this;
};
ModelBuilder.prototype.decorateWithSoftDeletes = () => {
    _.extend(this.model.prototype, new SoftDelete());
    return this;
};
ModelBuilder.prototype.decorateWithUpdates = (properties, lists, updateMethod, affectedRole, needsApproval) => {
    updateMethod = updateMethod ? updateMethod : 'update';
    _.extend(this.model.prototype, new Update(properties, lists, updateMethod, affectedRole, needsApproval));
    return this;
};
ModelBuilder.prototype.decorateWithI18N = (fields) => {
    _.extend(this.model.prototype, new I18N(fields));
    return this;
};
ModelBuilder.prototype.decorateWithAreValidQuery = (field) => {
    _.extend(this.model, new AreValid(field));
    return this;
};
ModelBuilder.prototype.doneConfiguring = () => {
    return this.model;
};
module.exports = ModelBuilder;
