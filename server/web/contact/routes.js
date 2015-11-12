'use strict';
import {buildRoute} from './../../common/routes';
import Controller from './controller';
const routes = [
    buildRoute('POST', '/contact', Controller.contact, false)
];
export default routes;
