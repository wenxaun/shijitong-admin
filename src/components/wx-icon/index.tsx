import { View, Image, Text } from '@tarojs/components'
import Taro from '@tarojs/taro'
import { memo } from 'react'

export type WxIconName =
  | 'home'
  | 'home-fill'
  | 'team'
  | 'team-fill'
  | 'user'
  | 'user-fill'
  | 'task'
  | 'task-fill'
  | 'calendar'
  | 'calendar-fill'
  | 'chart'
  | 'chart-fill'
  | 'setting'
  | 'setting-fill'
  | 'bell'
  | 'bell-fill'
  | 'search'
  | 'search-fill'
  | 'add'
  | 'add-fill'
  | 'edit'
  | 'edit-fill'
  | 'delete'
  | 'delete-fill'
  | 'close'
  | 'close-fill'
  | 'check'
  | 'check-fill'
  | 'arrow-right'
  | 'arrow-left'
  | 'arrow-up'
  | 'arrow-down'
  | 'more'
  | 'more-fill'
  | 'share'
  | 'share-fill'
  | 'star'
  | 'star-fill'
  | 'heart'
  | 'heart-fill'
  | 'location'
  | 'location-fill'
  | 'phone'
  | 'phone-fill'
  | 'camera'
  | 'camera-fill'
  | 'image'
  | 'image-fill'
  | 'file'
  | 'file-fill'
  | 'folder'
  | 'folder-fill'
  | 'time'
  | 'time-fill'
  | 'lock'
  | 'lock-fill'
  | 'unlock'
  | 'unlock-fill'
  | 'warning'
  | 'warning-fill'
  | 'info'
  | 'info-fill'
  | 'success'
  | 'success-fill'
  | 'error'
  | 'error-fill'
  | 'question'
  | 'question-fill'
  | 'refresh'
  | 'refresh-fill'
  | 'download'
  | 'download-fill'
  | 'upload'
  | 'upload-fill'
  | 'link'
  | 'link-fill'
  | 'shield'
  | 'shield-fill'
  | 'building'
  | 'building-fill'
  | 'voice'
  | 'voice-fill'
  | 'video'
  | 'video-fill'
  | 'money'
  | 'money-fill'
  | 'gift'
  | 'gift-fill'
  | 'scan'
  | 'scan-fill'
  | 'filter'
  | 'filter-fill'
  | 'sort'
  | 'sort-fill'
  | 'tag'
  | 'tag-fill'
  | 'flag'
  | 'flag-fill'
  | 'eye'
  | 'eye-fill'
  | 'eye-off'
  | 'eye-off-fill'
  | 'chevron-right'
  | 'chevron-left'
  | 'chevron-up'
  | 'chevron-down'
  | 'logout'
  | 'logout-fill'
  | 'clipboard'
  | 'clipboard-fill'
  | 'trash'
  | 'trash-fill'
  | 'pencil'
  | 'pencil-fill'

interface WxIconProps {
  name: WxIconName
  size?: number
  color?: string
  className?: string
  style?: React.CSSProperties
}

