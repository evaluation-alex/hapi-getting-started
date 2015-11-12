'use strict';
import {flatten} from 'lodash';
import {buildRESTRoutes, buildJoinApproveRejectLeaveRoutes} from './../common/routes';
import Controller from './controller';
const routes = flatten([
    buildRESTRoutes('user-groups', Controller),
    buildJoinApproveRejectLeaveRoutes('user-groups', Controller)
]);
export default routes;
