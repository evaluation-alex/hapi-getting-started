'use strict';
let _ = require('lodash');
let traverse = require('traverse');
module.exports = function Properties (properties) {
    let ret = {};
    _.forEach(properties, (property) => {
        const path = property.split('.');
        const name = path.map(_.capitalize).join('');
        ret['set' + name] = (newValue, by) => {
            let self = this;
            let origval = traverse(self).get(path);
            if (!_.isUndefined(newValue) && !_.isEqual(origval, newValue)) {
                self.trackChanges(property, origval, newValue, by);
                traverse(self).set(path, newValue);
            }
            return self;
        };
    });
    return ret;
};

