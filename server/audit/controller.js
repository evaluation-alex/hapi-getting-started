'use strict';
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
        handler: buildFindHandler(Audit, schemas.controller.findOptions)
    }
};
