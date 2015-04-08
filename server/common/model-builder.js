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
var ModelFactory = function ModelFactory () {
};
ModelFactory.prototype.virtualModel = (model) => {
    this.model = model;
    return this;
};
ModelFactory.prototype.onModel = (model) => {
    this.model = model;
    _.extend(this.model, Model);
    return this;
};
ModelFactory.prototype.extendVirtualModel = (fromVirtualModel) => {
    _.extend(this.model, _.omit(fromVirtualModel, ['schema']));
    _.extend(this.model.prototype, fromVirtualModel.prototype);
    return this;
};
ModelFactory.prototype.extendModel = (fromModel) => {
    _.extend(this.model, _.omit(fromModel, ['create', 'newObject', 'collection', 'schema']));
    _.extend(this.model.prototype, _.omit(fromModel, ['insertAndAudit', 'save', 'trackChanges']));
    return this;
};
ModelFactory.prototype.inMongoCollection = (collection) => {
    this.model.collection = collection;
    return this;
};
ModelFactory.prototype.usingSchema = (schema) => {
    this.model.schema = schema;
    return this;
};
ModelFactory.prototype.addIndex = (index) => {
    if (!this.model.indexes) {
        this.model.indexes = [];
    }
    this.model.indexes.push(index);
    return this;
};
ModelFactory.prototype.supportInsertAndAudit = (idToUse, action) => {
    _.extend(this.model, new Insert(idToUse, action));
    return this;
};
ModelFactory.prototype.supportSave = () => {
    _.extend(this.model.prototype, new Save(this.model));
    return this;
};
ModelFactory.prototype.supportTrackChanges = (idToUse) => {
    _.extend(this.model.prototype, new TrackChanges(this.model.collection, idToUse ? idToUse : '_id'));
    return this;
};
ModelFactory.prototype.supportSoftDeletes = () => {
    _.extend(this.model.prototype, new SoftDelete());
    return this;
};
ModelFactory.prototype.supportUpdates = (properties, lists, updateMethod, toAdd, affectedRole, needsApproval) => {
    updateMethod = updateMethod ? updateMethod : 'update';
    _.extend(this.model.prototype, new Update(properties, lists, updateMethod, toAdd, affectedRole, needsApproval));
    return this;
};
ModelFactory.prototype.supportI18N = (fields) => {
    _.extend(this.model.prototype, new I18N(fields));
    return this;
};
ModelFactory.prototype.supportAreValidQuery = (field) => {
    _.extend(this.model, new AreValid(field));
    return this;
};
ModelFactory.prototype.doneConfiguring = () => {
    return this.model;
};
module.exports = ModelFactory;
