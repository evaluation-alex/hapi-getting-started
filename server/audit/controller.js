'use strict';
import {buildQuery} from './../common/utils';
import {canView, findValidator} from './../common/prereqs';
import {buildFindHandler} from './../common/handlers';
import schemas from './schemas';
import Audit from './model';
const queryOptions = {
    forPartial: [['by', 'by']],
    forDate: 'on',
    forExact: [['objectType', 'objectChangedType'], ['objectChangedId', 'objectChangedId']]
};
export default {
    find: {
        validate: findValidator(schemas.controller.find),
        pre: [
            canView(Audit.collection)
        ],
        handler: buildFindHandler(Audit, request => buildQuery(request, queryOptions))
    }
};
