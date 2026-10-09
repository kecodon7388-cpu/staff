// CE Staff – Expo SDK 52. babel-preset-expo đã gồm sẵn plugin cho react-native-reanimated/JSX,
// không thêm plugin native nào khác.
module.exports = function (api) {
  api.cache(true);
  return { presets: ['babel-preset-expo'] };
};
