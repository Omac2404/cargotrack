import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  Plus, Search, Pencil, Trash2, Loader2, Building2, Inbox, AlertCircle, Phone, Mail,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import {
  Tabs, TabsList, TabsTrigger,
} from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { usePartners, useDeletePartner, PARTNER_TYPE_LABELS } from './hooks'
import { PartnerFormDialog } from './PartnerFormDialog'
import type { Partner, PartnerType } from '@/types/api'
import { ExportButton } from '@/components/shared/ExportButton'

const TYPE_TAB_KEYS: Array<{ value: PartnerType | 'all'; key: string }> = [
  { value: 'all', key: 'common.all' },
  { value: 'customer', key: 'partner.types.customers' },
  { value: 'sender', key: 'partner.types.senders' },
  { value: 'receiver', key: 'partner.types.receivers' },
  { value: 'agent', key: 'partner.types.agents' },
]

const TYPE_VARIANTS: Record<PartnerType, 'default' | 'success' | 'warning' | 'secondary'> = {
  customer: 'default',
  sender: 'success',
  receiver: 'warning',
  agent: 'secondary',
}

export function PartnersListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [type, setType] = useState<PartnerType | 'all'>('all')
  const TYPE_TABS = TYPE_TAB_KEYS.map((t2) => ({ value: t2.value, label: t(t2.key) }))
  const [search, setSearch] = useState('')
  const [editTarget, setEditTarget] = useState<Partner | null>(null)
  const [createOpen, setCreateOpen] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<Partner | null>(null)

  const { data: partners = [], isLoading, error } = usePartners(type === 'all' ? '' : type)
  const deleteMut = useDeletePartner()

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return partners
    return partners.filter((p) => {
      const blob = [
        p.company_name, p.partner_code, p.contact_person, p.contact_email,
        p.contact_phone, p.city, p.country, p.tax_number,
      ].filter(Boolean).join(' ').toLowerCase()
      return blob.includes(q)
    })
  }, [partners, search])

  const handleDelete = () => {
    if (!deleteTarget) return
    deleteMut.mutate(deleteTarget.id, {
      onSuccess: () => {
        toast.success(`${deleteTarget.company_name} silindi`)
        setDeleteTarget(null)
      },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 text-white flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('partner.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('nav.partners')}</p>
          </div>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="w-4 h-4" />
          {t('partner.new')}
        </Button>
      </div>

      <Tabs value={type} onValueChange={(v) => setType(v as PartnerType | 'all')}>
        <TabsList>
          {TYPE_TABS.map((tab) => (
            <TabsTrigger key={tab.value} value={tab.value}>{tab.label}</TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <Card className="p-3 flex flex-wrap items-center gap-2">
        <div className="relative flex-1 min-w-[240px]">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder={t('partner.search_placeholder')}
            className="pl-8 h-8"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <div className="text-xs text-muted-foreground px-2">{filtered.length} kayıt</div>
        <ExportButton
          data={filtered}
          filename="partnerler"
          sheetName="Partnerler"
          columns={[
            { header: 'Kod', key: 'partner_code' },
            { header: 'Şirket Adı', key: 'company_name' },
            { header: 'Tip', key: 'type', format: (v) => PARTNER_TYPE_LABELS[v as PartnerType] || String(v ?? '') },
            { header: 'İletişim Kişi', key: 'contact_person' },
            { header: 'Telefon', key: 'contact_phone' },
            { header: 'E-posta', key: 'contact_email' },
            { header: 'Adres', key: 'physical_address' },
            { header: 'Posta Kodu', key: 'postal_code' },
            { header: 'Şehir', key: 'city' },
            { header: 'Ülke', key: 'country' },
            { header: 'VKN', key: 'tax_number' },
            { header: 'EORI', key: 'eori_number' },
            { header: 'MERSİS', key: 'mersis_number' },
            { header: 'Fatura Adresi', key: 'billing_address' },
            { header: 'Fatura E-posta', key: 'billing_email' },
          ]}
        />
      </Card>

      <Card className="overflow-hidden">
        {error ? (
          <div className="p-8 text-center text-destructive">
            <AlertCircle className="w-8 h-8 mx-auto mb-2" />
            <div className="font-medium">{t('common.error')}: {(error as Error).message}</div>
          </div>
        ) : isLoading ? (
          <div className="p-12 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
            {t('common.loading')}
          </div>
        ) : filtered.length === 0 ? (
          <div className="p-12 text-center text-muted-foreground">
            <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
            <div className="text-sm">
              {partners.length === 0 ? t('common.no_data') : t('common.no_results')}
            </div>
            {partners.length === 0 && (
              <Button variant="outline" size="sm" className="mt-3" onClick={() => setCreateOpen(true)}>
                {t('partner.new')}
              </Button>
            )}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-[100px]">{t('partner.code')}</TableHead>
                <TableHead>{t('partner.company_name')}</TableHead>
                <TableHead>{t('partner.type')}</TableHead>
                <TableHead>{t('partner.country')} / {t('partner.city')}</TableHead>
                <TableHead>{t('partner.contact')}</TableHead>
                <TableHead>{t('partner.tax_number')}</TableHead>
                <TableHead className="w-[100px] text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((p) => {
                const extras = Array.isArray(p.extra_roles) ? p.extra_roles : []
                return (
                  <TableRow key={p.id} className="cursor-pointer" onClick={() => navigate(`/partners/${p.id}`)}>
                    <TableCell className="font-mono text-xs">{p.partner_code || '—'}</TableCell>
                    <TableCell className="font-medium">{p.company_name}</TableCell>
                    <TableCell>
                      <div className="flex flex-wrap gap-1">
                        <Badge variant={TYPE_VARIANTS[p.type]}>{t(`partner.types.${p.type}`)}</Badge>
                        {extras.map((r) => (
                          <Badge key={r} variant="outline">{t(`partner.types.${r}`, r)}</Badge>
                        ))}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {[p.country, p.city].filter(Boolean).join(' / ') || '—'}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-0.5 text-xs">
                        {p.contact_person && <div>{p.contact_person}</div>}
                        {p.contact_phone && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Phone className="w-3 h-3" />{p.contact_phone}
                          </div>
                        )}
                        {p.contact_email && (
                          <div className="flex items-center gap-1 text-muted-foreground">
                            <Mail className="w-3 h-3" />{p.contact_email}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-xs font-mono">{p.tax_number || '—'}</TableCell>
                    <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditTarget(p)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          variant="ghost" size="icon"
                          className="h-7 w-7 text-destructive hover:text-destructive hover:bg-destructive/10"
                          onClick={() => setDeleteTarget(p)}
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

      {/* Form dialog (create + edit aynı) */}
      <PartnerFormDialog
        open={createOpen || !!editTarget}
        onOpenChange={(o) => {
          if (!o) {
            setCreateOpen(false)
            setEditTarget(null)
          }
        }}
        partner={editTarget}
        defaultType={type === 'all' ? 'customer' : type}
      />

      {/* Silme dialog */}
      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('partner.edit')}?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="font-medium text-foreground">{deleteTarget?.company_name}</strong>
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
