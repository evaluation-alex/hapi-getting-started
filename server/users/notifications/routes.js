'use strict';
import {buildRESTRoutes} from './../../common/routes';
import Controller from './controller';
const routes = buildRESTRoutes('notifications', Controller);
export default routes;
