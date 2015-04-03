'use strict';
module.exports = function IsActive() {
    return {
        del: (doc, by) => {
            let self = this;
            return self.deactivate(by);
        },
        deactivate: (by) => {
            let self = this;
            return self.setIsActive(false, by);
        },
        reactivate: (by) => {
            let self = this;
            return self.setIsActive(true, by);
        }
    };
};
