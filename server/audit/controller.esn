'use strict';
import {buildQueryForPartialMatch, buildQueryForDateRange, buildQueryForExactMatch} from './../common/utils';
import {canView, findValidator} from './../common/prereqs';
import {buildFindHandler} from './../common/handlers';
import schemas from './schemas';
import Audit from './model';

export default {
    find: {
        validate: findValidator(schemas.controller.find),
        pre: [
            canView(Audit.collection)
        ],
        handler: buildFindHandler(Audit, request => {
            let query = buildQueryForPartialMatch({}, request, [['by', 'by']]);
            query = buildQueryForDateRange(query, request, 'on');
            query = buildQueryForExactMatch(query, request, [['objectType', 'objectChangedType'], ['objectChangedId', 'objectChangedId']]);
            return query;
        })
    }
};
