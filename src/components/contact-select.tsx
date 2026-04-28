// 企业联系人选择组件
import { useState } from 'react';
import Taro from '@tarojs/taro';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { isWework } from '@/utils/env';
import { Building2 } from 'lucide-react-taro';

interface ContactSelectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (users: Array<{ userid: string; name: string; avatar?: string }>) => void;
  mode?: 'single' | 'multi';
  type?: Array<'user' | 'department'>;
}

export function ContactSelect({
  open,
  onOpenChange,
  onSelect,
  mode = 'single',
  type = ['user']
}: ContactSelectProps) {
  const [loading, setLoading] = useState(false);

  const handleSelect = async () => {
    setLoading(true);

    try {
      // 检测是否企业微信环境
      const isWeworkEnv = await isWework();

      if (!isWeworkEnv) {
        Taro.showToast({
          title: '此功能仅支持企业微信',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 检查企业微信 API 是否可用
      // @ts-ignore
      if (!Taro.qy || !Taro.qy.selectEnterpriseContact) {
        Taro.showToast({
          title: '当前环境不支持企业通讯录',
          icon: 'none',
          duration: 2000
        });
        return;
      }

      // 调用企业微信联系人选择接口
      // @ts-ignore - 企业微信API
      const result = await Taro.qy.selectEnterpriseContact({
        fromDepartmentId: 0,    // 0表示从根部门开始
        mode: mode === 'single' ? 'single' : 'multi',
        type: type,              // user: 用户, department: 部门
        selectedUserIds: [],     // 已选用户ID列表
        selectedDepartmentIds: [] // 已选部门ID列表
      });

      console.log('[ContactSelect] 选择结果:', result);

      if (result.errMsg === 'selectEnterpriseContact:ok') {
        // 解析选择结果
        const selectedUsers = result.result.userList || [];
        
        if (selectedUsers.length > 0) {
          onSelect(selectedUsers);
          onOpenChange(false);
        } else {
          Taro.showToast({
            title: '请选择联系人',
            icon: 'none'
          });
        }
      } else {
        throw new Error(result.errMsg);
      }
    } catch (error) {
      console.error('[ContactSelect] 选择失败:', error);
      Taro.showToast({
        title: '选择失败，请重试',
        icon: 'none'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 size={20} className="text-blue-500" color="#1377EB" />
            选择企业联系人
          </DialogTitle>
        </DialogHeader>

        <div className="py-6">
          <div className="flex items-start gap-3 bg-blue-50 p-4 rounded-lg">
            <Building2 size={20} className="text-blue-500 mt-1" color="#1377EB" />
            <div className="flex-1">
              <p className="text-sm text-gray-700 font-medium mb-1">
                选择企业成员
              </p>
              <p className="text-xs text-gray-500 leading-relaxed">
                点击下方按钮打开企业联系人选择器，选择您要分配任务的企业成员。
              </p>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            取消
          </Button>
          <Button onClick={handleSelect} disabled={loading}>
            {loading ? '打开中...' : '选择联系人'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
