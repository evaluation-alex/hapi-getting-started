'use strict';
import {flatten} from 'lodash';
import {buildRESTRoutes, buildRoutesForMethods} from './../common/routes';
import Controller from './controller';
const routes = flatten([
    buildRESTRoutes('user-groups', Controller),
    buildRoutesForMethods(['join', 'approve', 'reject', 'leave'], 'user-groups', Controller)
]);
export default routes;
