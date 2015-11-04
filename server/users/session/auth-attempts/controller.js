'use strict';
import {merge} from 'lodash';
import {buildQuery} from './../../../common/utils';
import {canView, findValidator} from './../../../common/prereqs';
import {buildFindHandler} from './../../../common/handlers';
import schemas from './schemas';
import AuthAttempts from './model';
export default {
    find: {
        validate: findValidator(schemas.controller.find),
        pre: [
            canView(AuthAttempts.collection)
        ],
        handler: buildFindHandler(AuthAttempts, request => merge({organisation: '*'}, buildQuery(request, schemas.controller.findOptions)))
    }
};
