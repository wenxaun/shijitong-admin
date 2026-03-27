export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '提醒设置' })
  : { navigationBarTitleText: '提醒设置' };
