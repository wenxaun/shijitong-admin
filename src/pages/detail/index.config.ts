export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '任务详情' })
  : { navigationBarTitleText: '任务详情' };
