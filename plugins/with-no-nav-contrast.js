const { withAndroidStyles } = require('@expo/config-plugins');

module.exports = function withNoNavContrast(config) {
  return withAndroidStyles(config, (c) => {
    const appTheme = c.modResults.resources.style.find((s) => s.$.name === 'AppTheme');
    if (appTheme) {
      appTheme.item = (appTheme.item ?? []).filter(
        (i) => i.$.name !== 'android:enforceNavigationBarContrast'
      );
      appTheme.item.push({
        $: { name: 'android:enforceNavigationBarContrast' },
        _: 'false',
      });
    }
    return c;
  });
};