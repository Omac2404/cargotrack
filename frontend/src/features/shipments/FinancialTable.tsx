import { useMemo, useState } from 'react'
import { TrendingUp, TrendingDown, Coins, Plus, Trash2, StickyNote } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import { Card } from '@/components/ui/card'
import { cn, formatMoney, formatNumber } from '@/lib/utils'
import {
  getFinSchema, VAT_RATES, calcFinTotals, DEFAULT_VAT_RATE,
  finGroupI18nKey, finItemI18nKey,
  type FinancialData, type FinLineEntry,
} from '@/lib/constants/finSchemas'
import { useTranslation } from 'react-i18next'
import { currencySymbol } from '@/lib/constants'

interface Props {
  mode: string
  currency: string
  value: FinancialData
  onChange: (data: FinancialData) => void
}

/**
 * Kalem gerçekten boş mu?
 *
 * Eskiden `!income && !expense && !note` kontrol ediliyordu. Bu iki şeyi bozuyordu:
 *   1) "Özel Kalem" butonu satırı income=0 ile ekliyordu; 0 falsy olduğu için
 *      satır eklendiği anda tekrar siliniyor, butona basınca hiçbir şey olmuyordu.
 *   2) Tutarı 0 girilen ya da yalnızca adı/açıklaması yazılmış kalemler siliniyordu.
 * Artık "değer var mı" diye bakılıyor, "değer doğru mu" diye değil.
 */
/** Kullanıcının elle eklediği kalem mi? (anahtar `custom_<grup>_<zaman>` biçiminde) */
function isCustomKey(key: string): boolean {
  return key.startsWith('custom_')
}

function isEmptyEntry(e: FinLineEntry | undefined): boolean {
  if (!e) return true
  const hasNumber = (v: unknown) => v !== undefined && v !== null && v !== ''
  const hasText = (v: unknown) => typeof v === 'string' && v.trim() !== ''
  return !hasNumber(e.income) && !hasNumber(e.expense) && !hasText(e.note) && !hasText(e.label)
}

/**
 * FIN_SCHEMAS tabanlı kalem-bazlı finansal tablo (PHP renderFinTable port).
 * Her kalem için: Gelir + KDV%, Gider + KDV%
 * Sonunda: Ara toplam, KDV toplam, Genel toplam, Kâr, Marj %
 */
export function FinancialTable({ mode, currency, value, onChange }: Props) {
  const { t } = useTranslation()
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
    // Şema kalemleri boşaltılınca temizlenir; kullanıcının eklediği özel kalemler
    // yalnızca çöp kutusu butonuyla silinir — yoksa adını silip yeniden yazmaya
    // çalışırken satır ortadan kayboluyor.
    if (!isCustomKey(key) && isEmptyEntry(next[key])) {
      delete next[key]
    }
    onChange(next)
  }

  const removeEntry = (key: string) => {
    const next: FinancialData = { ...value }
    delete next[key]
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
                {t('fin.ui.item')}
              </th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-success">
                {t('fin.ui.income')} ({sym})
              </th>
              <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-success w-[110px]">
                {t('fin.ui.vat')} %
              </th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-destructive">
                {t('fin.ui.expense')} ({sym})
              </th>
              <th className="text-center px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-destructive w-[110px]">
                {t('fin.ui.vat')} %
              </th>
              <th className="text-right px-2 py-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground w-[100px]">
                {t('fin.ui.profit')}
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
                onRemoveEntry={removeEntry}
                sym={sym}
              />
            ))}
          </tbody>
          {/* Toplamlar — faturadaki yapının aynısı:
              hizmetler KDV matrahı, vergiler (débours) matrah dışı, sonra net tutar */}
          <tfoot className="bg-muted/40 border-t-2">
            <tr>
              <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {t('fin.ui.services_total')}
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
                {formatMoney(totals.totalIncome - totals.totalExpense, currency)}
              </td>
            </tr>
            {(totals.deboursIncome > 0 || totals.deboursExpense > 0) && (
              <tr>
                <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                  {t('fin.ui.debours')}
                  <span className="ml-1 normal-case font-normal text-[10px]">({t('fin.ui.debours_hint')})</span>
                </td>
                <td colSpan={2} className="px-2 py-2 text-right tabular-nums font-semibold text-success">
                  {formatMoney(totals.deboursIncome, currency)}
                </td>
                <td colSpan={2} className="px-2 py-2 text-right tabular-nums font-semibold text-destructive">
                  {formatMoney(totals.deboursExpense, currency)}
                </td>
                <td className="px-2 py-2 text-right tabular-nums font-bold">
                  {formatMoney(totals.deboursIncome - totals.deboursExpense, currency)}
                </td>
              </tr>
            )}
            <tr className="bg-primary/5">
              <td className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-primary">
                {t('fin.ui.net_payable')}
              </td>
              <td colSpan={2} className="px-2 py-2 text-right tabular-nums font-bold text-success">
                {formatMoney(totals.netPayableIncome, currency)}
              </td>
              <td colSpan={2} className="px-2 py-2 text-right tabular-nums font-bold text-destructive">
                {formatMoney(totals.netPayableExpense, currency)}
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
        <SummaryBox icon={<TrendingUp className="w-3.5 h-3.5" />} label={t('fin.ui.total_revenue')} value={formatMoney(totals.grossIncome, currency)} variant="success" />
        <SummaryBox icon={<TrendingDown className="w-3.5 h-3.5" />} label={t('fin.ui.total_cost')} value={formatMoney(totals.grossExpense, currency)} variant="destructive" />
        <SummaryBox icon={<Coins className="w-3.5 h-3.5" />} label={t('fin.ui.gross_profit')} value={formatMoney(totals.profit, currency)} variant="primary" />
        <SummaryBox label={t('fin.ui.margin')} value={`${formatNumber(totals.margin, 2)}%`} variant={totals.margin >= 15 ? 'success' : totals.margin >= 5 ? 'warning' : 'destructive'} />
      </div>
    </div>
  )
}

