'use strict';

module.exports = function (environment) {
    const ENV = {
        modulePrefix: 'dummy',
        environment,
        rootURL: '/',
        locationType: 'auto',
        EmberENV: {
            FEATURES: {

            },
            EXTEND_PROTOTYPES: {
                Date: false
            }
        },

        APP: {

        }
    };

    if (environment === 'development') {
        (ENV.APP as any).LOG_RESOLVER = true;
        (ENV.APP as any).LOG_ACTIVE_GENERATION = true;
        (ENV.APP as any).TRANSITIONS = true;
        (ENV.APP as any).TRANSITIONS_INTERNAL = true;
        (ENV.APP as any).LOG_VIEW_LOOKUPS = true;
    }

    if (environment === 'test') {
        ENV.rootURL = '/';
        ENV.locationType = 'none';

        (ENV.APP as any).LOG_ACTIVE_GENERATION = false;
        (ENV.APP as any).LOG_VIEW_LOOKUPS = false;

        (ENV.APP as any).rootElement = '#react-testing';
    }

    if (environment === 'production') {
        ENV.locationType = 'hash';
        ENV.rootURL = '/';

        if (process.env.CDN_URL) {
            (ENV.APP as any).urlprefix = process.env.CDN_URL;
        }
    }

    return ENV;
}