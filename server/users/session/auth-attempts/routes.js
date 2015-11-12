'use strict';
import {buildRESTRoutes} from './../../../common/routes';
import Controller from './controller';
const routes = buildRESTRoutes('auth-attempts', Controller);
export default routes;
