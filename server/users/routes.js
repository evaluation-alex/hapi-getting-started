'use strict';
import {flatten} from 'lodash';
import {buildRESTRoutes, buildRoute} from './../common/routes';
import Controller from './controller';
const routes = flatten([
    buildRESTRoutes('users', Controller),
    buildRoute('POST', '/users/signup', Controller.signup, false),
    buildRoute('PUT', '/users/forgot', Controller.forgot, false),
    buildRoute('PUT', '/users/reset', Controller.reset, false)
]);
export default routes;
