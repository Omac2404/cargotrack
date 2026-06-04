import { useParams, Link, useNavigate } from 'react-router-dom'
import {
  ArrowLeft, Building2, Pencil, Phone, Mail, MapPin, FileText, Globe,
  Loader2, AlertCircle, Inbox, TrendingUp, TrendingDown, Coins,
  Receipt, CheckCircle2, Clock, Truck, Ship, Plane, Warehouse,
} from 'lucide-react'
import { useState } from 'react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { usePartner, usePartnerShipments, PARTNER_TYPE_LABELS } from './hooks'
import { PartnerFormDialog } from './PartnerFormDialog'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { cn, formatDate, formatMoney, formatNumber } from '@/lib/utils'
import { STATUS_LABELS } from '@/features/shipments/modeConfig'

const MODE_ICON: Record<string, React.ReactNode> = {
  road: <Truck className="w-3.5 h-3.5" />,
  maritime: <Ship className="w-3.5 h-3.5" />,
  sea: <Ship className="w-3.5 h-3.5" />,
  air: <Plane className="w-3.5 h-3.5" />,
  storage: <Warehouse className="w-3.5 h-3.5" />,
  import: <Ship className="w-3.5 h-3.5" />,
  export: <Plane className="w-3.5 h-3.5" />,
}

const MODE_LABELS: Record<string, string> = {
  road: 'Karayolu', maritime: 'Denizyolu', sea: 'Denizyolu',
  air: 'Havayolu', storage: 'Depolama', import: 'İthalat', export: 'İhracat',
}

const MODE_SLUG: Record<string, string> = {
  road: 'karayolu', maritime: 'denizyolu', sea: 'denizyolu',
  air: 'havayolu', storage: 'depolama', import: 'ithalat', export: 'ihracat',
}

