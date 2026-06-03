const { getDefaultConfig } = require("expo/metro-config");
const { withNativeWind } = require("nativewind/metro");
const exclusionList = require("metro-config/private/defaults/exclusionList").default;

const config = getDefaultConfig(__dirname);

config.resolver.blockList = exclusionList([
  /backend\/venv\/.*/,
  /backend\/.*__pycache__\/.*/,
  /docs\/.*/,
]);

module.exports = withNativeWind(config, { input: "./global.css" });