const WX_ICON_SVG: Record<WxIconName, string> = {
  'home': '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'home-fill': '<path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" fill="currentColor"/>',
  'team': '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'team-fill': '<path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2M9 11a4 4 0 100-8 4 4 0 000 8zM23 21v-2a4 4 0 00-3-3.87M16 3.13a4 4 0 010 7.75" fill="currentColor"/>',
  'user': '<path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2M12 11a4 4 0 100-8 4 4 0 000 8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'user-fill': '<circle cx="12" cy="8" r="4" fill="currentColor"/><path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" fill="currentColor"/>',
  'task': '<path d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'task-fill': '<path d="M6 4h12a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2z" fill="currentColor"/><path d="M9 12l2 2 4-4" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'calendar': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="16" y1="2" x2="16" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="2" x2="8" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="3" y1="10" x2="21" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'calendar-fill': '<rect x="3" y="4" width="18" height="18" rx="2" ry="2" fill="currentColor"/><rect x="3" y="4" width="18" height="6" fill="currentColor" opacity="0.3"/>',
  'chart': '<line x1="18" y1="20" x2="18" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="20" x2="12" y2="4" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="20" x2="6" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'chart-fill': '<rect x="3" y="10" width="4" height="10" rx="1" fill="currentColor"/><rect x="10" y="4" width="4" height="16" rx="1" fill="currentColor"/><rect x="17" y="8" width="4" height="12" rx="1" fill="currentColor"/>',
  'setting': '<circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 010 2.83 2 2 0 01-2.83 0l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-2 2 2 2 0 01-2-2v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83 0 2 2 0 010-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 01-2-2 2 2 0 012-2h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 010-2.83 2 2 0 012.83 0l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 012-2 2 2 0 012 2v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 0 2 2 0 010 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 012 2 2 2 0 01-2 2h-.09a1.65 1.65 0 00-1.51 1z" fill="none" stroke="currentColor" stroke-width="2"/>',
  'setting-fill': '<path d="M12 15a3 3 0 100-6 3 3 0 000 6z" fill="currentColor"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 11-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 11-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 11-2.83-2.83l.06-.06a1.65 1.65 0 00.33-1.82 1.65 1.65 0 00-1.51-1H3a2 2 0 110-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 112.83-2.83l.06.06a1.65 1.65 0 001.82.33H9a1.65 1.65 0 001-1.51V3a2 2 0 114 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 112.83 2.83l-.06.06a1.65 1.65 0 00-.33 1.82V9a1.65 1.65 0 001.51 1H21a2 2 0 110 4h-.09a1.65 1.65 0 00-1.51 1z" fill="currentColor"/>',
  'bell': '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'bell-fill': '<path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9M13.73 21a2 2 0 01-3.46 0" fill="currentColor"/>',
  'search': '<circle cx="11" cy="11" r="8" fill="none" stroke="currentColor" stroke-width="2"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'search-fill': '<circle cx="11" cy="11" r="8" fill="currentColor"/><line x1="21" y1="21" x2="16.65" y2="16.65" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'add': '<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'add-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><line x1="12" y1="7" x2="12" y2="17" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="7" y1="12" x2="17" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  'edit': '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'edit-fill': '<path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill="currentColor"/>',
  'delete': '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'delete-fill': '<path d="M3 6h18v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6zM8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="currentColor"/>',
  'close': '<line x1="18" y1="6" x2="6" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="6" y1="6" x2="18" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'close-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><line x1="15" y1="9" x2="9" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  'check': '<polyline points="20 6 9 17 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'check-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><polyline points="16 6 10 12 8 10" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'arrow-right': '<line x1="5" y1="12" x2="19" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="12 5 19 12 12 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'arrow-left': '<line x1="19" y1="12" x2="5" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="12 19 5 12 12 5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'arrow-up': '<line x1="12" y1="19" x2="12" y2="5" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="5 12 12 5 19 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'arrow-down': '<line x1="12" y1="5" x2="12" y2="19" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><polyline points="19 12 12 19 5 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'more': '<circle cx="12" cy="12" r="1" fill="currentColor"/><circle cx="19" cy="12" r="1" fill="currentColor"/><circle cx="5" cy="12" r="1" fill="currentColor"/>',
  'more-fill': '<circle cx="12" cy="12" r="2" fill="currentColor"/><circle cx="19" cy="12" r="2" fill="currentColor"/><circle cx="5" cy="12" r="2" fill="currentColor"/>',
  'share': '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'share-fill': '<path d="M4 12v8a2 2 0 002 2h12a2 2 0 002-2v-8M16 6l-4-4-4 4M12 2v13" fill="currentColor"/>',
  'star': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'star-fill': '<polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" fill="currentColor"/>',
  'heart': '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'heart-fill': '<path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" fill="currentColor"/>',
  'location': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="10" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
  'location-fill': '<path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" fill="currentColor"/><circle cx="12" cy="10" r="3" fill="white"/>',
  'phone': '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'phone-fill': '<path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07 19.5 19.5 0 01-6-6 19.79 19.79 0 01-3.07-8.67A2 2 0 014.11 2h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L8.09 9.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 16.92z" fill="currentColor"/>',
  'camera': '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="13" r="4" fill="none" stroke="currentColor" stroke-width="2"/>',
  'camera-fill': '<path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" fill="currentColor"/><circle cx="12" cy="13" r="4" fill="white"/>',
  'image': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><polyline points="21 15 16 10 5 21" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'image-fill': '<rect x="3" y="3" width="18" height="18" rx="2" ry="2" fill="currentColor"/><circle cx="8.5" cy="8.5" r="1.5" fill="white"/>',
  'file': '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="14 2 14 8 20 8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'file-fill': '<path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" fill="currentColor"/><polyline points="14 2 14 8 20 8" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'folder': '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'folder-fill': '<path d="M22 19a2 2 0 01-2 2H4a2 2 0 01-2-2V5a2 2 0 012-2h5l2 3h9a2 2 0 012 2z" fill="currentColor"/>',
  'time': '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="12 6 12 12 16 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'time-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><polyline points="12 6 12 12 16 14" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'lock': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'lock-fill': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="currentColor"/><path d="M7 11V7a5 5 0 0110 0v4" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'unlock': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M7 11V7a5 5 0 019.9-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'unlock-fill': '<rect x="3" y="11" width="18" height="11" rx="2" ry="2" fill="currentColor"/><path d="M7 11V7a5 5 0 019.9-1" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'warning': '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="9" x2="12" y2="13" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'warning-fill': '<path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" fill="currentColor"/><line x1="12" y1="9" x2="12" y2="13" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  'info': '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="12" y1="16" x2="12" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'info-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><line x1="12" y1="16" x2="12" y2="12" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="12" y1="8" x2="12.01" y2="8" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  'success': '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><polyline points="16 6 10 12 8 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'success-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><polyline points="16 6 10 12 8 10" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'error': '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><line x1="15" y1="9" x2="9" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'error-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><line x1="15" y1="9" x2="9" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/><line x1="9" y1="9" x2="15" y2="15" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  'question': '<circle cx="12" cy="12" r="10" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'question-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><path d="M9.09 9a3 3 0 015.83 1c0 2-3 3-3 3" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="17" x2="12.01" y2="17" stroke="white" stroke-width="2" stroke-linecap="round"/>',
  'refresh': '<polyline points="23 4 23 10 17 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="1 20 1 14 7 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'refresh-fill': '<polyline points="23 4 23 10 17 10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><polyline points="1 20 1 14 7 14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15" fill="currentColor"/>',
  'download': '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'download-fill': '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3" fill="currentColor"/>',
  'upload': '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'upload-fill': '<path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12" fill="currentColor"/>',
  'link': '<path d="M10 13a5 5 0 007 0l4-4a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7 0l-4 4a5 5 0 007 7l1.5-1.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'link-fill': '<path d="M10 13a5 5 0 007 0l4-4a5 5 0 00-7-7l-1.5 1.5M14 11a5 5 0 00-7 0l-4 4a5 5 0 007 7l1.5-1.5" fill="currentColor"/>',
  'shield': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'shield-fill': '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="currentColor"/>',
  'building': '<rect x="4" y="2" width="16" height="20" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="9" y1="22" x2="9" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="15" y1="22" x2="15" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="6" x2="8.01" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="6" x2="16.01" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="10" x2="8.01" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="10" x2="16.01" y2="10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="8" y1="14" x2="8.01" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="16" y1="14" x2="16.01" y2="14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'building-fill': '<rect x="4" y="2" width="16" height="20" rx="2" ry="2" fill="currentColor"/>',
  'voice': '<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'voice-fill': '<path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" fill="currentColor"/><path d="M19 10v2a7 7 0 01-14 0v-2M12 19v4M8 23h8" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'video': '<polygon points="23 7 16 12 23 17 23 7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'video-fill': '<polygon points="23 7 16 12 23 17 23 7" fill="currentColor"/><rect x="1" y="5" width="15" height="14" rx="2" ry="2" fill="currentColor"/>',
  'money': '<line x1="12" y1="1" x2="12" y2="23" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M17 5H9.5a3.5 3.5 0 000 7h5a3.5 3.5 0 010 7H6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'money-fill': '<circle cx="12" cy="12" r="10" fill="currentColor"/><text x="12" y="16" textAnchor="middle" fontSize="12" fill="white" fontWeight="bold">¥</text>',
  'gift': '<polyline points="20 12 20 22 4 22 4 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><rect x="2" y="7" width="20" height="5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><line x1="12" y1="22" x2="12" y2="7" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M12 7H7.5a2.5 2.5 0 010-5C11 2 12 7 12 7zM12 7h4.5a2.5 2.5 0 000-5C13 2 12 7 12 7z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'gift-fill': '<polyline points="20 12 20 22 4 22 4 12" fill="currentColor"/><rect x="2" y="7" width="20" height="5" fill="currentColor"/>',
  'scan': '<path d="M23 7V5a2 2 0 00-2-2h-2M1 7V5a2 2 0 012-2h2M23 17v2a2 2 0 01-2 2h-2M1 17v2a2 2 0 002 2h2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'scan-fill': '<rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor"/>',
  'filter': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'filter-fill': '<polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" fill="currentColor"/>',
  'sort': '<line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="18" x2="12" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'sort-fill': '<line x1="4" y1="6" x2="20" y2="6" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="12" x2="16" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><line x1="4" y1="18" x2="12" y2="18" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
  'tag': '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82zM7 7h.01" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'tag-fill': '<path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z" fill="currentColor"/>',
  'flag': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'flag-fill': '<path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1zM4 22v-7" fill="currentColor"/>',
  'eye': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="none" stroke="currentColor" stroke-width="2"/><circle cx="12" cy="12" r="3" fill="none" stroke="currentColor" stroke-width="2"/>',
  'eye-fill': '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z" fill="currentColor"/><circle cx="12" cy="12" r="3" fill="white"/>',
  'eye-off': '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'eye-off-fill': '<path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22" fill="currentColor"/>',
  'chevron-right': '<polyline points="9 18 15 12 9 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'chevron-left': '<polyline points="15 18 9 12 15 6" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'chevron-up': '<polyline points="18 15 12 9 6 15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'chevron-down': '<polyline points="6 9 12 15 18 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'logout': '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'logout-fill': '<path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9" fill="currentColor"/>',
  'clipboard': '<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2M16 2H8v4h8z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'clipboard-fill': '<path d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2" fill="currentColor"/><rect x="8" y="2" width="8" height="4" fill="currentColor"/>',
  'trash': '<path d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'trash-fill': '<path d="M3 6h18v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6zM8 6V4a2 2 0 012-2h4a2 2 0 012 2v2" fill="currentColor"/>',
  'pencil': '<path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7M18.5 2.5a2.121 2.121 0 113 3L12 15l-4 1 1-4 9.5-9.5z" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
  'pencil-fill': '<path d="M17 3a2.828 2.828 0 114 4L7.5 20.5 2 22l1.5-5.5L17 3z" fill="currentColor"/>',
}

