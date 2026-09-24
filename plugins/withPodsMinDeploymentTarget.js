const { withPodfile } = require('expo/config-plugins');

// Xcode 27 rejects deployment targets below iOS 15, but some pods (e.g.
// AsyncStorage's resource bundle) still declare 13.4. Raise any pod target
// below the app's 15.1 minimum.
const MARKER = '# withPodsMinDeploymentTarget';
const SNIPPET = `
    ${MARKER}
    installer.pods_project.targets.each do |target|
      target.build_configurations.each do |bc|
        if bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'].to_f < 15.1
          bc.build_settings['IPHONEOS_DEPLOYMENT_TARGET'] = '15.1'
        end
      end
    end`;

module.exports = function withPodsMinDeploymentTarget(config) {
  return withPodfile(config, (config) => {
    const podfile = config.modResults;
    if (!podfile.contents.includes(MARKER)) {
      podfile.contents = podfile.contents.replace(
        /post_install do \|installer\|/,
        (match) => match + SNIPPET,
      );
    }
    return config;
  });
};
