export default typeof definePageConfig === 'function'
  ? definePageConfig({ navigationBarTitleText: '历史任务' })
  : { navigationBarTitleText: '历史任务' };
