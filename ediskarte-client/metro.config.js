const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const config = getDefaultConfig(__dirname);

const rnWebPlatform = path.dirname(require.resolve('react-native-web/package.json'));
const legacyMockPath = path.join(__dirname, 'scripts', 'legacyMock.js');

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (platform === 'web') {
    if (
      moduleName.includes('legacySendAccessibilityEvent') ||
      moduleName.includes('RawEventEmitter') ||
      moduleName.includes('PlatformColorValueTypes')
    ) {
      return {
        filePath: legacyMockPath,
        type: 'sourceFile',
      };
    }

    if (
      moduleName.endsWith('Utilities/Platform') ||
      moduleName === './Platform'
    ) {
      return {
        filePath: path.join(rnWebPlatform, 'dist', 'exports', 'Platform', 'index.js'),
        type: 'sourceFile',
      };
    }

    if (
      moduleName.endsWith('ReactNative/PaperUIManager')
    ) {
      return {
        filePath: path.join(rnWebPlatform, 'dist', 'exports', 'UIManager', 'index.js'),
        type: 'sourceFile',
      };
    }
  }

  return context.resolveRequest(context, moduleName, platform);
};

module.exports = config;
