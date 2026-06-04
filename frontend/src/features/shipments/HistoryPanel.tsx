import { useState } from 'react'
import { History, UserCircle, Pencil, FileText, Loader2, AlertCircle, ChevronDown, ChevronRight, Lock } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatDate } from '@/lib/utils'
import { useShipmentHistory, type ShipmentChangeEntry } from './hooks'
import { labelForField, formatChangeValue } from './fieldLabels'

interface Props {
  shipmentId: number
}

export function HistoryPanel({ shipmentId }: Props) {
  const { t } = useTranslation()
  const { data, isLoading, error } = useShipmentHistory(shipmentId)

  if (isLoading) {
    return (
      <Card className="p-12 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </Card>
    )
  }
  if (error) {
    return (
      <Card className="p-6 text-center text-destructive">
        <AlertCircle className="w-6 h-6 mx-auto mb-2" />
        {(error as Error).message}
      </Card>
    )
  }
  if (!data) return null

  // create + update kayıtlarını ayır; create varsa "Oluşturuldu" satırı olarak göster
  const updates = data.entries.filter((e) => e.action === 'update')

  return (
    <div className="space-y-4">
      {/* Immutability uyarısı */}
      <div className="p-3 rounded-md bg-muted/40 border border-dashed text-xs flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 text-muted-foreground mt-0.5 shrink-0" />
        <span className="text-muted-foreground">{t('history.immutable_notice')}</span>
      </div>

      {/* Oluşturma kartı */}
      <Card className="p-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-emerald-500 to-emerald-700 text-white flex items-center justify-center shrink-0">
            <UserCircle className="w-5 h-5" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <Badge variant="success">{t('history.created_by')}</Badge>
              <span className="text-sm font-semibold">
                {data.created.full_name || data.created.username || '—'}
              </span>
              {data.created.username && data.created.full_name && (
                <span className="text-xs text-muted-foreground font-mono">@{data.created.username}</span>
              )}
            </div>
            <div className="text-xs text-muted-foreground mt-0.5">
              {formatDate(data.created.at, true)}
            </div>
          </div>
        </div>
      </Card>

      {/* Güncellemeler timeline */}
      <Card className="overflow-hidden">
        <div className="px-4 py-3 border-b bg-muted/30 flex items-center gap-2">
          <History className="w-4 h-4 text-muted-foreground" />
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            {t('history.changes_log')} ({updates.length})
          </h3>
        </div>

        {updates.length === 0 ? (
          <div className="p-8 text-center text-sm text-muted-foreground">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-40" />
            {t('history.no_updates')}
          </div>
        ) : (
          <ol className="divide-y">
            {updates.map((entry) => (
              <UpdateRow key={entry.id} entry={entry} />
            ))}
          </ol>
        )}
      </Card>
    </div>
  )
}

function UpdateRow({ entry }: { entry: ShipmentChangeEntry }) {
  const { t } = useTranslation()
  const [open, setOpen] = useState(false)
  const changes = entry.changes && typeof entry.changes === 'object' ? entry.changes : null
  const changeKeys = changes ? Object.keys(changes) : []
  const hasChanges = changeKeys.length > 0

  return (
    <li className="p-4">
      <div className="flex items-start gap-3">
        <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-amber-500 to-orange-600 text-white flex items-center justify-center shrink-0">
          <Pencil className="w-4 h-4" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-sm font-semibold">{entry.username || '—'}</span>
            <span className="text-xs text-muted-foreground">
              {hasChanges
                ? t('history.fields_updated', { count: changeKeys.length })
                : t('history.record_updated')}
            </span>
            <span className="ml-auto text-xs text-muted-foreground">
              {formatDate(entry.created_at, true)}
            </span>
          </div>

          {hasChanges ? (
            <>
              <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                className="mt-2 inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                {open ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                {open ? t('history.hide_changes') : t('history.show_changes')}
              </button>

              {open && (
                <div className="mt-3 rounded-md border bg-muted/20 divide-y">
                  {changeKeys.map((path) => (
                    <ChangeRow key={path} path={path} change={changes![path]} />
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mt-1 text-xs text-muted-foreground italic">
              {t('history.no_detail')}
            </div>
          )}
        </div>
      </div>
    </li>
  )
}

function ChangeRow({ path, change }: { path: string; change: { from: unknown; to: unknown } }) {
  const { t } = useTranslation()
  const label = labelForField(path)
  const from = formatChangeValue(change.from, path)
  const to = formatChangeValue(change.to, path)

  return (
    <div className="px-3 py-2.5 text-xs">
      <div className="font-semibold text-foreground mb-1.5">{label}</div>
      <div className="grid grid-cols-[auto_1fr] gap-x-2 gap-y-1 items-baseline">
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('history.previous')}</span>
        <span
          title={from.full}
          className="px-2 py-1 rounded border border-red-200 bg-red-50 text-red-900 line-through decoration-red-400/60 break-words"
        >
          {from.short}
        </span>
        <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{t('history.new')}</span>
        <span
          title={to.full}
          className="px-2 py-1 rounded border border-emerald-200 bg-emerald-50 text-emerald-900 font-medium break-words"
        >
          {to.short}
        </span>
      </div>
    </div>
  )
}
