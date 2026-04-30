import { View } from '@tarojs/components'
import { useState, useEffect, ReactNode } from 'react'
import PageSkeleton from '@/components/page-skeleton'

interface PageLoaderProps {
  children: ReactNode
  loading?: boolean
  skeletonType?: 'list' | 'detail' | 'card' | 'profile'
  skeletonRows?: number
  delay?: number
  minLoadingTime?: number
}

export default function PageLoader({
  children,
  loading = false,
  skeletonType = 'list',
  skeletonRows = 5,
  delay = 200,
  minLoadingTime = 500
}: PageLoaderProps) {
  const [showSkeleton, setShowSkeleton] = useState(true)
  const [loadingStartTime, setLoadingStartTime] = useState<number | null>(null)

  useEffect(() => {
    if (loading) {
      setLoadingStartTime(Date.now())
      const timer = setTimeout(() => {
        setShowSkeleton(true)
      }, delay)
      return () => clearTimeout(timer)
    } else {
      if (loadingStartTime) {
        const elapsed = Date.now() - loadingStartTime
        const remainingTime = Math.max(0, minLoadingTime - elapsed)
        const timer = setTimeout(() => {
          setShowSkeleton(false)
        }, remainingTime)
        return () => clearTimeout(timer)
      } else {
        setShowSkeleton(false)
      }
    }
  }, [loading, delay, minLoadingTime, loadingStartTime])

  useEffect(() => {
    setLoadingStartTime(Date.now())
    const timer = setTimeout(() => {
      setShowSkeleton(false)
    }, delay)
    return () => clearTimeout(timer)
  }, [])

  if (showSkeleton) {
    return <PageSkeleton type={skeletonType} rows={skeletonRows} showHeader={false} />
  }

  return <View className="page-content animate-fade-in">{children}</View>
}
