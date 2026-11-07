module.exports = ({ config }) => {
  const isDev = process.env.APP_VARIANT === 'development';
  return {
    ...config,
    name: isDev ? 'Central Dev' : config.name,
    scheme: isDev ? 'frontend-dev' : config.scheme,
    android: {
      ...config.android,
      package: isDev ? `${config.android.package}.dev` : config.android.package,
    },
    ios: {
      ...config.ios,
      bundleIdentifier: isDev ? `${config.ios.bundleIdentifier}.dev` : config.ios.bundleIdentifier,
    },
  };
};