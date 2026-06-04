import { useMemo } from 'react'
import { TrendingUp, TrendingDown, Coins, Plus, Trash2 } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { cn, formatMoney, formatNumber } from '@/lib/utils'
import {
  getFinSchema, VAT_RATES, calcFinTotals,
  type FinancialData, type FinLineEntry,
} from '@/lib/constants/finSchemas'
import { currencySymbol } from '@/lib/constants'

interface Props {
  mode: string
  currency: string
  value: FinancialData
  onChange: (data: FinancialData) => void
}

/**
 * FIN_SCHEMAS tabanlı kalem-bazlı finansal tablo (PHP renderFinTable port).
 * Her kalem için: Gelir + KDV%, Gider + KDV%
 * Sonunda: Ara toplam, KDV toplam, Genel toplam, Kâr, Marj %
 */
export function FinancialTable({ mode, currency, value, onChange }: Props) {
  const schema = useMemo(() => getFinSchema(mode), [mode])
  const sym = currencySymbol(currency)

  // Grup başlıklarına göre kalemleri grupla
  const grouped = useMemo(() => {
    const map = new Map<string, typeof schema>()
    for (const item of schema) {
      if (!map.has(item.group)) map.set(item.group, [])
      map.get(item.group)!.push(item)
    }
    return Array.from(map.entries())
  }, [schema])

  const setEntry = (key: string, patch: Partial<FinLineEntry>) => {
    const next: FinancialData = { ...value, [key]: { ...value[key], ...patch } }
    // Boş kalemler temizle
    if (!next[key].income && !next[key].expense && !next[key].note) {
      delete next[key]
    }
    onChange(next)
  }

  const totals = useMemo(() => calcFinTotals(schema, value), [schema, value])

  return (
    <div className="space-y-3">
      <div className="overflow-x-auto rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/40 border-b">
            <tr>
              <th className="text-left px-3 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
                Kalem
              </th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-success">
                Gelir ({sym})
              </th>
              <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-success w-[110px]">
                KDV %
              </th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                Gider ({sym})
              </th>
              <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-destructive w-[110px]">
                KDV %
              </th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">
                Kâr
              </th>
            </tr>
          </thead>
          <tbody>
            {grouped.map(([groupName, items]) => (
              <FinGroup
                key={groupName}
                groupName={groupName}
                items={items}
                value={value}
                onSetEntry={setEntry}
                sym={sym}
              />
            ))}
          </tbody>
          <tfoot className="bg-muted/40 border-t-2">
            <tr>
              <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Ara Toplam
              </td>
              <td className="px-2 py-2 text-right tabular-nums font-semibold text-success">
                {formatMoney(totals.totalIncome, currency)}
              </td>
              <td className="px-2 py-2 text-right text-xs text-success">
                +{formatMoney(totals.totalIncomeVat, currency)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums font-semibold text-destructive">
                {formatMoney(totals.totalExpense, currency)}
              </td>
              <td className="px-2 py-2 text-right text-xs text-destructive">
                +{formatMoney(totals.totalExpenseVat, currency)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums font-bold">
                {formatMoney(totals.profit, currency)}
              </td>
            </tr>
            <tr className="bg-primary/5">
              <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary">
                KDV Dahil Toplam
              </td>
              <td colSpan={2} className="px-2 py-2 text-right tabular-nums font-bold text-success">
                {formatMoney(totals.totalIncomeWithVat, currency)}
              </td>
              <td colSpan={2} className="px-2 py-2 text-right tabular-nums font-bold text-destructive">
                {formatMoney(totals.totalExpenseWithVat, currency)}
              </td>
              <td className="px-2 py-2 text-right tabular-nums font-bold text-primary">
                {formatMoney(totals.profitWithVat, currency)}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* Özet kartları */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
        <SummaryBox icon={<TrendingUp className="w-3.5 h-3.5" />} label="Toplam Ciro" value={formatMoney(totals.totalIncome, currency)} variant="success" />
        <SummaryBox icon={<TrendingDown className="w-3.5 h-3.5" />} label="Toplam Maliyet" value={formatMoney(totals.totalExpense, currency)} variant="destructive" />
        <SummaryBox icon={<Coins className="w-3.5 h-3.5" />} label="Brüt Kâr" value={formatMoney(totals.profit, currency)} variant="primary" />
        <SummaryBox label="Marj" value={`${formatNumber(totals.margin, 2)}%`} variant={totals.margin >= 15 ? 'success' : totals.margin >= 5 ? 'warning' : 'destructive'} />
      </div>
    </div>
  )
}

interface FinGroupProps {
  groupName: string
  items: ReturnType<typeof getFinSchema>
  value: FinancialData
  onSetEntry: (key: string, patch: Partial<FinLineEntry>) => void
  sym: string
}

/** Bu gruba ait kullanıcı-eklenmiş custom item anahtarlarını bul */
function getCustomKeysForGroup(value: FinancialData, groupName: string): string[] {
  const prefix = `custom_${slugifyGroup(groupName)}_`
  return Object.keys(value).filter((k) => k.startsWith(prefix))
}

function slugifyGroup(name: string): string {
  return name
    .toLowerCase()
    .replace(/ç/g, 'c').replace(/ş/g, 's').replace(/ğ/g, 'g')
    .replace(/ı/g, 'i').replace(/ö/g, 'o').replace(/ü/g, 'u')
    .replace(/[^a-z0-9]+/g, '_')
    .replace(/^_+|_+$/g, '')
}

function FinGroup({ groupName, items, value, onSetEntry, sym }: FinGroupProps) {
  const customKeys = getCustomKeysForGroup(value, groupName)

  const addCustomItem = () => {
    const newKey = `custom_${slugifyGroup(groupName)}_${Date.now()}`
    onSetEntry(newKey, { label: 'Özel Kalem', income: 0 })
  }

  return (
    <>
      <tr className="bg-accent/30">
        <td colSpan={5} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
          {groupName}
        </td>
        <td className="px-2 py-1 text-right">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary"
            onClick={addCustomItem}
            title="Bu gruba özel kalem ekle"
          >
            <Plus className="w-3 h-3" />
            Özel Kalem
          </Button>
        </td>
      </tr>
      {items.map((item) => {
        const entry = value[item.key] || {}
        const noVat = item.noVat
        return (
          <tr key={item.key} className="border-b border-border/40 hover:bg-muted/20">
            <td className="px-3 py-1.5 text-sm">{item.label || item.key}</td>

            {/* Gelir */}
            <td className="px-2 py-1">
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={entry.income ?? ''}
                onChange={(e) => onSetEntry(item.key, { income: e.target.value ? Number(e.target.value) : undefined })}
                className="h-8 text-right tabular-nums bg-success/5 border-success/20"
              />
            </td>

            {/* Gelir KDV */}
            <td className="px-2 py-1">
              {noVat ? (
                <span className="text-[10px] text-muted-foreground">—</span>
              ) : (
                <VatPicker
                  value={entry.income_vat || '20'}
                  customValue={String(entry.income_vat || '') === 'custom' ? '' : ''}
                  onChange={(v, custom) => onSetEntry(item.key, { income_vat: v === 'custom' ? `custom:${custom || 0}` : v })}
                />
              )}
            </td>

            {/* Gider */}
            <td className="px-2 py-1">
              <Input
                type="number"
                step="0.01"
                placeholder="0,00"
                value={entry.expense ?? ''}
                onChange={(e) => onSetEntry(item.key, { expense: e.target.value ? Number(e.target.value) : undefined })}
                className="h-8 text-right tabular-nums bg-destructive/5 border-destructive/20"
              />
            </td>

            {/* Gider KDV */}
            <td className="px-2 py-1">
              {noVat ? (
                <span className="text-[10px] text-muted-foreground">—</span>
              ) : (
                <VatPicker
                  value={entry.expense_vat || '20'}
                  customValue={String(entry.expense_vat || '') === 'custom' ? '' : ''}
                  onChange={(v, custom) => onSetEntry(item.key, { expense_vat: v === 'custom' ? `custom:${custom || 0}` : v })}
                />
              )}
            </td>

            {/* Kâr (tek satır) */}
            <td className="px-2 py-1 text-right tabular-nums text-xs">
              {(() => {
                const income = entry.income || 0
                const expense = entry.expense || 0
                const diff = income - expense
                if (income === 0 && expense === 0) return <span className="text-muted-foreground">—</span>
                return (
                  <span className={diff >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
                    {sym}{diff.toFixed(2)}
                  </span>
                )
              })()}
            </td>
          </tr>
        )
      })}

      {/* Custom (kullanıcı-eklenmiş) kalemler */}
      {customKeys.map((key) => (
        <CustomFinRow
          key={key}
          rowKey={key}
          entry={value[key] || {}}
          onSetEntry={onSetEntry}
          sym={sym}
        />
      ))}
    </>
  )
}

interface CustomFinRowProps {
  rowKey: string
  entry: FinLineEntry
  onSetEntry: (key: string, patch: Partial<FinLineEntry>) => void
  sym: string
}

function CustomFinRow({ rowKey, entry, onSetEntry, sym }: CustomFinRowProps) {
  const handleDelete = () => {
    // Patch ile boş bırak; setEntry boş kalemleri otomatik siler (FinancialTable mantığı)
    onSetEntry(rowKey, { label: undefined, income: undefined, expense: undefined, note: undefined })
  }

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 bg-primary/5">
      <td className="px-3 py-1.5">
        <div className="flex items-center gap-1">
          <Input
            value={entry.label || ''}
            onChange={(e) => onSetEntry(rowKey, { label: e.target.value })}
            placeholder="Kalem adı..."
            className="h-7 text-xs border-primary/30"
          />
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0"
            onClick={handleDelete}
            title="Kalemi sil"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </td>
      <td className="px-2 py-1">
        <Input
          type="number" step="0.01" placeholder="0,00"
          value={entry.income ?? ''}
          onChange={(e) => onSetEntry(rowKey, { income: e.target.value ? Number(e.target.value) : undefined })}
          className="h-8 text-right tabular-nums bg-success/5 border-success/20"
        />
      </td>
      <td className="px-2 py-1">
        <VatPicker
          value={entry.income_vat || '20'}
          customValue=""
          onChange={(v, custom) => onSetEntry(rowKey, { income_vat: v === 'custom' ? `custom:${custom || 0}` : v })}
        />
      </td>
      <td className="px-2 py-1">
        <Input
          type="number" step="0.01" placeholder="0,00"
          value={entry.expense ?? ''}
          onChange={(e) => onSetEntry(rowKey, { expense: e.target.value ? Number(e.target.value) : undefined })}
          className="h-8 text-right tabular-nums bg-destructive/5 border-destructive/20"
        />
      </td>
      <td className="px-2 py-1">
        <VatPicker
          value={entry.expense_vat || '20'}
          customValue=""
          onChange={(v, custom) => onSetEntry(rowKey, { expense_vat: v === 'custom' ? `custom:${custom || 0}` : v })}
        />
      </td>
      <td className="px-2 py-1 text-right tabular-nums text-xs">
        {(() => {
          const income = entry.income || 0
          const expense = entry.expense || 0
          const diff = income - expense
          if (income === 0 && expense === 0) return <span className="text-muted-foreground">—</span>
          return (
            <span className={diff >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
              {sym}{diff.toFixed(2)}
            </span>
          )
        })()}
      </td>
    </tr>
  )
}

// === VAT picker (8 standart oran + custom) ===
function VatPicker({
  value, customValue, onChange,
}: { value: string; customValue: string; onChange: (val: string, custom?: string) => void }) {
  const isCustom = value.startsWith('custom:') || value === 'custom'
  const displayValue = isCustom ? 'custom' : value
  const customAmount = value.startsWith('custom:') ? value.slice(7) : customValue

  return (
    <div className="space-y-1">
      <Select value={displayValue} onValueChange={(v) => onChange(v, customAmount)}>
        <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
        <SelectContent>
          {VAT_RATES.map((r) => (
            <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      {isCustom && (
        <Input
          type="number"
          step="0.01"
          placeholder="%"
          value={customAmount}
          onChange={(e) => onChange('custom', e.target.value)}
          className="h-6 text-xs text-right tabular-nums"
        />
      )}
    </div>
  )
}

interface SummaryBoxProps {
  icon?: React.ReactNode
  label: string
  value: string
  variant?: 'success' | 'destructive' | 'primary' | 'warning'
}

function SummaryBox({ icon, label, value, variant = 'primary' }: SummaryBoxProps) {
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
