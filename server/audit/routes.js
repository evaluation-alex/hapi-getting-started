'use strict';
import {buildRESTRoutes} from './../common/routes';
import Controller from './controller';
const routes = buildRESTRoutes('audit', Controller);
export default routes;
