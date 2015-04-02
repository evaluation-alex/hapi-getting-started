'use strict';
module.exports = function CommonMixinJoinApproveReject (toAdd, affectedRole, needsApproval) {
    return {
        join: function join (doc, by) {
            var self = this;
            return self.add([by], self.access === 'public' ? affectedRole : needsApproval, by);
        },
        approve: function approve (doc, by) {
            var self = this;
            return self.add(doc.payload[toAdd], affectedRole, by).remove(doc.payload[toAdd], needsApproval, by);
        },
        reject: function reject (doc, by) {
            var self = this;
            return self.remove(doc.payload[toAdd], needsApproval, by);
        },
        leave: function leave (doc, by) {
            var self = this;
            return self.remove([by], affectedRole, by);
        }
    };
};
