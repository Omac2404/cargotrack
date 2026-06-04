import { Link } from 'react-router-dom'
import { Bell, Check, CheckCheck, Trash2, Loader2, Inbox } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Button } from '@/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover'
import { formatDate } from '@/lib/utils'
import {
  useNotifications, useUnreadCount, useMarkRead, useMarkAllRead, useDeleteNotification,
} from './hooks'

const TYPE_ICONS: Record<string, string> = {
  shipment_status: '📦',
  assignment_new: '🚚',
  transit_expiry: '⏰',
  document_missing: '📄',
  info: 'ℹ️',
}

export function NotificationsBell() {
  const { t } = useTranslation()
  const { data: notifications = [], isLoading } = useNotifications(false, 30)
  const { data: countData } = useUnreadCount()
  const markRead = useMarkRead()
  const markAllRead = useMarkAllRead()
  const deleteOne = useDeleteNotification()

  const unreadCount = countData?.count || 0

  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" className="relative" title={t('notifications.title')}>
          <Bell className="w-4 h-4" />
          {unreadCount > 0 && (
            <span className="absolute top-0 right-0 min-w-[16px] h-4 px-1 rounded-full bg-destructive text-destructive-foreground text-[10px] font-semibold flex items-center justify-center">
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-[380px] p-0" align="end">
        <div className="flex items-center justify-between px-3 py-2 border-b">
          <div className="text-sm font-semibold">
            {t('notifications.title')}
            {unreadCount > 0 && (
              <span className="ml-2 text-xs text-muted-foreground">({t('notifications.unread', { count: unreadCount })})</span>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => markAllRead.mutate()}
              disabled={markAllRead.isPending}
            >
              <CheckCheck className="w-3.5 h-3.5" />
              {t('notifications.mark_all_read')}
            </Button>
          )}
        </div>

        <div className="max-h-[480px] overflow-y-auto">
          {isLoading ? (
            <div className="p-8 text-center">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">
              <Inbox className="w-10 h-10 mx-auto mb-2 opacity-40" />
              <div className="text-sm">{t('notifications.empty')}</div>
            </div>
          ) : (
            <ul className="divide-y">
              {notifications.map((n) => {
                const isUnread = !n.read_at
                const icon = TYPE_ICONS[n.type] || '🔔'
                const content = (
                  <div className={`px-3 py-2.5 hover:bg-accent transition-colors ${isUnread ? 'bg-primary/5' : ''}`}>
                    <div className="flex items-start gap-2">
                      <div className="text-lg leading-tight shrink-0">{icon}</div>
                      <div className="flex-1 min-w-0">
                        <div className={`text-sm ${isUnread ? 'font-semibold' : 'text-muted-foreground'}`}>
                          {n.title}
                        </div>
                        {n.body && (
                          <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{n.body}</div>
                        )}
                        <div className="text-[10px] text-muted-foreground mt-1">
                          {formatDate(n.created_at, true)}
                        </div>
                      </div>
                      <div className="flex items-center gap-0.5 shrink-0">
                        {isUnread && (
                          <Button
                            variant="ghost"
                            size="icon"
                            className="h-6 w-6"
                            title={t('notifications.mark_read')}
                            onClick={(e) => { e.preventDefault(); e.stopPropagation(); markRead.mutate(n.id) }}
                          >
                            <Check className="w-3 h-3" />
                          </Button>
                        )}
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-6 w-6 text-destructive hover:bg-destructive/10"
                          title={t('common.delete')}
                          onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteOne.mutate(n.id) }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  </div>
                )
                return (
                  <li key={n.id}>
                    {n.link ? (
                      <Link
                        to={n.link}
                        onClick={() => isUnread && markRead.mutate(n.id)}
                        className="block"
                      >
                        {content}
                      </Link>
                    ) : (
                      content
                    )}
                  </li>
                )
              })}
            </ul>
          )}
        </div>
      </PopoverContent>
    </Popover>
  )
}
