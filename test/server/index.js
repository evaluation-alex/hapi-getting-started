'use strict';

const tests = {
    './z/prep': true,
    './audit/controller': true,
    './common/auth': true,
    './common/mailer': true,
    './roles/model': true,
    './users/model': true,
    './users/controller': true,
    './session/model': true,
    './session/controller': true,
    './auth-attempts/model': true,
    './auth-attempts/controller': true,
    './preferences/model': true,
    './preferences/controller': true,
    './profile/model': true,
    './profile/controller': true,
    './notifications/model': true,
    './notifications/controller': true,
    './user-groups/model': true,
    './user-groups/controller': true,
    './blogs/model': true,
    './blogs/controller': true,
    './posts/model': true,
    './posts/controller': true,
    './contact/controller': true,
    './common/metrics': true,
    './common/utils': true,
    './z/clean': true,
    './z/utils': true,
    './z/perf': true
};
Object.keys(tests).map(key => tests[key] ? key : undefined).filter(file => !!file).map(require);