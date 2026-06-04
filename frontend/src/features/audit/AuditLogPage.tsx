import { useState } from 'react'
import { History, Loader2, AlertCircle, Inbox } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { useAuditLog } from './hooks'
import { formatDate } from '@/lib/utils'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { useTranslation } from 'react-i18next'

const ENTITY_LABELS: Record<string, string> = {
  shipments: 'Sevkiyat',
  partners: 'Partner',
  warehouses: 'Depo',
  vehicles: 'Araç',
  assignments: 'Atama',
  documents: 'Belge',
  users: 'Kullanıcı',
}

const ACTION_VARIANTS: Record<string, 'default' | 'success' | 'warning' | 'destructive' | 'secondary'> = {
  create: 'success',
  update: 'default',
  delete: 'destructive',
  login: 'secondary',
  logout: 'secondary',
  upload: 'default',
  download: 'default',
}

const ACTION_LABELS: Record<string, string> = {
  create: 'Oluştur',
  update: 'Güncelle',
  delete: 'Sil',
  login: 'Giriş',
  logout: 'Çıkış',
  upload: 'Yükleme',
  download: 'İndirme',
}

export function AuditLogPage() {
  const { t } = useTranslation()
  const [entityType, setEntityType] = useState<string>('')
  const [limit, setLimit] = useState(100)

  const { data: entries = [], isLoading, error } = useAuditLog({
    entity_type: entityType || undefined,
    limit,
  })

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-slate-600 to-slate-800 text-white flex items-center justify-center">
          <History className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t('audit.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('audit.subtitle')}</p>
        </div>
      </div>

      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[10px]">{t('audit.entity_type')}</Label>
          <Select value={entityType || '__all__'} onValueChange={(v) => setEntityType(v === '__all__' ? '' : v)}>
            <SelectTrigger className="h-8 w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">{t('common.all')}</SelectItem>
              {Object.entries(ENTITY_LABELS).map(([k, label]) => (
                <SelectItem key={k} value={k}>{label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">{t('audit.limit')}</Label>
          <Input type="number" className="h-8 w-[100px]" value={limit} onChange={(e) => setLimit(Number(e.target.value) || 100)} />
        </div>
        <div className="ml-auto text-xs text-muted-foreground">{entries.length} {t('common.records')}</div>
        <ExportButton
          data={entries as unknown as Record<string, unknown>[]}
          filename="audit_log"
          sheetName="Audit Log"
          columns={[
            { header: 'Zaman', key: 'created_at', format: exportFormatters.dateTime },
            { header: 'Kullanıcı', key: 'username' },
            { header: 'İşlem', key: 'action', format: (v) => ACTION_LABELS[v as string] || String(v ?? '') },
            { header: 'Varlık Tipi', key: 'entity_type', format: (v) => ENTITY_LABELS[v as string] || String(v ?? '') },
            { header: 'Varlık ID', key: 'entity_id' },
            { header: 'Tanımlayıcı', key: 'entity_label' },
            { header: 'IP', key: 'ip_address' },
            { header: 'Değişiklikler', key: 'changes', format: (v) => v ? JSON.stringify(v) : '' },
          ]}
        />
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            {(error as Error).message}
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : entries.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            {t('audit.no_logs')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('audit.time')}</TableHead>
                <TableHead>{t('audit.user')}</TableHead>
                <TableHead>{t('audit.action')}</TableHead>
                <TableHead>{t('audit.entity')}</TableHead>
                <TableHead>{t('audit.identifier')}</TableHead>
                <TableHead>{t('audit.ip')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {entries.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="text-xs">{formatDate(e.created_at, true)}</TableCell>
                  <TableCell className="font-mono text-xs">{e.username || '-'}</TableCell>
                  <TableCell><Badge variant={ACTION_VARIANTS[e.action] || 'secondary'}>{ACTION_LABELS[e.action] || e.action}</Badge></TableCell>
                  <TableCell className="text-xs">{ENTITY_LABELS[e.entity_type] || e.entity_type}</TableCell>
                  <TableCell className="font-mono text-xs">
                    {e.entity_label || (e.entity_id ? `#${e.entity_id}` : '-')}
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">{e.ip_address || '-'}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>
    </div>
  )
}
