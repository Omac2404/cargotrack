import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router-dom'
import { Trophy, ExternalLink } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Label } from '@/components/ui/label'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { Button } from '@/components/ui/button'
import { usePartners } from '@/features/partners/hooks'
import { useCustomerRanking } from './hooks'
import { ReportLoading, ReportError } from './ReportsPage'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { formatMoney, formatNumber } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

export function CustomerRankingReport() {
  const { t } = useTranslation()
  const [year, setYear] = useState(CURRENT_YEAR)
  const [limit, setLimit] = useState(20)

  const { data, isLoading, error } = useCustomerRanking(year, limit)
  const { data: partners = [] } = usePartners()

  if (isLoading) return <ReportLoading />
  if (error) return <ReportError error={error} />
  if (!data) return null

  // Şirket adından partner ID'sini bul (detay sayfasına link)
  const partnerByName = new Map(partners.map((p) => [p.company_name, p]))

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[10px]">{t('reports.year')}</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">{t('reports.top_n')}</Label>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">{t('ui.ilk_10')}</SelectItem>
              <SelectItem value="20">{t('ui.ilk_20')}</SelectItem>
              <SelectItem value="50">{t('ui.ilk_50')}</SelectItem>
              <SelectItem value="100">{t('ui.ilk_100')}</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <ExportButton
            data={data.customers as unknown as Record<string, unknown>[]}
            filename={`musteri_siralamasi_${year}`}
            sheetName={t('reports.customer_ranking')}
            columns={[
              { header: t('ui.sirket'), key: 'company_name' },
              { header: t('ui.rep_shipment_count'), key: 'shipment_count' },
              { header: t('shipment.financial.total_sale'), key: 'total_sale', format: (v) => exportFormatters.number(v) },
              { header: t('shipment.financial.total_purchase'), key: 'total_purchase', format: (v) => exportFormatters.number(v) },
              { header: t('statistics.table.profit'), key: 'profit', format: (v) => exportFormatters.number(v) },
              { header: t('transport.columns.margin'), key: 'margin', format: (v) => exportFormatters.number(v, 2) },
              { header: t('partner.detail.pending_payment'), key: 'pending_payment', format: (v) => exportFormatters.number(v) },
            ]}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead>{t('shipment.client')}</TableHead>
              <TableHead className="text-right">{t('statistics.table.shipment')}</TableHead>
              <TableHead className="text-right">{t('statistics.table.revenue')}</TableHead>
              <TableHead className="text-right">{t('ui.rep_cost')}</TableHead>
              <TableHead className="text-right">{t('statistics.table.profit')}</TableHead>
              <TableHead className="text-right">{t('statistics.summary.margin')}</TableHead>
              <TableHead className="text-right">{t('ui.rep_pending')}</TableHead>
              <TableHead className="w-[40px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data.customers.map((c, i) => {
              const partner = partnerByName.get(c.company_name)
              return (
                <TableRow key={c.company_name}>
                  <TableCell>
                    {i < 3 ? (
                      <Badge variant={i === 0 ? 'warning' : 'secondary'} className="text-xs">
                        <Trophy className="w-3 h-3" />
                        {i + 1}
                      </Badge>
                    ) : (
                      <span className="text-xs text-muted-foreground tabular-nums">{i + 1}</span>
                    )}
                  </TableCell>
                  <TableCell className="font-medium max-w-[280px] truncate">{c.company_name}</TableCell>
                  <TableCell className="text-right tabular-nums">{c.shipment_count}</TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{formatMoney(c.total_sale, 'EUR')}</TableCell>
                  <TableCell className="text-right tabular-nums text-muted-foreground">{formatMoney(c.total_purchase, 'EUR')}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${c.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatMoney(c.profit, 'EUR')}
                  </TableCell>
                  <TableCell className="text-right tabular-nums text-xs">%{formatNumber(c.margin, 1)}</TableCell>
                  <TableCell className={`text-right tabular-nums text-xs ${c.pending_payment > 0 ? 'text-warning font-semibold' : 'text-muted-foreground'}`}>
                    {c.pending_payment > 0 ? formatMoney(c.pending_payment, 'EUR') : '—'}
                  </TableCell>
                  <TableCell>
                    {partner && (
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7" title={t('ui.partner_detayi')}>
                        <Link to={`/partners/${partner.id}`}>
                          <ExternalLink className="w-3.5 h-3.5" />
                        </Link>
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              )
            })}
            {data.customers.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                  {t('ui.bu_yil_icin_musteri_verisi_yok')}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
