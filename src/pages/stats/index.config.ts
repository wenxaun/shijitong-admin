export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '数据统计' })
  : { navigationBarTitleText: '数据统计' };
