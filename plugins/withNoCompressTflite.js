const { withAppBuildGradle } = require("expo/config-plugins");

/** Prevent AAPT from compressing .tflite files (corrupts the model). */
module.exports = function withNoCompressTflite(config) {
  return withAppBuildGradle(config, (config) => {
    const contents = config.modResults.contents;
    if (!contents.includes('noCompress "tflite"')) {
      config.modResults.contents = contents.replace(
        /android\s*\{/,
        `android {\n    aaptOptions {\n        noCompress "tflite"\n    }`
      );
    }
    return config;
  });
};
