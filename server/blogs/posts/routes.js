'use strict';
import {flattenDeep} from 'lodash';
import {buildRESTRoutes, buildRoutesForMethods} from './../../common/routes';
import Controller from './controller';
const routes = flattenDeep([
    buildRESTRoutes('posts', Controller, '/blogs/{blogId}'),
    buildRESTRoutes('posts', Controller),
    buildRoutesForMethods(['publish', 'reject'], 'posts', Controller, '/blogs/{blogId}'),
    buildRoutesForMethods(['publish', 'reject'], 'posts', Controller)
]);
export default routes;
