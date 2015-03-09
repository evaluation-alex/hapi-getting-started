'use strict';

module.exports = function () {
    return {
        del: function (doc, by) {
            var self = this;
            return self.deactivate(by);
        },
        deactivate: function (by) {
            var self = this;
            return self.setIsActive(false, by);
        },
        reactivate: function (by) {
            var self = this;
            return self.setIsActive(true, by);
        }
    };
};
