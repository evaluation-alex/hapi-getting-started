'use strict';
module.exports = function IsActive () {
    return {
        del: function del (doc, by) {
            var self = this;
            return self.deactivate(by);
        },
        deactivate: function deactivate (by) {
            var self = this;
            return self.setIsActive(false, by);
        },
        reactivate: function reactivate (by) {
            var self = this;
            return self.setIsActive(true, by);
        }
    };
};
