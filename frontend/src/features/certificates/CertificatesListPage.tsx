import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { Plus, Search, Printer, Copy, Trash2, Loader2, Inbox, Stamp } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Table, TableHeader, TableBody, TableHead, TableRow, TableCell } from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { formatDate } from '@/lib/utils'
import { useCan } from '@/hooks/useCan'
import { openPdf } from '@/features/pdf/hooks'
import {
  useCertificates, useDeleteCertificate, useCopyCertificate,
  getCertificateUrl, loadPrintOffset,
} from './hooks'
import type { Certificate, CertificateType } from '@/types/api'

export function CertificatesListPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const [tab, setTab] = useState<CertificateType | 'all'>('all')
  const [q, setQ] = useState('')
  const [deleteTarget, setDeleteTarget] = useState<Certificate | null>(null)

  const { data: list = [], isLoading } = useCertificates({ cert_type: tab, q })
  const deleteMut = useDeleteCertificate()
  const copyMut = useCopyCertificate()
  const canCreate = useCan('certificates.create')
  const canDelete = useCan('certificates.delete')

  const print = (c: Certificate) => openPdf(getCertificateUrl(c.id, loadPrintOffset()))

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div>
          <h1 className="text-xl font-semibold flex items-center gap-2">
            <Stamp className="w-5 h-5" />
            {t('cert.title')}
          </h1>
          <p className="text-xs text-muted-foreground">{t('cert.subtitle')}</p>
        </div>
        {canCreate && (
          <Button size="sm" onClick={() => navigate('/certificates/new')}>
            <Plus className="w-4 h-4" />
            {t('cert.new')}
          </Button>
        )}
      </div>

      <Card className="p-3 flex items-center gap-3 flex-wrap">
        <Tabs value={tab} onValueChange={(v) => setTab(v as CertificateType | 'all')}>
          <TabsList>
            <TabsTrigger value="all">{t('common.all')}</TabsTrigger>
            <TabsTrigger value="atr">A.TR.</TabsTrigger>
            <TabsTrigger value="eur1">EUR.1</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative flex-1 min-w-[220px]">
          <Search className="w-4 h-4 absolute left-2.5 top-2.5 text-muted-foreground" />
          <Input className="pl-8" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t('cert.search_ph')} />
        </div>
      </Card>

      <Card>
        {isLoading ? (
          <div className="p-8 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
        ) : list.length === 0 ? (
          <div className="p-10 text-center text-sm text-muted-foreground">
            <Inbox className="w-8 h-8 mx-auto mb-2 opacity-50" />
            {t('cert.empty')}
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>{t('cert.fields.cert_no')}</TableHead>
                <TableHead>{t('cert.type')}</TableHead>
                <TableHead>{t('cert.fields.exporter')}</TableHead>
                <TableHead>{t('cert.fields.consignee')}</TableHead>
                <TableHead>{t('cert.fields.issue_date')}</TableHead>
                <TableHead className="text-right">{t('common.actions')}</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {list.map((c) => (
                <TableRow key={c.id} className="cursor-pointer" onClick={() => navigate(`/certificates/${c.id}`)}>
                  <TableCell className="font-mono font-medium">{c.cert_no || '—'}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{c.cert_type === 'eur1' ? 'EUR.1' : 'A.TR.'}</Badge>
                  </TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">{(c.exporter || '').split('\n')[0]}</TableCell>
                  <TableCell className="text-xs max-w-[220px] truncate">{(c.consignee || '').split('\n')[0]}</TableCell>
                  <TableCell className="text-xs">{c.issue_date ? formatDate(c.issue_date) : '—'}</TableCell>
                  <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                    <div className="flex items-center justify-end gap-1">
                      <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                              title={t('cert.print')} onClick={() => print(c)}>
                        <Printer className="w-3.5 h-3.5" />
                      </Button>
                      {canCreate && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                                title={t('cert.copy')}
                                onClick={() => copyMut.mutate(c.id, {
                                  onSuccess: (d) => { toast.success(t('cert.copied')); navigate(`/certificates/${d.id}`) },
                                  onError: (e: Error) => toast.error(e.message),
                                })}>
                          <Copy className="w-3.5 h-3.5" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                                title={t('common.delete')} onClick={() => setDeleteTarget(c)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </Card>

      <AlertDialog open={!!deleteTarget} onOpenChange={(o) => !o && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('cert.delete_title')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t('cert.delete_body', { no: deleteTarget?.cert_no || '—' })}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (!deleteTarget) return
                deleteMut.mutate(deleteTarget.id, {
                  onSuccess: () => toast.success(t('cert.deleted')),
                  onError: (e: Error) => toast.error(e.message),
                })
                setDeleteTarget(null)
              }}
            >
              {t('common.delete')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
