'use strict';
import {buildRoute} from './../../common/routes';
import Controller from './controller';
let routes = [
    buildRoute('POST', '/session', Controller.login, false),
    buildRoute('DELETE', '/session', Controller.logout)
];
export default routes;
