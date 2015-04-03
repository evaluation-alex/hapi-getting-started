'use strict';
module.exports = function JoinApproveRejectLeave(toAdd, affectedRole, needsApproval) {
    return {
        join: (doc, by) => {
            let self = this;
            return self.add([by], self.access === 'public' ? affectedRole : needsApproval, by);
        },
        approve: (doc, by) => {
            let self = this;
            return self.add(doc.payload[toAdd], affectedRole, by).remove(doc.payload[toAdd], needsApproval, by);
        },
        reject: (doc, by) => {
            let self = this;
            return self.remove(doc.payload[toAdd], needsApproval, by);
        },
        leave: (doc, by) => {
            let self = this;
            return self.remove([by], affectedRole, by);
        }
    };
};
