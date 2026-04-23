/**
 * 企业微信API类型声明
 */

import 'taro';

declare module 'taro' {
  namespace Taro {
    namespace qy {
      // 选择企业联系人
      function selectEnterpriseContact(options: {
        fromDepartmentId?: number;
        mode: 'single' | 'multi';
        type: Array<'user' | 'department'>;
        selectedUserIds?: string[];
        selectedDepartmentIds?: number[];
      }): Promise<{
        errMsg: string;
        result: {
          userList?: Array<{
            userid: string;
            name: string;
            avatar?: string;
          }>;
          departmentList?: Array<{
            id: number;
            name: string;
          }>;
        };
      }>;

      // 获取部门列表
      function getDepartment(options?: {
        id?: number;
      }): Promise<{
        errMsg: string;
        department?: Array<{
          id: number;
          name: string;
          parentid: number;
        }>;
      }>;
    }
  }
}

export {};
