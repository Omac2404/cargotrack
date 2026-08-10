import { useMemo, useState } from 'react'
import { Plus, Trash2, Boxes, Copy, Search, ChevronDown, ChevronRight } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { CountryCombobox } from '@/components/shared/CountryCombobox'
import { PackageTypeCombobox } from '@/components/shared/PackageTypeCombobox'
import { cn, formatNumber } from '@/lib/utils'
import type { GoodsItem } from '@/types/api'

interface Props {
  /** goods_items JSON string */
  value?: string
  onChange: (json: string) => void
  currency: string
}

export interface GoodsTotals {
  quantity: number
  gross_weight: number
  net_weight: number
  volume_cbm: number
  value: number
}

/** Kalem listesinden üst seviye yük toplamlarını hesaplar. */
export function calcGoodsTotals(items: GoodsItem[]): GoodsTotals {
  return items.reduce<GoodsTotals>(
    (acc, it) => ({
      quantity: acc.quantity + (Number(it.quantity) || 0),
      gross_weight: acc.gross_weight + (Number(it.gross_weight) || 0),
      net_weight: acc.net_weight + (Number(it.net_weight) || 0),
      volume_cbm: acc.volume_cbm + (Number(it.volume_cbm) || 0),
      value: acc.value + (Number(it.value) || 0),
    }),
    { quantity: 0, gross_weight: 0, net_weight: 0, volume_cbm: 0, value: 0 }
  )
}

/** goods_items string'ini güvenli biçimde diziye çevirir. */
export function parseGoodsItems(raw: string | undefined | null): GoodsItem[] {
  if (!raw) return []
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw
    return Array.isArray(parsed) ? (parsed as GoodsItem[]) : []
  } catch {
    return []
  }
}

const EMPTY_ITEM: GoodsItem = {
  description: '', hs_code: '', origin_country: '', quantity: undefined,
  package_type: '', gross_weight: undefined, net_weight: undefined,
  volume_cbm: undefined, value: undefined, note: '',
}

/**
 * Çoklu ürün/kalem editörü.
 *
 * Bir sevkiyatta birden fazla ürün olabiliyor ve her birinin kendi HS kodu,
 * menşei, ağırlığı ve kıymeti bulunuyor (gümrük beyanı bunları kalem kalem ister).
 * Tek satırlık HS kodu / ağırlık alanları bunu karşılamıyordu.
 *
 * Üst seviye yük alanları bu listenin toplamıyla senkron tutulur — araç ataması
 * ve kapasite kontrolü o alanları kullandığı için ikisinin ayrışmaması kritik.
 */
