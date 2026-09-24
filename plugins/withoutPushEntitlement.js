const { withEntitlementsPlist } = require('expo/config-plugins');

// expo-notifications adds the push entitlement automatically. Dwell only
// schedules local notifications, and a free Apple ID (Personal Team) can't
// sign an app that has it, so strip it.
module.exports = function withoutPushEntitlement(config) {
  return withEntitlementsPlist(config, (config) => {
    delete config.modResults['aps-environment'];
    return config;
  });
};
