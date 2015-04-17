'use strict';
module.exports = function decorateWithSoftDelete (Model) {
    Model.del = (doc, by) => {
        let self = this;
        return self.deactivate(by);
    };
    Model.deactivate = (by) => {
        let self = this;
        return self.setIsActive(false, by);
    };
    Model.reactivate = (by) => {
        let self = this;
        return self.setIsActive(true, by);
    };
    return Model;
};
