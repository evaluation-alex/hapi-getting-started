'use strict';
import {flatten} from 'lodash';
import {buildRESTRoutes, buildJoinApproveRejectLeaveRoutes} from './../common/routes';
import Controller from './controller';
let routes = flatten([
    buildRESTRoutes('blogs', Controller),
    buildJoinApproveRejectLeaveRoutes('blogs', Controller)
]);
export default routes;
