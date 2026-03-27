import { useLaunch, getEnv, ENV_TYPE } from '@tarojs/taro';
import { PropsWithChildren } from 'react';
import { injectH5Styles } from './h5-styles';
import { devDebug } from './dev-debug';
import { H5Container } from './h5-container';
import {
  H5ErrorBoundary,
  initializeH5ErrorHandling,
} from './h5-error-boundary';
import { IS_H5_ENV } from './env';

// 云开发环境 ID
const CLOUD_ENV = 'cloud1-3g7j95ax4a0f4a3f';

export const Preset = ({ children }: PropsWithChildren) => {
  if (IS_H5_ENV) {
    initializeH5ErrorHandling();
  }

  useLaunch(() => {
    devDebug();
    injectH5Styles();
    
    // 【关键修复】在小程序启动时初始化云开发
    // 官方文档要求：https://developers.weixin.qq.com/miniprogram/dev/wxcloudservice/wxcloud/guide/functions/getting-started.html
    if (getEnv() === ENV_TYPE.WEAPP) {
      // @ts-ignore
      if (wx && wx.cloud) {
        // @ts-ignore
        wx.cloud.init({
          env: CLOUD_ENV,
          traceUser: true
        });
        console.log('[App] 云开发初始化成功，环境:', CLOUD_ENV);
      } else {
        console.error('[App] wx.cloud 不存在，请检查云开发配置');
      }
    }
  });

  if (IS_H5_ENV) {
    return (
      <H5ErrorBoundary>
        <H5Container>{children}</H5Container>
      </H5ErrorBoundary>
    );
  }

  return <>{children}</>;
};