export function GoodsEditor({ value, onChange, currency }: Props) {
  const items = useMemo(() => parseGoodsItems(value), [value])
  const totals = useMemo(() => calcGoodsTotals(items), [items])
  const [expanded, setExpanded] = useState<number | null>(null)

  const commit = (next: GoodsItem[]) => onChange(next.length ? JSON.stringify(next) : '')

  const addItem = () => {
    commit([...items, { ...EMPTY_ITEM }])
    setExpanded(items.length)
  }

  const duplicateItem = (idx: number) => {
    const next = [...items]
    next.splice(idx + 1, 0, { ...items[idx] })
    commit(next)
  }

  const updateItem = (idx: number, patch: Partial<GoodsItem>) => {
    commit(items.map((it, i) => (i === idx ? { ...it, ...patch } : it)))
  }

  const removeItem = (idx: number) => {
    commit(items.filter((_, i) => i !== idx))
    setExpanded(null)
  }

  const numeric = (v: string): number | undefined => (v === '' ? undefined : Number(v))

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Boxes className="w-3.5 h-3.5" />
          Ürün / Kalem Listesi
          {items.length > 0 && <Badge variant="outline">{items.length} kalem</Badge>}
        </Label>
        <Button type="button" size="sm" variant="outline" className="h-7" onClick={addItem}>
          <Plus className="w-3.5 h-3.5" />
          Ürün Ekle
        </Button>
      </div>

      {items.length === 0 ? (
        <div className="rounded-md border border-dashed p-4 text-center">
          <p className="text-xs text-muted-foreground">
            Sevkiyatta birden fazla ürün varsa buraya kalem kalem gir — her ürünün kendi
            HS kodu, menşei, ağırlığı ve kıymeti olur.
          </p>
          <p className="text-[11px] text-muted-foreground mt-1">
            Liste doldurulduğunda üstteki Kap Adedi / Ağırlık / Hacim / Mal Değeri
            alanları toplamdan <strong>otomatik</strong> hesaplanır.
          </p>
          <Button type="button" size="sm" variant="outline" className="h-7 mt-2" onClick={addItem}>
            <Plus className="w-3.5 h-3.5" />
            İlk ürünü ekle
          </Button>
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item, idx) => {
            const isOpen = expanded === idx
            return (
              <div key={idx} className="rounded-md border bg-card overflow-hidden">
                {/* Satır başlığı — daima görünen özet */}
                <div className="flex items-center gap-2 p-2 bg-muted/30">
                  <button
                    type="button"
                    onClick={() => setExpanded(isOpen ? null : idx)}
                    className="flex items-center gap-1.5 text-xs font-medium hover:text-primary shrink-0"
                    title={isOpen ? 'Detayları gizle' : 'Detayları göster'}
                  >
                    {isOpen ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronRight className="w-3.5 h-3.5" />}
                    <span className="w-5 h-5 rounded bg-primary/10 text-primary flex items-center justify-center text-[10px] font-bold">
                      {idx + 1}
                    </span>
                  </button>

                  <Input
                    value={item.description || ''}
                    onChange={(e) => updateItem(idx, { description: e.target.value })}
                    placeholder="Ürün adı / mal tanımı"
                    className="h-7 text-xs flex-1 min-w-[140px]"
                  />

                  <div className="hidden md:flex items-center gap-1.5 text-[11px] text-muted-foreground shrink-0">
                    {item.hs_code && <Badge variant="secondary" className="font-mono">{item.hs_code}</Badge>}
                    {item.quantity ? <span>{item.quantity} kap</span> : null}
                    {item.gross_weight ? <span>{formatNumber(item.gross_weight, 0)} kg</span> : null}
                  </div>

                  <Button
                    type="button" variant="ghost" size="icon" className="h-6 w-6 shrink-0"
                    onClick={() => duplicateItem(idx)} title="Kalemi çoğalt"
                  >
                    <Copy className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button" variant="ghost" size="icon"
                    className="h-6 w-6 text-destructive hover:bg-destructive/10 shrink-0"
                    onClick={() => removeItem(idx)} title="Kalemi sil"
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>

                {/* Detay alanları */}
                {isOpen && (
                  <div className="p-3 space-y-3 border-t">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                      <div className="space-y-1">
                        <Label className="text-[10px]">HS Kodu</Label>
                        <div className="flex items-center gap-1">
                          <Input
                            value={item.hs_code || ''}
                            onChange={(e) => updateItem(idx, { hs_code: e.target.value })}
                            placeholder="örn. 3305.90.00"
                            className="h-8 text-xs font-mono"
                          />
                          <Button
                            type="button" variant="outline" size="icon" className="h-8 w-8 shrink-0"
                            title="Fransız Gümrük HS Kodu Arama (RITA)"
                            onClick={() => {
                              const t = new Date()
                              const d = String(t.getDate()).padStart(2, '0')
                              const m = String(t.getMonth() + 1).padStart(2, '0')
                              window.open(
                                `https://www.douane.gouv.fr/rita-encyclopedie/public/nomenclatures/popupNomenclature.action?date=${d}%2F${m}%2F${t.getFullYear()}&nomenclatureCritere=`,
                                '_blank', 'noopener,noreferrer'
                              )
                            }}
                          >
                            <Search className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Menşe Ülke</Label>
                        <CountryCombobox
                          value={item.origin_country || ''}
                          onChange={(v) => updateItem(idx, { origin_country: v })}
                          placeholder="Menşe ülke..."
                        />
                      </div>

                      <div className="space-y-1">
                        <Label className="text-[10px]">Paket / Ambalaj Tipi</Label>
                        <PackageTypeCombobox
                          value={item.package_type || ''}
                          onChange={(v) => updateItem(idx, { package_type: v })}
                          placeholder="Ambalaj tipi..."
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <NumField
                        label="Kap Adedi" value={item.quantity}
                        onChange={(v) => updateItem(idx, { quantity: numeric(v) })}
                      />
                      <NumField
                        label="Brüt Ağırlık" suffix="kg" step="0.01" value={item.gross_weight}
                        onChange={(v) => updateItem(idx, { gross_weight: numeric(v) })}
                      />
                      <NumField
                        label="Net Ağırlık" suffix="kg" step="0.01" value={item.net_weight}
                        onChange={(v) => updateItem(idx, { net_weight: numeric(v) })}
                      />
                      <NumField
                        label="Hacim" suffix="m³" step="0.001" value={item.volume_cbm}
                        onChange={(v) => updateItem(idx, { volume_cbm: numeric(v) })}
                      />
                      <NumField
                        label="Kıymet" suffix={currency} step="0.01" value={item.value}
                        onChange={(v) => updateItem(idx, { value: numeric(v) })}
                      />
                    </div>

                    <div className="space-y-1">
                      <Label className="text-[10px]">Açıklama / Not</Label>
                      <Input
                        value={item.note || ''}
                        onChange={(e) => updateItem(idx, { note: e.target.value })}
                        placeholder="Marka, model, seri no, ADR bilgisi..."
                        className="h-8 text-xs"
                      />
                    </div>
                  </div>
                )}
              </div>
            )
          })}

          {/* Toplam satırı */}
          <div className="rounded-md border bg-primary/5 border-primary/20 p-3">
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3 text-center">
              <TotalBox label="Toplam Kap" value={String(totals.quantity)} sub="kap" />
              <TotalBox label="Brüt Ağırlık" value={formatNumber(totals.gross_weight, 2)} sub="kg" />
              <TotalBox label="Net Ağırlık" value={formatNumber(totals.net_weight, 2)} sub="kg" />
              <TotalBox label="Hacim" value={formatNumber(totals.volume_cbm, 3)} sub="m³" />
              <TotalBox label="Toplam Kıymet" value={formatNumber(totals.value, 2)} sub={currency} />
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-2">
              Bu toplamlar yukarıdaki Yük Bilgileri alanlarına otomatik yazılır — araç ataması bu değerleri kullanır.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}

function NumField({
  label, value, onChange, suffix, step,
}: {
  label: string
  value: number | undefined
  onChange: (v: string) => void
  suffix?: string
  step?: string
}) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px]">{label}</Label>
      <div className="relative">
        <Input
          type="number"
          step={step}
          value={value ?? ''}
          onChange={(e) => onChange(e.target.value)}
          className={cn('h-8 text-xs text-right tabular-nums', suffix && 'pr-9')}
        />
        {suffix && (
          <span className="absolute right-2 top-1/2 -translate-y-1/2 text-[10px] text-muted-foreground pointer-events-none">
            {suffix}
          </span>
        )}
      </div>
    </div>
  )
}

function TotalBox({ label, value, sub }: { label: string; value: string; sub: string }) {
  return (
    <div>
      <div className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="text-lg font-bold tabular-nums">{value}</div>
      <div className="text-[10px] text-muted-foreground">{sub}</div>
    </div>
  )
}
