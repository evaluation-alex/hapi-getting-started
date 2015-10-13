'use strict';
import {flatten} from 'lodash';
import {buildQueryForPartialMatch, buildQueryForDateRange, by, user, hasItems} from './../../common/utils';
import {findValidator, canView, canUpdate, prePopulate, onlyOwner} from './../../common/prereqs';
import {buildFindHandler, buildUpdateHandler} from './../../common/handlers';
import {i18n} from './../../common/posthandlers';
import schemas from './schemas';
import Notifications from './model';

export default {
    find: {
        validate: findValidator(schemas.controller.find),
        pre: [
            canView(Notifications.collection)
        ],
        handler: buildFindHandler(Notifications, request => {
            let query = buildQueryForPartialMatch({}, request, [['state', 'state'], ['objectType', 'objectType']]);
            query = buildQueryForDateRange(query, request, 'createdOn');
            query.email = by(request);
            const prefs = user(request).preferences;
            const blocked = flatten([
                prefs.notifications.blogs.blocked,
                prefs.notifications.posts.blocked,
                prefs.notifications.userGroups.blocked
            ]);
            if (hasItems(blocked)) {
                query.objectId = {$nin: blocked};
            }
            return query;
        }),
        post: [
            i18n()
        ]
    },
    update: {
        validate: schemas.controller.update,
        pre: [
            canUpdate(Notifications.collection),
            prePopulate(Notifications, 'id'),
            onlyOwner(Notifications)
        ],
        handler: buildUpdateHandler(Notifications, schemas.dao.updateMethod.method)
    }
};
