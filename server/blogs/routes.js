'use strict';
import {flatten} from 'lodash';
import {buildRESTRoutes, buildJoinApproveRejectLeaveRoutes} from './../common/routes';
import Controller from './controller';
const routes = flatten([
    buildRESTRoutes('blogs', Controller),
    buildJoinApproveRejectLeaveRoutes('blogs', Controller)
]);
export default routes;
