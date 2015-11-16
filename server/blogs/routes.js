'use strict';
import {flatten} from 'lodash';
import {buildRESTRoutes, buildRoutesForMethods} from './../common/routes';
import Controller from './controller';
const routes = flatten([
    buildRESTRoutes('blogs', Controller),
    buildRoutesForMethods(['join', 'approve', 'reject', 'leave'], 'blogs', Controller)
]);
export default routes;
