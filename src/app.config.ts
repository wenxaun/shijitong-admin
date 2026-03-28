export default defineAppConfig({
  pages: [
    'pages/splash/index',
    'pages/index/index',
    'pages/create/index',
    'pages/team/index',
    'pages/profile/index',
    'pages/review/index',
    'pages/detail/index',
    'pages/edit/index',
    'pages/exception/index',
    'pages/settings/index',
    'pages/history/index',
    'pages/team-edit/index',
    'pages/team-join/index',
    'pages/weekly/index',
    'pages/stats/index',
    'pages/login/index',
    'pages/org-create/index',
    'pages/dept-manage/index',
    'pages/team-manage/index',
    'pages/subtask-manage/index',
    'pages/subtask-create/index',
    'pages/subtask-detail/index',
    'pages/subtask-flow/index',
    'pages/subtask-edit/index'
  ],
  window: {
    backgroundTextStyle: 'dark',
    navigationBarBackgroundColor: '#1377EB',
    navigationBarTitleText: '事绩通',
    navigationBarTextStyle: 'white',
    backgroundColor: '#F5F7FA'
  },
  // 移除全局 Skyline 配置，改为在需要高性能渲染的页面单独配置
  lazyCodeLoading: 'requiredComponents',
  // 引用 WeUI 扩展库，不占用小程序包体积
  useExtendedLib: {
    weui: true
  },
  tabBar: {
    color: '#666666',
    selectedColor: '#1377EB',
    backgroundColor: '#FFFFFF',
    borderStyle: 'black',
    list: [
      {
        pagePath: 'pages/index/index',
        text: '任务',
        iconPath: './assets/tabbar/clipboard-list.png',
        selectedIconPath: './assets/tabbar/clipboard-list-active.png'
      },
      {
        pagePath: 'pages/create/index',
        text: '发布',
        iconPath: './assets/tabbar/plus-circle.png',
        selectedIconPath: './assets/tabbar/plus-circle-active.png'
      },
      {
        pagePath: 'pages/team/index',
        text: '团队',
        iconPath: './assets/tabbar/users.png',
        selectedIconPath: './assets/tabbar/users-active.png'
      },
      {
        pagePath: 'pages/profile/index',
        text: '我的',
        iconPath: './assets/tabbar/user.png',
        selectedIconPath: './assets/tabbar/user-active.png'
      }
    ]
  }
})
