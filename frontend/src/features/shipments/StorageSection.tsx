import { useMemo, useState } from 'react'
import {
  Plus, Trash2, AlertTriangle, Package, Clock, ArrowUpCircle, ArrowDownCircle,
  TrendingUp, TrendingDown, Coins, Info,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { cn, formatMoney, formatNumber, formatDate } from '@/lib/utils'
import {
  type StockMovement, migrateStockLog, stockLogSummary,
  calcStorageCost, computeTransitAlert,
} from '@/lib/constants/storage'
import {
  HANDLING_ITEMS, calcHandlingTotals, getHandlingVatRate,
  type HandlingData,
} from '@/lib/constants/handling'
import { VAT_RATES } from '@/lib/constants/finSchemas'
import { currencySymbol } from '@/lib/constants'

interface Props {
  currency: string
  /** Depo bilgisi — entry/exit/kap/ücretler */
  entryDate?: string
  exitDate?: string
  kapCount: number
  ratePerDay: number
  ratePerWeek: number
  ratePerMonth: number
  pricingType: 'gun' | 'hafta' | 'ay'

  /** Warehouse type code (R/S/T/U/V/Y/Z) — transit alert için */
  warehouseTypeCode?: string

  /** storage_data JSON string (handling + transit_expiry_date içerir) */
  storageDataStr?: string
  onChangeStorageData: (json: string) => void

  /** depo_stock_log JSON string */
  stockLogStr?: string
  onChangeStockLog: (json: string) => void
}

export function StorageSection({
  currency, entryDate, exitDate, kapCount,
  ratePerDay, ratePerWeek, ratePerMonth, pricingType,
  warehouseTypeCode, storageDataStr, onChangeStorageData,
  stockLogStr, onChangeStockLog,
}: Props) {
  const sym = currencySymbol(currency)

  // Storage cost otomatik hesap
  const storageCost = useMemo(() => calcStorageCost({
    entry_date: entryDate,
    exit_date: exitDate,
    kap_count: kapCount,
    rate_per_day: ratePerDay,
    rate_per_week: ratePerWeek,
    rate_per_month: ratePerMonth,
    pricing_type: pricingType,
  }), [entryDate, exitDate, kapCount, ratePerDay, ratePerWeek, ratePerMonth, pricingType])

  // storage_data parse
  const storageData = useMemo(() => {
    if (!storageDataStr) return {} as Record<string, unknown>
    try { return JSON.parse(storageDataStr) || {} } catch { return {} }
  }, [storageDataStr])

  const handlingData: HandlingData = (storageData.ell as HandlingData) || {}

  const updateStorageData = (patch: Record<string, unknown>) => {
    const next = { ...storageData, ...patch }
    onChangeStorageData(JSON.stringify(next))
  }

  // Transit alert
  const transitAlert = useMemo(() => computeTransitAlert({
    warehouse_type: warehouseTypeCode,
    entry_date: entryDate,
    transit_expiry_date: storageData.transit_expiry_date as string | undefined,
    transit_alert_dismissed: storageData.transit_alert_dismissed as boolean | undefined,
  }), [warehouseTypeCode, entryDate, storageData])

  // Stok log
  const stockLog = useMemo<StockMovement[]>(() => {
    if (!stockLogStr) return []
    try { return migrateStockLog(JSON.parse(stockLogStr)) } catch { return [] }
  }, [stockLogStr])

  const stockSummary = useMemo(() => stockLogSummary(stockLog), [stockLog])

  const setStockLog = (next: StockMovement[]) => {
    onChangeStockLog(JSON.stringify(next))
  }

  // Handling totals
  const handlingTotals = useMemo(() => calcHandlingTotals(handlingData), [handlingData])

  // Genel toplam (storage + handling)
  const grandTotalSales = storageCost.selected_total + handlingTotals.totalSales
  const grandTotalCost = handlingTotals.totalCost  // storage_cost satış kabul edilir, maliyet ayrı tutulur
  const grandProfit = grandTotalSales - grandTotalCost

  return (
    <div className="space-y-4">
      {/* Transit Alert Banner */}
      {transitAlert.active && (
        <Card className={cn(
          'p-3 border-2 flex items-start gap-3',
          transitAlert.severity === 'danger' && 'border-destructive bg-destructive/10',
          transitAlert.severity === 'warning' && 'border-warning bg-warning/10',
          transitAlert.severity === 'info' && 'border-primary bg-primary/10',
        )}>
          <AlertTriangle className={cn(
            'w-5 h-5 shrink-0 mt-0.5',
            transitAlert.severity === 'danger' && 'text-destructive',
            transitAlert.severity === 'warning' && 'text-warning',
            transitAlert.severity === 'info' && 'text-primary',
          )} />
          <div className="flex-1">
            <div className="font-semibold text-sm">{transitAlert.message}</div>
            {transitAlert.expiry_date && (
              <div className="text-xs text-muted-foreground mt-1">
                Son geçerlilik: <strong>{formatDate(transitAlert.expiry_date)}</strong>
              </div>
            )}
          </div>
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={() => updateStorageData({ transit_alert_dismissed: true })}
          >
            Tamam
          </Button>
        </Card>
      )}

      {/* Storage Cost özeti */}
      <Card className="p-4 bg-gradient-to-br from-accent/30 to-transparent">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Package className="w-4 h-4 text-primary" />
            <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
              Depolama Bedeli (otomatik)
            </span>
          </div>
          <Badge variant="outline">
            {storageCost.days} gün / {storageCost.weeks} hafta / {storageCost.months} ay
          </Badge>
        </div>
        <div className="grid grid-cols-3 gap-3 mb-3">
          <CostCard label="Günlük" total={storageCost.daily_total} active={pricingType === 'gun'} sym={sym} />
          <CostCard label="Haftalık" total={storageCost.weekly_total} active={pricingType === 'hafta'} sym={sym} />
          <CostCard label="Aylık" total={storageCost.monthly_total} active={pricingType === 'ay'} sym={sym} />
        </div>
        {storageCost.formula && (
          <div className="text-xs text-muted-foreground italic flex items-center gap-1.5">
            <Info className="w-3 h-3" /> {storageCost.formula}
          </div>
        )}
      </Card>

      {/* Handling (Elleçleme) KDV tablosu */}
      <Card className="p-4">
        <div className="flex items-center justify-between mb-3">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
            Elleçleme Kalemleri + KDV
          </span>
          <Badge variant="outline">Para birimi: {currency}</Badge>
        </div>
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase text-muted-foreground">
                  Kalem
                </th>
                <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase text-success">
                  Satış ({sym})
                </th>
                <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase text-success w-[100px]">
                  KDV %
                </th>
                <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase text-destructive">
                  Maliyet ({sym})
                </th>
                <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase text-destructive w-[100px]">
                  KDV %
                </th>
              </tr>
            </thead>
            <tbody>
              {HANDLING_ITEMS.map((item) => (
                <HandlingRow
                  key={item.key}
                  itemKey={item.key}
                  label={item.label}
                  data={handlingData}
                  onChange={(patch) => updateStorageData({ ell: { ...handlingData, ...patch } })}
                />
              ))}
            </tbody>
            <tfoot className="bg-muted/40 border-t-2">
              <tr>
                <td className="px-3 py-2 text-xs font-semibold uppercase text-muted-foreground">Toplam</td>
                <td className="px-2 py-2 text-right tabular-nums font-semibold text-success">
                  {formatMoney(handlingTotals.totalSales, currency)}
                </td>
                <td className="px-2 py-2 text-right text-[10px] text-success">
                  +{formatMoney(handlingTotals.totalSalesVat, currency)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums font-semibold text-destructive">
                  {formatMoney(handlingTotals.totalCost, currency)}
                </td>
                <td className="px-2 py-2 text-right text-[10px] text-destructive">
                  +{formatMoney(handlingTotals.totalCostVat, currency)}
                </td>
              </tr>
            </tfoot>
          </table>
        </div>
      </Card>

      {/* Genel toplam */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <TotalsBox icon={<TrendingUp className="w-3.5 h-3.5" />} label="Depo + Elleçleme Satış" value={formatMoney(grandTotalSales, currency)} variant="success" />
        <TotalsBox icon={<TrendingDown className="w-3.5 h-3.5" />} label="Toplam Maliyet" value={formatMoney(grandTotalCost, currency)} variant="destructive" />
        <TotalsBox icon={<Coins className="w-3.5 h-3.5" />} label="Brüt Kâr" value={formatMoney(grandProfit, currency)} variant="primary" />
        <TotalsBox label="Stok (Kap)" value={String(stockSummary.currentStock)} variant={stockSummary.currentStock > 0 ? 'warning' : 'success'} />
      </div>

      {/* Stok Log */}
      <Card className="p-4 space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
            <Clock className="w-3.5 h-3.5" /> Stok Hareketleri
          </span>
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="success" className="gap-1">
              <ArrowUpCircle className="w-3 h-3" />
              Giriş: {stockSummary.totalIn}
            </Badge>
            <Badge variant="destructive" className="gap-1">
              <ArrowDownCircle className="w-3 h-3" />
              Çıkış: {stockSummary.totalOut}
            </Badge>
            <Badge variant="default">Bakiye: {stockSummary.currentStock}</Badge>
          </div>
        </div>

        <StockLogEditor log={stockLog} onChange={setStockLog} />
      </Card>
    </div>
  )
}

// === Storage cost kartı ===
function CostCard({ label, total, active, sym }: { label: string; total: number; active: boolean; sym: string }) {
  return (
    <div className={cn(
      'rounded-md border p-2.5 text-center',
      active && 'border-primary bg-primary/5 ring-1 ring-primary/30',
    )}>
      <div className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</div>
      <div className={cn('text-base font-bold tabular-nums mt-0.5', active && 'text-primary')}>
        {total > 0 ? `${sym}${total.toFixed(2)}` : '—'}
      </div>
      {active && <div className="text-[9px] text-primary font-medium mt-0.5">SEÇİLİ</div>}
    </div>
  )
}

// === Handling satırı ===
function HandlingRow({
  itemKey, label, data, onChange,
}: {
  itemKey: string
  label: string
  data: HandlingData
  onChange: (patch: HandlingData) => void
}) {
  const sales = data[`${itemKey}_sales`] || ''
  const cost = data[`${itemKey}_cost`] || ''
  const salesVat = String(data[`${itemKey}_sales_vat`] || '20')
  const costVat = String(data[`${itemKey}_cost_vat`] || '20')

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="px-3 py-1.5 text-sm">{label}</td>
      <td className="px-2 py-1">
        <Input
          type="number" step="0.01" placeholder="0,00"
          value={String(sales)}
          onChange={(e) => onChange({ ...data, [`${itemKey}_sales`]: e.target.value })}
          className="h-8 text-right tabular-nums bg-success/5 border-success/20"
        />
      </td>
      <td className="px-2 py-1">
        <VatSimplePicker
          itemKey={itemKey} side="sales" data={data} onChange={onChange}
        />
      </td>
      <td className="px-2 py-1">
        <Input
          type="number" step="0.01" placeholder="0,00"
          value={String(cost)}
          onChange={(e) => onChange({ ...data, [`${itemKey}_cost`]: e.target.value })}
          className="h-8 text-right tabular-nums bg-destructive/5 border-destructive/20"
        />
      </td>
      <td className="px-2 py-1">
        <VatSimplePicker
          itemKey={itemKey} side="cost" data={data} onChange={onChange}
        />
      </td>
    </tr>
  )
}

function VatSimplePicker({
  itemKey, side, data, onChange,
}: {
  itemKey: string
  side: 'sales' | 'cost'
  data: HandlingData
  onChange: (patch: HandlingData) => void
}) {
  const k = `${itemKey}_${side}_vat`
  const v = String(data[k] || '20')
  const isCustom = v === 'custom'
  const customK = `${itemKey}_${side}_vat_custom`
  const customVal = String(data[customK] || '')

  return (
    <div className="space-y-1">
      <Select value={v} onValueChange={(nv) => onChange({ ...data, [k]: nv })}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {VAT_RATES.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          type="number" step="0.01" placeholder="%"
          value={customVal}
          onChange={(e) => onChange({ ...data, [customK]: e.target.value })}
          className="h-6 text-xs text-right tabular-nums"
        />
      )}
    </div>
  )
}

// === Stok log editor ===
function StockLogEditor({ log, onChange }: { log: StockMovement[]; onChange: (next: StockMovement[]) => void }) {
  const [entryDate, setEntryDate] = useState('')
  const [exitDate, setExitDate] = useState('')
  const [inQty, setInQty] = useState('')
  const [outQty, setOutQty] = useState('')
  const [note, setNote] = useState('')

  const summary = stockLogSummary(log)

  const addMovement = () => {
    const inN = parseInt(inQty || '0', 10) || 0
    const outN = parseInt(outQty || '0', 10) || 0
    if (!entryDate && !inN && !outN) return
    if (!inN && !outN) {
      alert('Giriş veya çıkış miktarı girin')
      return
    }
    if (exitDate && entryDate && exitDate < entryDate) {
      alert('Çıkış tarihi giriş tarihinden önce olamaz')
      return
    }
    const next = [...log, {
      entry_date: entryDate || new Date().toISOString().slice(0, 10),
      exit_date: exitDate || '',
      in: inN,
      out: outN,
      note: note.trim(),
    }]
    next.sort((a, b) => (a.entry_date || '').localeCompare(b.entry_date || ''))
    onChange(next)
    setInQty('')
    setOutQty('')
    setNote('')
    setExitDate('')
  }

  const updateField = (idx: number, field: keyof StockMovement, value: string | number) => {
    const next = [...log]
    if (field === 'in' || field === 'out') {
      ;(next[idx] as unknown as Record<string, unknown>)[field] = parseInt(String(value), 10) || 0
    } else {
      ;(next[idx] as unknown as Record<string, unknown>)[field] = value
    }
    onChange(next)
  }

  const remove = (idx: number) => {
    if (!confirm('Bu hareketi silmek istiyor musun?')) return
    onChange(log.filter((_, i) => i !== idx))
  }

  return (
    <div className="space-y-3">
      {/* Hareket ekleme formu */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-2 p-3 rounded-md bg-muted/30 border border-dashed">
        <div className="space-y-1">
          <Label className="text-[10px] text-success">Giriş Tarihi</Label>
          <Input type="date" value={entryDate} onChange={(e) => setEntryDate(e.target.value)} className="h-8 text-xs" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-destructive">Çıkış Tarihi</Label>
          <Input type="date" value={exitDate} onChange={(e) => setExitDate(e.target.value)} className="h-8 text-xs" placeholder="—" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-success">Giriş Kap</Label>
          <Input type="number" min="0" value={inQty} onChange={(e) => setInQty(e.target.value)} className="h-8 text-right tabular-nums" />
        </div>
        <div className="space-y-1">
          <Label className="text-[10px] text-destructive">Çıkış Kap</Label>
          <Input type="number" min="0" value={outQty} onChange={(e) => setOutQty(e.target.value)} className="h-8 text-right tabular-nums" />
        </div>
        <div className="space-y-1 col-span-2 md:col-span-1">
          <Label className="text-[10px]">Not (ops.)</Label>
          <Input value={note} onChange={(e) => setNote(e.target.value)} className="h-8 text-xs" placeholder="..." />
        </div>
        <div className="flex items-end">
          <Button type="button" size="sm" onClick={addMovement} className="h-8 w-full">
            <Plus className="w-3.5 h-3.5" />
            Ekle
          </Button>
        </div>
      </div>

      {/* Hareket tablosu */}
      {log.length === 0 ? (
        <div className="text-center text-xs text-muted-foreground italic py-6 border-2 border-dashed rounded">
          Henüz stok hareketi yok
        </div>
      ) : (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-left px-2 py-1.5 text-success font-semibold">Giriş</th>
                <th className="text-left px-2 py-1.5 text-destructive font-semibold">Çıkış</th>
                <th className="text-center px-2 py-1.5 text-teal-600 font-semibold">Bekleme</th>
                <th className="text-center px-2 py-1.5 text-success font-semibold">Giriş Kap</th>
                <th className="text-center px-2 py-1.5 text-destructive font-semibold">Çıkış Kap</th>
                <th className="text-center px-2 py-1.5 text-primary font-semibold">Bakiye</th>
                <th className="text-left px-2 py-1.5 text-muted-foreground font-semibold">Not</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {summary.enriched.map((r, i) => (
                <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                  <td className="px-2 py-1">
                    <Input type="date" value={r.entry_date} onChange={(e) => updateField(i, 'entry_date', e.target.value)} className="h-7 text-xs bg-success/5" />
                  </td>
                  <td className="px-2 py-1">
                    <Input type="date" value={r.exit_date} onChange={(e) => updateField(i, 'exit_date', e.target.value)} className="h-7 text-xs bg-destructive/5" />
                  </td>
                  <td className="px-2 py-1 text-center">
                    {r.days !== null ? (
                      <span className={r.ongoing ? 'text-warning font-medium' : 'text-teal-600 font-medium'}>
                        {r.days} gün {r.ongoing && '⏱'}
                      </span>
                    ) : <span className="text-muted-foreground">—</span>}
                  </td>
                  <td className="px-2 py-1">
                    <Input type="number" min="0" value={r.in || ''} onChange={(e) => updateField(i, 'in', e.target.value)} className="h-7 text-center tabular-nums text-success" />
                  </td>
                  <td className="px-2 py-1">
                    <Input type="number" min="0" value={r.out || ''} onChange={(e) => updateField(i, 'out', e.target.value)} className="h-7 text-center tabular-nums text-destructive" />
                  </td>
                  <td className="px-2 py-1 text-center font-bold text-primary tabular-nums">
                    {r.runningBalance}
                  </td>
                  <td className="px-2 py-1">
                    <Input value={r.note} onChange={(e) => updateField(i, 'note', e.target.value)} className="h-7 text-xs" />
                  </td>
                  <td className="px-2 py-1">
                    <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => remove(i)}>
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

function TotalsBox({ icon, label, value, variant = 'primary' }: {
  icon?: React.ReactNode; label: string; value: string;
  variant?: 'success' | 'destructive' | 'primary' | 'warning'
}) {
  const colors = {
    success: 'text-success bg-success/5 border-success/20',
    destructive: 'text-destructive bg-destructive/5 border-destructive/20',
    primary: 'text-primary bg-primary/5 border-primary/20',
    warning: 'text-warning bg-warning/5 border-warning/20',
  }
  return (
    <Card className={cn('p-2.5 border', colors[variant])}>
      <div className="flex items-center gap-1.5 mb-1">
        {icon}
        <span className="text-[10px] font-semibold uppercase tracking-wider">{label}</span>
      </div>
      <div className="text-base font-bold tabular-nums">{value}</div>
    </Card>
  )
}
