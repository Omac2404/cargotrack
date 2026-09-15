import { useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import {
  ArrowLeft, Boxes, ArrowRightLeft, Wrench, Receipt, FileSignature, Loader2, AlertCircle, Trash2, FileText,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatDate, formatMoney } from '@/lib/utils'
import { useCan } from '@/hooks/useCan'
import { openPdf, getWhStockUrl } from '@/features/pdf/hooks'
import { useWhAccount, useSaveWhAccount, useDeleteWhAccount } from './hooks'
import { AccountForm } from './AccountForm'
import { MovementsTab } from './MovementsTab'
import { ServicesTab } from './ServicesTab'
import { StatementTab } from './StatementTab'
import type { WhAccount } from './types'

const STATUS_VARIANT = { active: 'success', suspended: 'warning', closed: 'secondary' } as const

export function WarehousingAccountPage() {
  const { t } = useTranslation()
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const canManage = useCan('warehousing.manage')
  const canDelete = useCan('warehousing.delete')
  const { data: account, isLoading, error } = useWhAccount(id)
  const saveMut = useSaveWhAccount()
  const deleteMut = useDeleteWhAccount()
  const [tab, setTab] = useState('movements')
  const [confirmDelete, setConfirmDelete] = useState(false)

  if (isLoading) {
    return <div className="p-12 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-muted-foreground" /></div>
  }
  if (error || !account) {
    return (
      <Card className="p-8 text-center text-destructive max-w-xl">
        <AlertCircle className="w-8 h-8 mx-auto mb-2" />
        {error ? (error as Error).message : t('common.no_data')}
        <div className="mt-4"><Button asChild variant="outline"><Link to="/warehousing">{t('common.back')}</Link></Button></div>
      </Card>
    )
  }

  const rate = (v: unknown) => formatMoney(Number(v) || 0, account.currency_code || 'EUR')
  const tariffSummary = account.storage_billing === 'fixed_month'
    ? `${rate(account.fixed_monthly_fee)} / ${t('whs.month')}`
    : `${rate(account.storage_rate)} / ${account.storage_billing === 'pallet_day' ? t('whs.pallet_day_unit') : t('whs.pallet_month_unit')}`

  const save = (data: Partial<WhAccount>) => {
    saveMut.mutate(data, {
      onSuccess: () => toast.success(t('whs.account_saved')),
      onError: (err: Error) => toast.error(err.message),
    })
  }

  const remove = () => {
    deleteMut.mutate(account.id, {
      onSuccess: () => { toast.success(t('whs.account_deleted')); navigate('/warehousing') },
      onError: (err: Error) => toast.error(err.message),
    })
  }

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <Button asChild variant="ghost" size="icon" className="shrink-0">
            <Link to="/warehousing" title={t('common.back')}><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-teal-500 to-cyan-600 text-white flex items-center justify-center shrink-0">
            <Boxes className="w-5 h-5" />
          </div>
          <div className="min-w-0">
            <h1 className="text-xl font-bold tracking-tight truncate">{account.client_name}</h1>
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span className="font-mono">{account.account_code}</span>
              <Badge variant={STATUS_VARIANT[account.status]}>{t(`whs.status_${account.status}`)}</Badge>
              {account.warehouse && <span>· {account.warehouse}</span>}
              {account.start_date && <span>· {t('whs.since')} {formatDate(account.start_date)}</span>}
            </div>
          </div>
        </div>
        <Button type="button" variant="outline" size="sm" onClick={() => openPdf(getWhStockUrl(account.id, '', ''))}>
          <FileText className="w-4 h-4" /> {t('whs.stock_sheet_pdf')}
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('whs.current_stock')}</div>
          <div className="text-2xl font-bold text-primary tabular-nums">{account.current_stock ?? 0}</div>
          <div className="text-[11px] text-muted-foreground">{t('whs.pallets')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('whs.storage_billing')}</div>
          <div className="text-sm font-semibold mt-1">{t(`whs.billing_${account.storage_billing}`)}</div>
          <div className="text-[11px] text-muted-foreground tabular-nums">{tariffSummary}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('whs.handling')}</div>
          <div className="text-sm font-semibold mt-1 tabular-nums">{t('whs.dir_in')} {rate(account.in_rate)} · {t('whs.dir_out')} {rate(account.out_rate)}</div>
          <div className="text-[11px] text-muted-foreground">/ {t('whs.pallet_unit')}</div>
        </Card>
        <Card className="p-4">
          <div className="text-[10px] uppercase tracking-wider text-muted-foreground">{t('whs.contact_person')}</div>
          <div className="text-sm font-semibold mt-1 truncate">{account.contact_person || '—'}</div>
          <div className="text-[11px] text-muted-foreground truncate">{[account.contact_phone, account.contact_email].filter(Boolean).join(' · ') || '—'}</div>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="movements"><ArrowRightLeft className="w-3.5 h-3.5" /> {t('whs.tab_movements')}</TabsTrigger>
          <TabsTrigger value="services"><Wrench className="w-3.5 h-3.5" /> {t('whs.tab_services')}</TabsTrigger>
          <TabsTrigger value="statement"><Receipt className="w-3.5 h-3.5" /> {t('whs.tab_statement')}</TabsTrigger>
          <TabsTrigger value="contract"><FileSignature className="w-3.5 h-3.5" /> {t('whs.tab_contract')}</TabsTrigger>
        </TabsList>
        <TabsContent value="movements" className="mt-4"><MovementsTab account={account} /></TabsContent>
        <TabsContent value="services" className="mt-4"><ServicesTab account={account} /></TabsContent>
        <TabsContent value="statement" className="mt-4"><StatementTab account={account} /></TabsContent>
        <TabsContent value="contract" className="mt-4 space-y-4">
          {!canManage && <p className="text-xs text-muted-foreground">{t('whs.readonly_contract')}</p>}
          <AccountForm key={account.id} account={account} onSubmit={save} isPending={saveMut.isPending} readOnly={!canManage} submitLabel={t('common.update')} />
          {canDelete && (
            <Card className="p-4 border-destructive/30 flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs text-muted-foreground">{t('whs.delete_account_hint')}</p>
              <Button type="button" variant="outline" className="text-destructive" onClick={() => setConfirmDelete(true)}>
                <Trash2 className="w-4 h-4" /> {t('whs.delete_account')}
              </Button>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <AlertDialog open={confirmDelete} onOpenChange={setConfirmDelete}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('whs.delete_account')}</AlertDialogTitle>
            <AlertDialogDescription>{t('whs.delete_account_body', { name: account.client_name })}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction onClick={remove} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
