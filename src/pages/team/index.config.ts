export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '我的团队' })
  : { navigationBarTitleText: '我的团队' };
