export default typeof definePageConfig === 'function'
  ? definePageConfig({
      navigationBarTitleText: '加入团队'
    })
  : {
      navigationBarTitleText: '加入团队'
    };
