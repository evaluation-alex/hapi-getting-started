'use strict';
import {flattenDeep} from 'lodash';
import {buildRESTRoutes, buildRoute} from './../../common/routes';
import Controller from './controller';
const routes = flattenDeep([
    buildRESTRoutes('posts', Controller, '/blogs/{blogId}'),
    buildRESTRoutes('posts', Controller),
    ['publish', 'reject'].map(action => {
        return [
            buildRoute('PUT', '/blogs/{blogId}/posts/{id}/' + action, Controller[action]),
            buildRoute('PUT', '/posts/{id}/' + action, Controller[action])
        ];
    })
]);
export default routes;