const base64Encode = (str: string): string => {
  const base64Chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
  let result = ''
  let i = 0
  const len = str.length
  
  while (i < len) {
    const byte1 = str.charCodeAt(i++)
    const byte2 = i < len ? str.charCodeAt(i++) : 0
    const byte3 = i < len ? str.charCodeAt(i++) : 0
    
    const enc1 = byte1 >> 2
    const enc2 = ((byte1 & 3) << 4) | (byte2 >> 4)
    const enc3 = ((byte2 & 15) << 2) | (byte3 >> 6)
    const enc4 = byte3 & 63
    
    result += base64Chars[enc1] + base64Chars[enc2]
    result += i - 2 < len ? base64Chars[enc3] : '='
    result += i - 1 < len ? base64Chars[enc4] : '='
  }
  
  return result
}

const WxIcon = memo(({ name, size = 24, color = '#333333', className = '', style }: WxIconProps) => {
  const svgPath = WX_ICON_SVG[name]
  
  if (!svgPath) {
    console.warn(`[WxIcon] 未找到图标: ${name}`)
    return <Text className={className} style={{ fontSize: size, color, ...style }}>?</Text>
  }
  
  const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none">${svgPath.replace(/currentColor/g, color)}</svg>`
  const base64 = `data:image/svg+xml;base64,${base64Encode(svgString)}`
  
  return (
    <Image 
      src={base64}
      className={className}
      style={{ 
        width: size, 
        height: size,
        ...style 
      }}
      mode="aspectFit"
    />
  )
})

WxIcon.displayName = 'WxIcon'

export default WxIcon
