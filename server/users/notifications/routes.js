'use strict';
import {buildRESTRoutes} from './../../common/routes';
import Controller from './controller';
let routes = buildRESTRoutes('notifications', Controller);
export default routes;
