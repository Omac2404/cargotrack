import { useState } from 'react'
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
          <Label className="text-[10px]">Yıl</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-[10px]">Top</Label>
          <Select value={String(limit)} onValueChange={(v) => setLimit(Number(v))}>
            <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="10">İlk 10</SelectItem>
              <SelectItem value="20">İlk 20</SelectItem>
              <SelectItem value="50">İlk 50</SelectItem>
              <SelectItem value="100">İlk 100</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="ml-auto">
          <ExportButton
            data={data.customers as unknown as Record<string, unknown>[]}
            filename={`musteri_siralamasi_${year}`}
            sheetName="Müşteri Sıralaması"
            columns={[
              { header: 'Şirket', key: 'company_name' },
              { header: 'Sevkiyat Sayısı', key: 'shipment_count' },
              { header: 'Toplam Satış', key: 'total_sale', format: (v) => exportFormatters.number(v) },
              { header: 'Toplam Alış', key: 'total_purchase', format: (v) => exportFormatters.number(v) },
              { header: 'Kâr', key: 'profit', format: (v) => exportFormatters.number(v) },
              { header: 'Marj %', key: 'margin', format: (v) => exportFormatters.number(v, 2) },
              { header: 'Bekleyen Ödeme', key: 'pending_payment', format: (v) => exportFormatters.number(v) },
            ]}
          />
        </div>
      </Card>

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-[40px]">#</TableHead>
              <TableHead>Müşteri</TableHead>
              <TableHead className="text-right">Sevkiyat</TableHead>
              <TableHead className="text-right">Ciro</TableHead>
              <TableHead className="text-right">Maliyet</TableHead>
              <TableHead className="text-right">Kâr</TableHead>
              <TableHead className="text-right">Marj</TableHead>
              <TableHead className="text-right">Bekleyen</TableHead>
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
                      <Button asChild variant="ghost" size="icon" className="h-7 w-7" title="Partner detayı">
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
                  Bu yıl için müşteri verisi yok.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
