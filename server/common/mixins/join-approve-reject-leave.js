'use strict';
let _ = require('lodash');
module.exports = function JoinApproveRejectLeave(toAdd, affectedRole, needsApproval) {
    let needsApprovalMethod = needsApproval.split('.').map(_.capitalize).join('');
    let affectedRoleMethod = affectedRole.split('.').map(_.capitalize).join('');
    return {
        join: (doc, by) => {
            let self = this;
            let method = self.access === 'public' ? affectedRoleMethod : needsApprovalMethod;
            return self['add' + method]([by], by);
        },
        approve: (doc, by) => {
            let self = this;
            self['add' + affectedRoleMethod](doc.payload[toAdd], by);
            self['remove' + needsApprovalMethod](doc.payload[toAdd], by);
            return self;
        },
        reject: (doc, by) => {
            let self = this;
            return self['remove' + needsApprovalMethod](doc.payload[toAdd], by);
        },
        leave: (doc, by) => {
            let self = this;
            return self['remove' + affectedRoleMethod]([by], by);
        }
    };
};
