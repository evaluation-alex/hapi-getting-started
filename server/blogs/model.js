'use strict';
import {assign} from 'lodash';
import {org, hasItems} from './../common/utils';
import {build} from './../common/dao';
import schemas from './schemas';
class Blogs {
    constructor(attrs) {
        assign(this, attrs);
        Object.defineProperty(this, 'audit', {
            writable: true,
            enumerable: false
        });
    }

    static newObject(doc, by) {
        return Blogs.create(doc.payload.title,
            org(doc),
            doc.payload.description,
            doc.payload.owners,
            doc.payload.contributors,
            doc.payload.subscribers,
            doc.payload.subscriberGroups,
            doc.payload.needsReview,
            doc.payload.access,
            doc.payload.allowComments,
            by);
    }

    static create(title, organisation, description, owners, contributors, subscribers, subscriberGroups, needsReview, access, allowComments, by) {
        let document = {
            title,
            organisation,
            description,
            owners: hasItems(owners) ? owners : [by],
            contributors: hasItems(contributors) ? contributors : [by],
            subscribers: hasItems(subscribers) ? subscribers : [by],
            subscriberGroups: hasItems(subscriberGroups) ? subscriberGroups : [],
            needsApproval: [],
            needsReview,
            access,
            allowComments
        };
        return Blogs.insertAndAudit(document, by);
    }
}
build(Blogs, schemas.dao, schemas.model);
export default Blogs;
