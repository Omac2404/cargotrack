import { useMemo, useState } from 'react'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  Plus, Search, Pencil, Trash2, Loader2, Users, Inbox, AlertCircle, ShieldAlert,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { useUsers, useDeleteUser, ROLE_LABELS } from './hooks'
import { UserFormDialog } from './UserFormDialog'
import { useAuth } from '@/stores/auth'
import { formatDate } from '@/lib/utils'
import type { User } from '@/types/api'

export function UsersListPage() {
  const { t } = useTranslation()
  const currentUser = useAuth((s) => s.user)
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<User | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<User | null>(null)

  const { data: users = [], isLoading, error } = useUsers()
  const deleteMut = useDeleteUser()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return users
    return users.filter((u) =>
      [u.username, u.full_name, u.email].filter(Boolean).join(' ').toLowerCase().includes(q)
    )
  }, [users, search])

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${deleteTarget.full_name} silindi`)
        setDeleteTarget(null)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-fuchsia-500 to-purple-600 text-white flex items-center justify-center">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('users.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('users.subtitle')}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('users.new')}
        </Button>
      </div>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('users.search_placeholder')}
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground px-2">{filtered.length} {t('common.records')}</div>
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            {t('common.error')}: {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">{t('common.no_data')}</div>
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('users.username')}</TableHead>
                <TableHead>{t('users.full_name')}</TableHead>
                <TableHead>{t('users.email')}</TableHead>
                <TableHead>{t('users.role')}</TableHead>
                <TableHead>{t('users.status')}</TableHead>
                <TableHead>{t('users.last_login')}</TableHead>
                <TableHead>{t('common.created_at')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((u) => {
                const role = ROLE_LABELS[u.role]
                const isMe = u.id === currentUser?.id
                return (
                  <TableRow key={u.id} className="cursor-pointer" onClick={() => setEditTarget(u)}>
                    <TableCell className="font-mono">
                      @{u.username}
                      {isMe && <Badge variant="outline" className="ml-1.5">{t('auth.user_menu_my_profile')}</Badge>}
                    </TableCell>
                    <TableCell className="font-medium">{u.full_name}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">{u.email || '—'}</TableCell>
                    <TableCell><Badge variant={role.variant}>{t(`auth.roles.${u.role}`, role.label)}</Badge></TableCell>
                    <TableCell>
                      <Badge variant={u.status === 'active' ? 'success' : 'secondary'}>
                        {u.status === 'active' ? t('users.status_active') : t('users.status_inactive')}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {u.last_login ? formatDate(u.last_login, true) : '—'}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">{formatDate(u.created_at)}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTarget(u)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          disabled={isMe}
                          title={t('common.delete')}
                          onClick={() => !isMe && setDeleteTarget(u)}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )
              })}
            </TableBody>
          </Table>
        )}
      </Card>

      <UserFormDialog
        open={createOpen || !!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setEditTarget(null)
          }
        }}
        user={editTarget}
      />

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldAlert className="w-5 h-5 text-destructive" />
              {t('common.delete')}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {t('users.delete_confirm', { name: deleteTarget?.full_name || deleteTarget?.username || '' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
