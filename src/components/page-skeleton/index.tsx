import { View } from '@tarojs/components'
import { memo } from 'react'

interface PageSkeletonProps {
  type?: 'list' | 'detail' | 'card' | 'profile' | 'custom'
  rows?: number
  showHeader?: boolean
  showTabs?: boolean
}

const shimmerAnimation = `
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`

const SkeletonItem = ({ height = 16, width = '100%', className = '' }: {
  height?: number
  width?: string | number
  className?: string
}) => (
  <View 
    className={`rounded ${className}`}
    style={{
      height,
      width: typeof width === 'number' ? width : width,
      background: 'linear-gradient(90deg, #f0f0f0 25%, #e0e0e0 50%, #f0f0f0 75%)',
      backgroundSize: '200% 100%',
      animation: 'shimmer 1.5s infinite'
    }}
  />
)

const ListSkeleton = ({ rows = 5 }: { rows?: number }) => (
  <View className="px-4 py-3">
    {Array.from({ length: rows }).map((_, i) => (
      <View key={i} className="bg-white rounded-lg p-4 mb-3">
        <View className="flex items-center mb-3">
          <SkeletonItem height={40} width={40} className="mr-3" />
          <View className="flex-1">
            <SkeletonItem height={16} width="60%" className="mb-2" />
            <SkeletonItem height={12} width="40%" />
          </View>
        </View>
        <SkeletonItem height={14} width="80%" className="mb-2" />
        <SkeletonItem height={14} width="50%" />
      </View>
    ))}
  </View>
)

const DetailSkeleton = () => (
  <View className="px-4 py-4">
    <View className="bg-white rounded-lg p-4 mb-4">
      <SkeletonItem height={24} width="70%" className="mb-4" />
      <View className="flex items-center mb-3">
        <SkeletonItem height={32} width={32} className="mr-2" />
        <SkeletonItem height={14} width={120} />
      </View>
      <View className="h-px bg-gray-100 my-4" />
      <SkeletonItem height={16} width="100%" className="mb-2" />
      <SkeletonItem height={16} width="100%" className="mb-2" />
      <SkeletonItem height={16} width="60%" />
    </View>
    <View className="bg-white rounded-lg p-4">
      <SkeletonItem height={18} width="40%" className="mb-3" />
      {Array.from({ length: 3 }).map((_, i) => (
        <View key={i} className="flex items-center py-2">
          <SkeletonItem height={14} width="50%" className="mr-2" />
          <SkeletonItem height={14} width={80} />
        </View>
      ))}
    </View>
  </View>
)

const CardSkeleton = () => (
  <View className="px-4 py-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <View key={i} className="bg-white rounded-lg p-4 mb-3">
        <SkeletonItem height={18} width="40%" className="mb-3" />
        <View className="flex justify-between">
          <SkeletonItem height={48} width="30%" />
          <SkeletonItem height={48} width="30%" />
          <SkeletonItem height={48} width="30%" />
        </View>
      </View>
    ))}
  </View>
)

const ProfileSkeleton = () => (
  <View>
    <View className="bg-white px-4 py-6 mb-2">
      <View className="flex items-center">
        <SkeletonItem height={64} width={64} className="rounded-full mr-4" />
        <View className="flex-1">
          <SkeletonItem height={20} width="50%" className="mb-2" />
          <SkeletonItem height={14} width="30%" />
        </View>
      </View>
    </View>
    {Array.from({ length: 4 }).map((_, i) => (
      <View key={i} className="bg-white mb-2">
        {Array.from({ length: 2 }).map((_, j) => (
          <View key={j} className="flex items-center px-4 py-3">
            <SkeletonItem height={20} width={20} className="mr-3" />
            <SkeletonItem height={16} width="40%" />
          </View>
        ))}
      </View>
    ))}
  </View>
)

const PageSkeleton = memo(({ type = 'list', rows = 5, showHeader = true, showTabs = false }: PageSkeletonProps) => {
  return (
    <View className="min-h-screen bg-gray-100">
      <View style={{ display: 'none' }}>
        <View dangerouslySetInnerHTML={{ __html: `<style>${shimmerAnimation}</style>` }} />
      </View>
      
      {showHeader && (
        <View className="bg-white px-4 py-3 mb-2 flex items-center">
          <SkeletonItem height={20} width={120} />
        </View>
      )}
      
      {showTabs && (
        <View className="bg-white flex px-4 py-3 mb-2">
          {Array.from({ length: 3 }).map((_, i) => (
            <View key={i} className="flex-1 flex justify-center">
              <SkeletonItem height={16} width={60} />
            </View>
          ))}
        </View>
      )}
      
      {type === 'list' && <ListSkeleton rows={rows} />}
      {type === 'detail' && <DetailSkeleton />}
      {type === 'card' && <CardSkeleton />}
      {type === 'profile' && <ProfileSkeleton />}
    </View>
  )
})

PageSkeleton.displayName = 'PageSkeleton'

export default PageSkeleton