export function PartnerDetailPage() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [editOpen, setEditOpen] = useState(false)

  const { data: partner, isLoading: partnerLoading } = usePartner(id)
  const { data: shipmentsData, isLoading: shipmentsLoading, error } = usePartnerShipments(id)

  if (partnerLoading || !partner) {
    return (
      <div className="p-12 text-center text-muted-foreground">
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      </div>
    )
  }

  const summary = shipmentsData?.summary
  const shipments = shipmentsData?.shipments || []
  const margin = summary?.margin || 0

  return (
    <div className="space-y-4 max-w-[1600px]">
      {/* Header */}
      <div className="flex items-start gap-3">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => navigate('/partners')}>
          <ArrowLeft className="w-4 h-4" />
        </Button>
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-blue-500 to-indigo-600 text-white flex items-center justify-center shrink-0">
          <Building2 className="w-6 h-6" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-xl font-bold tracking-tight truncate">{partner.company_name}</h1>
            <Badge variant="outline">{PARTNER_TYPE_LABELS[partner.type]}</Badge>
            {partner.partner_code && (
              <Badge variant="secondary" className="font-mono">{partner.partner_code}</Badge>
            )}
          </div>
          <p className="text-xs text-muted-foreground">
            {[partner.city, partner.country].filter(Boolean).join(', ')}
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setEditOpen(true)}>
          <Pencil className="w-4 h-4" />
          Düzenle
        </Button>
      </div>

      {/* Özet kartları */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <StatCard
            icon={<Receipt className="w-4 h-4" />}
            label="Toplam Sevkiyat"
            value={String(summary.count)}
            sub="kayıt"
          />
          <StatCard
            icon={<TrendingUp className="w-4 h-4" />}
            label="Toplam Ciro"
            value={formatMoney(summary.total_sale, 'EUR')}
            variant="success"
          />
          <StatCard
            icon={<Coins className="w-4 h-4" />}
            label="Brüt Kâr"
            value={formatMoney(summary.total_profit, 'EUR')}
            sub={`%${formatNumber(margin, 1)} marj`}
            variant={summary.total_profit > 0 ? 'success' : 'destructive'}
          />
          <StatCard
            icon={<Clock className="w-4 h-4" />}
            label="Bekleyen Ödeme"
            value={String(summary.unpaid_count)}
            sub={`${summary.paid_count} ödendi`}
            variant={summary.unpaid_count > 0 ? 'warning' : 'success'}
          />
        </div>
      )}

      <Tabs defaultValue="info" className="w-full">
        <TabsList>
          <TabsTrigger value="info">
            <Building2 className="w-3.5 h-3.5" /> Bilgiler
          </TabsTrigger>
          <TabsTrigger value="shipments">
            <Receipt className="w-3.5 h-3.5" /> Sevkiyatlar ({shipments.length})
          </TabsTrigger>
        </TabsList>

        {/* === Bilgiler === */}
        <TabsContent value="info" className="mt-4">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                İletişim
              </h3>
              <InfoRow icon={<Phone className="w-4 h-4" />} label="Telefon" value={partner.contact_phone} link={partner.contact_phone ? `tel:${partner.contact_phone}` : undefined} />
              <InfoRow icon={<Mail className="w-4 h-4" />} label="E-posta" value={partner.contact_email} link={partner.contact_email ? `mailto:${partner.contact_email}` : undefined} />
              <InfoRow icon={<Building2 className="w-4 h-4" />} label="İletişim Kişi" value={partner.contact_person} />
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Adres
              </h3>
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Fiziksel Adres" value={partner.physical_address} />
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Posta Kodu" value={partner.postal_code} />
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Şehir / Ülke" value={[partner.city, partner.country].filter(Boolean).join(' / ')} />
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Gümrük / Vergi
              </h3>
              <InfoRow icon={<FileText className="w-4 h-4" />} label="Vergi Numarası" value={partner.tax_number} mono />
              <InfoRow icon={<Globe className="w-4 h-4" />} label="EORI Numarası" value={partner.eori_number} mono />
              <InfoRow icon={<FileText className="w-4 h-4" />} label="MERSİS Numarası" value={partner.mersis_number} mono />
            </Card>

            <Card className="p-5 space-y-3">
              <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Faturalama
              </h3>
              <InfoRow icon={<MapPin className="w-4 h-4" />} label="Fatura Adresi" value={partner.billing_address} />
              <InfoRow icon={<Mail className="w-4 h-4" />} label="Fatura E-posta" value={partner.billing_email} link={partner.billing_email ? `mailto:${partner.billing_email}` : undefined} />
            </Card>
          </div>
        </TabsContent>

        {/* === Sevkiyatlar === */}
        <TabsContent value="shipments" className="mt-4 space-y-4">
          <Card className="p-3 flex items-center justify-between gap-2 text-xs text-muted-foreground">
            <div>
              {shipments.length} sevkiyat ·
              Ciro: <strong className="text-foreground">{formatMoney(summary?.total_sale || 0, 'EUR')}</strong> ·
              Faturalı: <strong className="text-foreground">{formatMoney(summary?.total_invoiced || 0, 'EUR')}</strong>
            </div>
            <ExportButton
              data={shipments as unknown as Record<string, unknown>[]}
              filename={`partner_${partner.company_name.replace(/[^a-zA-Z0-9]/g, '_')}_sevkiyatlar`}
              sheetName="Sevkiyatlar"
              columns={[
                { header: 'Sevkiyat No', key: 'shipment_no' },
                { header: 'Tarih', key: 'created_date', format: exportFormatters.date },
                { header: 'Mod', key: 'transport_type', format: (v) => MODE_LABELS[v as string] || String(v ?? '') },
                { header: 'Durum', key: 'status', format: (v) => STATUS_LABELS[v as string]?.label || String(v ?? '') },
                { header: 'Çıkış', key: 'departure_country' },
                { header: 'Varış', key: 'arrival_country' },
                { header: 'Toplam Alış', key: 'purchase_price', format: (v) => exportFormatters.number(v) },
                { header: 'Toplam Satış', key: 'sale_price', format: (v) => exportFormatters.number(v) },
                { header: 'Para Birimi', key: 'currency_code' },
                { header: 'Fatura No', key: 'invoice_no' },
                { header: 'Fatura Tarihi', key: 'invoice_date', format: exportFormatters.date },
                { header: 'Ödendi', key: 'payment_received', format: exportFormatters.yesNo },
              ]}
            />
          </Card>

          <Card className="overflow-hidden">
            {shipmentsLoading ? (
              <div className="p-12 text-center text-muted-foreground">
                <Loader2 className="w-6 h-6 animate-spin mx-auto" />
              </div>
            ) : error ? (
              <div className="p-8 text-center text-destructive">
                <AlertCircle className="w-8 h-8 mx-auto mb-2" />
                {(error as Error).message}
              </div>
            ) : shipments.length === 0 ? (
              <div className="p-12 text-center text-muted-foreground">
                <Inbox className="w-10 h-10 mx-auto mb-2 opacity-50" />
                <div className="text-sm">Bu partner henüz hiçbir sevkiyatta yer almamış.</div>
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sevkiyat No</TableHead>
                    <TableHead>Mod</TableHead>
                    <TableHead>Tarih</TableHead>
                    <TableHead>Güzergah</TableHead>
                    <TableHead>Rol</TableHead>
                    <TableHead className="text-right">Satış</TableHead>
                    <TableHead className="text-right">Kâr</TableHead>
                    <TableHead>Durum</TableHead>
                    <TableHead>Fatura</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shipments.map((s) => {
                    const slug = MODE_SLUG[s.transport_type] || 'karayolu'
                    const status = STATUS_LABELS[s.status]
                    const sale = Number(s.sale_price) || 0
                    const purchase = Number(s.purchase_price) || 0
                    const profit = sale - purchase
                    // Hangi rolde olduğunu bul
                    const roles: string[] = []
                    if (s.client_billing === partner.company_name) roles.push('Müşteri')
                    if (s.sender === partner.company_name) roles.push('Gönderici')
                    if (s.receiver === partner.company_name) roles.push('Alıcı')
                    if (s.agent === partner.company_name) roles.push('Acente')
                    return (
                      <TableRow
                        key={s.id}
                        className="cursor-pointer"
                        onClick={() => navigate(`/shipments/${slug}/${s.id}/edit`)}
                      >
                        <TableCell className="font-mono text-xs font-medium">{s.shipment_no}</TableCell>
                        <TableCell>
                          <Badge variant="outline" className="gap-1 text-xs">
                            {MODE_ICON[s.transport_type]}
                            {MODE_LABELS[s.transport_type] || s.transport_type}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs whitespace-nowrap">{formatDate(s.created_date)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.departure_country || '?'} → {s.arrival_country || '?'}
                        </TableCell>
                        <TableCell className="text-xs">
                          <div className="flex flex-wrap gap-1">
                            {roles.map((r) => <Badge key={r} variant="secondary" className="text-[10px]">{r}</Badge>)}
                          </div>
                        </TableCell>
                        <TableCell className="text-right tabular-nums text-xs font-medium">
                          {formatMoney(sale, s.currency_code || 'EUR')}
                        </TableCell>
                        <TableCell className={cn('text-right tabular-nums text-xs font-medium', profit >= 0 ? 'text-success' : 'text-destructive')}>
                          {formatMoney(profit, s.currency_code || 'EUR')}
                        </TableCell>
                        <TableCell>
                          {status && <Badge variant={status.variant}>{status.label}</Badge>}
                        </TableCell>
                        <TableCell className="text-xs">
                          {s.invoice_generated ? (
                            <div className="flex items-center gap-1">
                              {s.payment_received ? (
                                <CheckCircle2 className="w-3.5 h-3.5 text-success" />
                              ) : (
                                <Clock className="w-3.5 h-3.5 text-warning" />
                              )}
                              <span className="font-mono">{s.invoice_no || '—'}</span>
                            </div>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            )}
          </Card>
        </TabsContent>
      </Tabs>

      <PartnerFormDialog
        open={editOpen}
        onOpenChange={setEditOpen}
        partner={partner}
        defaultType={partner.type}
      />
    </div>
  )
}

function InfoRow({ icon, label, value, link, mono }: {
  icon: React.ReactNode; label: string; value?: string | null; link?: string; mono?: boolean
}) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <div className="text-muted-foreground mt-0.5 shrink-0">{icon}</div>
      <div className="min-w-0 flex-1">
        <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
        {value ? (
          link ? (
            <a href={link} className={cn('hover:underline', mono && 'font-mono')}>{value}</a>
          ) : (
            <div className={cn(mono && 'font-mono')}>{value}</div>
          )
        ) : (
          <div className="text-muted-foreground italic text-xs">—</div>
        )}
      </div>
    </div>
  )
}

function StatCard({ icon, label, value, sub, variant }: {
  icon: React.ReactNode; label: string; value: string; sub?: string;
  variant?: 'success' | 'destructive' | 'warning' | 'primary'
}) {
  return (
    <Card className={cn(
      'p-3',
      variant === 'success' && 'border-success/30 bg-success/5',
      variant === 'destructive' && 'border-destructive/30 bg-destructive/5',
      variant === 'warning' && 'border-warning/30 bg-warning/5',
    )}>
      <div className="flex items-center gap-1.5 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {icon}
        {label}
      </div>
      <div className={cn(
        'text-xl font-bold tabular-nums mt-1',
        variant === 'success' && 'text-success',
        variant === 'destructive' && 'text-destructive',
        variant === 'warning' && 'text-warning',
      )}>{value}</div>
      {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
    </Card>
  )
}
