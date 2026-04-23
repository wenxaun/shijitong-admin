// 部门选择组件
import { useState, useEffect } from 'react';
import Taro from '@tarojs/taro';
import { View, Text, ScrollView } from '@tarojs/components';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { isWework } from '@/utils/env';
import { Building2, ChevronRight } from 'lucide-react-taro';

interface Department {
  id: number;
  name: string;
  parentid: number;
}

interface DepartmentSelectProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (department: { id: number; name: string }) => void;
}

export function DepartmentSelect({
  open,
  onOpenChange,
  onSelect
}: DepartmentSelectProps) {
  const [departments, setDepartments] = useState<Department[]>([]);
  const [loading, setLoading] = useState(false);
  const [path, setPath] = useState<Array<{ id: number; name: string }>>([]);

  useEffect(() => {
    if (open) {
      loadDepartments(null);
    }
  }, [open]);

  // 加载部门列表
  const loadDepartments = async (parentId: number | null) => {
    setLoading(true);

    try {
      const isWeworkEnv = await isWework();

      if (!isWeworkEnv) {
        // 非企业微信环境，使用模拟数据
        const mockDepartments = [
          { id: 1, name: '研发部', parentid: parentId || 0 },
          { id: 2, name: '产品部', parentid: parentId || 0 },
          { id: 3, name: '市场部', parentid: parentId || 0 },
          { id: 4, name: '运营部', parentid: parentId || 0 }
        ];
        setDepartments(mockDepartments);
      } else {
        // 企业微信环境：调用企业微信API
        // @ts-ignore - 企业微信API
        const result = await Taro.qy.getDepartment({
          id: parentId || undefined
        });

        console.log('[DepartmentSelect] 部门列表:', result);

        if (result.errMsg === 'getDepartment:ok') {
          setDepartments(result.department || []);
        } else {
          throw new Error(result.errMsg);
        }
      }
    } catch (error) {
      console.error('[DepartmentSelect] 加载失败:', error);
      Taro.showToast({
        title: '加载失败，请重试',
        icon: 'none'
      });
      
      // 使用模拟数据降级
      setDepartments([
        { id: 1, name: '研发部', parentid: parentId || 0 },
        { id: 2, name: '产品部', parentid: parentId || 0 },
        { id: 3, name: '市场部', parentid: parentId || 0 }
      ]);
    } finally {
      setLoading(false);
    }
  };

  // 进入子部门
  const enterDepartment = (dept: Department) => {
    const newPath = [...path, { id: dept.id, name: dept.name }];
    setPath(newPath);
    loadDepartments(dept.id);
  };

  // 返回上一级
  const goBack = () => {
    if (path.length > 0) {
      const newPath = path.slice(0, -1);
      setPath(newPath);
      
      if (newPath.length === 0) {
        loadDepartments(null);
      } else {
        const parentDept = newPath[newPath.length - 1];
        loadDepartments(parentDept.id);
      }
    }
  };

  // 选择部门
  const handleSelect = (dept: Department) => {
    onSelect(dept);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 size={20} className="text-blue-500" color="#1377EB" />
            选择部门
          </DialogTitle>
        </DialogHeader>

        {/* 面包屑导航 */}
        {path.length > 0 && (
          <View className="flex items-center gap-1 text-sm text-gray-500 mb-3">
            <Text
              className="text-blue-500 cursor-pointer"
              onClick={() => {
                setPath([]);
                loadDepartments(null);
              }}
            >
              全部部门
            </Text>
            {path.map((item, index) => (
              <View key={item.id} className="flex items-center gap-1">
                <ChevronRight size={14} color="#6B7280" />
                <Text className={index === path.length - 1 ? 'text-gray-800 font-medium' : ''}>
                  {item.name}
                </Text>
              </View>
            ))}
          </View>
        )}

        {/* 部门列表 */}
        <ScrollView scrollY className="h-64 border rounded-lg">
          {loading ? (
            <View className="flex items-center justify-center h-full text-gray-400">
              <Text>加载中...</Text>
            </View>
          ) : departments.length === 0 ? (
            <View className="flex items-center justify-center h-full text-gray-400">
              <Text>暂无部门</Text>
            </View>
          ) : (
            departments.map((dept) => (
              <View
                key={dept.id}
                className="flex items-center justify-between px-4 py-3 border-b border-gray-100 hover:bg-gray-50"
              >
                <Text className="text-sm text-gray-700">{dept.name}</Text>
                <View className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => enterDepartment(dept)}
                  >
                    <Text className="text-xs text-blue-500">查看下级</Text>
                  </Button>
                  <Button
                    size="sm"
                    onClick={() => handleSelect(dept)}
                  >
                    <Text className="text-xs">选择</Text>
                  </Button>
                </View>
              </View>
            ))
          )}
        </ScrollView>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => {
              if (path.length > 0) {
                goBack();
              } else {
                onOpenChange(false);
              }
            }}
          >
            {path.length > 0 ? '返回上级' : '取消'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
