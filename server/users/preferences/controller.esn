'use strict';
import {canUpdate, prePopulate, onlyOwner} from './../../common/prereqs';
import {buildUpdateHandler} from './../../common/handlers';
import Users from './../model';
import schemas from './schemas';
export default {
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Users.collection),
            prePopulate(Users, 'id'),
            onlyOwner(Users)
        ],
        handler: buildUpdateHandler(Users, schemas.dao.updateMethod.method)
    }
};
