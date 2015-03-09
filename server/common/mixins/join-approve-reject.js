'use strict';

module.exports = function CommonMixinJoinApproveReject (property, roleToAdd, needsApproval) {
    return {
        join: function (doc, by) {
            var self = this;
            return self.add(doc.payload[property], self.access === 'public' ? roleToAdd : needsApproval, by);
        },
        approve: function (doc, by) {
            var self = this;
            return self.add(doc.payload[property], roleToAdd, by).remove(doc.payload[property], needsApproval, by);
        },
        reject: function (doc, by) {
            var self = this;
            return self.remove(doc.payload[property], needsApproval, by);
        }
    };
};