interface FinGroupProps {
  groupName: string
  items: ReturnType<typeof getFinSchema>
  value: FinancialData
  onSetEntry: (key: string, patch: Partial<FinLineEntry>) => void
  onRemoveEntry: (key: string) => void
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

function FinGroup({ groupName, items, value, onSetEntry, onRemoveEntry, sym }: FinGroupProps) {
  const { t } = useTranslation()
  const customKeys = getCustomKeysForGroup(value, groupName)

  const addCustomItem = () => {
    const newKey = `custom_${slugifyGroup(groupName)}_${Date.now()}`
    // Sadece label ver: income:0 falsy olduğu için satır anında siliniyordu
    onSetEntry(newKey, { label: '' , note: '' })
  }

  return (
    <>
      <tr className="bg-accent/30">
        <td colSpan={5} className="px-3 py-1.5 text-[10px] font-semibold uppercase tracking-wider text-accent-foreground">
          {finGroupI18nKey(groupName) ? t(finGroupI18nKey(groupName)) : groupName}
        </td>
        <td className="px-2 py-1 text-right">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 px-2 text-[10px] hover:bg-primary/10 hover:text-primary"
            onClick={addCustomItem}
            title={t('fin.ui.add_custom')}
          >
            <Plus className="w-3 h-3" />
            {t('fin.ui.custom_item')}
          </Button>
        </td>
      </tr>
      {items.map((item) => (
        <FinRow key={item.key} item={item} entry={value[item.key] || {}} onSetEntry={onSetEntry} sym={sym} />
      ))}

      {/* Custom (kullanıcı-eklenmiş) kalemler */}
      {customKeys.map((key) => (
        <CustomFinRow
          key={key}
          rowKey={key}
          entry={value[key] || {}}
          onSetEntry={onSetEntry}
          onRemove={onRemoveEntry}
          sym={sym}
        />
      ))}
    </>
  )
}

/**
 * Şema kalemi satırı (Navlun, Sigorta, Diğer...).
 * Etiketin yanındaki not ikonuyla o kaleme açıklama yazılabilir; açıklama
 * doluysa alan kalıcı olarak açık kalır.
 */
function FinRow({
  item, entry, onSetEntry, sym,
}: {
  item: ReturnType<typeof getFinSchema>[number]
  entry: FinLineEntry
  onSetEntry: (key: string, patch: Partial<FinLineEntry>) => void
  sym: string
}) {
  const { t } = useTranslation()
  const [noteOpen, setNoteOpen] = useState(false)
  const showNote = noteOpen || !!entry.note
  const noVat = item.noVat

  return (
    <tr className="border-b border-border/40 hover:bg-muted/20">
      <td className="px-3 py-1.5 text-sm">
        <div className="flex items-center gap-1">
          <span className="flex-1">{t(finItemI18nKey(item.key), { defaultValue: item.label || item.key })}</span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className={cn(
              'h-5 w-5 shrink-0',
              entry.note ? 'text-primary' : 'text-muted-foreground/50 hover:text-foreground'
            )}
            onClick={() => setNoteOpen((v) => !v)}
            title={entry.note ? t('fin.ui.edit_note') : t('fin.ui.add_note')}
          >
            <StickyNote className="w-3 h-3" />
          </Button>
        </div>
        {showNote && (
          <Input
            value={entry.note || ''}
            onChange={(e) => onSetEntry(item.key, { note: e.target.value })}
            placeholder={t('fin.ui.note_ph')}
            className="h-6 text-[11px] mt-1 text-muted-foreground border-dashed"
            autoFocus={noteOpen && !entry.note}
          />
        )}
      </td>

      {/* Gelir */}
      <td className="px-2 py-1">
        <Input
          type="number"
          step="0.01"
          placeholder="0,00"
          value={entry.income ?? ''}
          onChange={(e) => onSetEntry(item.key, { income: e.target.value === '' ? undefined : Number(e.target.value) })}
          className="h-8 text-right tabular-nums bg-success/5 border-success/20"
        />
      </td>

      {/* Gelir KDV */}
      <td className="px-2 py-1">
        {noVat ? (
          <span className="text-[10px] text-muted-foreground">—</span>
        ) : (
          <VatPicker
            value={entry.income_vat || DEFAULT_VAT_RATE}
            customValue=""
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
          onChange={(e) => onSetEntry(item.key, { expense: e.target.value === '' ? undefined : Number(e.target.value) })}
          className="h-8 text-right tabular-nums bg-destructive/5 border-destructive/20"
        />
      </td>

      {/* Gider KDV */}
      <td className="px-2 py-1">
        {noVat ? (
          <span className="text-[10px] text-muted-foreground">—</span>
        ) : (
          <VatPicker
            value={entry.expense_vat || DEFAULT_VAT_RATE}
            customValue=""
            onChange={(v, custom) => onSetEntry(item.key, { expense_vat: v === 'custom' ? `custom:${custom || 0}` : v })}
          />
        )}
      </td>

      {/* Kâr */}
      <td className="px-2 py-1 text-right tabular-nums text-xs">
        <LineProfit entry={entry} sym={sym} />
      </td>
    </tr>
  )
}

/** Tek satırın gelir-gider farkı */
function LineProfit({ entry, sym }: { entry: FinLineEntry; sym: string }) {
  const income = Number(entry.income || 0)
  const expense = Number(entry.expense || 0)
  const diff = income - expense
  if (income === 0 && expense === 0) return <span className="text-muted-foreground">—</span>
  return (
    <span className={diff >= 0 ? 'text-success font-medium' : 'text-destructive font-medium'}>
      {sym}{diff.toFixed(2)}
    </span>
  )
}

interface CustomFinRowProps {
  rowKey: string
  entry: FinLineEntry
  onSetEntry: (key: string, patch: Partial<FinLineEntry>) => void
  onRemove: (key: string) => void
  sym: string
}

function CustomFinRow({ rowKey, entry, onSetEntry, onRemove, sym }: CustomFinRowProps) {
  const { t } = useTranslation()
  return (
    <tr className="border-b border-border/40 hover:bg-muted/20 bg-primary/5">
      <td className="px-3 py-1.5">
        <div className="space-y-1">
          <div className="flex items-center gap-1">
            <Input
              value={entry.label || ''}
              onChange={(e) => onSetEntry(rowKey, { label: e.target.value })}
              placeholder={t('fin.ui.item_name_ph')}
              className="h-7 text-xs border-primary/30"
              autoFocus={!entry.label && !entry.note}
            />
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0"
              onClick={() => onRemove(rowKey)}
              title={t('fin.ui.delete_item')}
            >
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
          {/* Açıklama — faturaya/dosyaya not düşmek için */}
          <Input
            value={entry.note || ''}
            onChange={(e) => onSetEntry(rowKey, { note: e.target.value })}
            placeholder={t('fin.ui.note_ph')}
            className="h-6 text-[11px] text-muted-foreground border-dashed"
          />
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
          value={entry.income_vat || DEFAULT_VAT_RATE}
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
          value={entry.expense_vat || DEFAULT_VAT_RATE}
          customValue=""
          onChange={(v, custom) => onSetEntry(rowKey, { expense_vat: v === 'custom' ? `custom:${custom || 0}` : v })}
        />
      </td>
      <td className="px-2 py-1 text-right tabular-nums text-xs">
        <LineProfit entry={entry} sym={sym} />
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
