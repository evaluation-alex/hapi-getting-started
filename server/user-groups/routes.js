'use strict';
import {flatten} from 'lodash';
import {buildRESTRoutes, buildJoinApproveRejectLeaveRoutes} from './../common/routes';
import Controller from './controller';
let routes = flatten([
    buildRESTRoutes('user-groups', Controller),
    buildJoinApproveRejectLeaveRoutes('user-groups', Controller)
]);
export default routes;
