export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '周报' })
  : { navigationBarTitleText: '周报' };
