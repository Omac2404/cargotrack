import { useMemo, useState } from 'react'
import { Plus, Trash2, Package, Calculator } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatNumber } from '@/lib/utils'
import type { Crate } from '@/types/api'

interface Props {
  /** crates_data JSON string */
  value?: string
  onChange: (json: string) => void
}

/**
 * Kap (crate) listesi editor.
 * Her kalem: qty × (length × width × height cm) + ağırlık + açıklama
 * Otomatik toplam: adet, brüt ağırlık, hacim (m³), CBM.
 */
export function CratesEditor({ value, onChange }: Props) {
  const crates = useMemo<Crate[]>(() => {
    if (!value) return []
    try {
      const parsed = JSON.parse(value)
      return Array.isArray(parsed) ? parsed : []
    } catch { return [] }
  }, [value])

  const [draft, setDraft] = useState<Crate>({
    qty: 1, length: 0, width: 0, height: 0, weight: 0, description: '',
  })

  const setDraftField = (field: keyof Crate, val: string | number) => {
    setDraft((d) => ({ ...d, [field]: typeof d[field] === 'number' ? (Number(val) || 0) : val }))
  }

  const addCrate = () => {
    if (!draft.qty || draft.qty <= 0) return
    onChange(JSON.stringify([...crates, draft]))
    setDraft({ qty: 1, length: 0, width: 0, height: 0, weight: 0, description: '' })
  }

  const updateCrate = (idx: number, field: keyof Crate, val: string | number) => {
    const next = crates.map((c, i) => {
      if (i !== idx) return c
      const newVal = field === 'description' ? String(val) : Number(val) || 0
      return { ...c, [field]: newVal }
    })
    onChange(JSON.stringify(next))
  }

  const removeCrate = (idx: number) => {
    onChange(JSON.stringify(crates.filter((_, i) => i !== idx)))
  }

  // Toplamlar
  const totals = useMemo(() => {
    let totalQty = 0, totalWeight = 0, totalVolume = 0
    for (const c of crates) {
      const q = c.qty || 0
      totalQty += q
      totalWeight += q * (c.weight || 0)
      // hacim cm³ → m³ ÷ 1.000.000
      const volPerCrate = (c.length || 0) * (c.width || 0) * (c.height || 0) / 1_000_000
      totalVolume += q * volPerCrate
    }
    return { totalQty, totalWeight, totalVolume }
  }, [crates])

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
          <Package className="w-3.5 h-3.5" />
          Kap Listesi (boyut + adet)
        </Label>
        {crates.length > 0 && (
          <div className="flex items-center gap-2 text-xs">
            <Badge variant="outline">{totals.totalQty} adet</Badge>
            <Badge variant="outline">{formatNumber(totals.totalWeight, 1)} kg</Badge>
            <Badge variant="outline">{formatNumber(totals.totalVolume, 3)} m³</Badge>
          </div>
        )}
      </div>

      {/* Mevcut kaplar */}
      {crates.length > 0 && (
        <div className="overflow-x-auto rounded border">
          <table className="w-full text-xs">
            <thead className="bg-muted/40 border-b">
              <tr>
                <th className="text-center px-2 py-1.5 w-[60px]">Adet</th>
                <th className="text-center px-2 py-1.5">Boyut (cm)</th>
                <th className="text-right px-2 py-1.5 w-[100px]">Birim Ağr (kg)</th>
                <th className="text-right px-2 py-1.5 w-[100px]">Toplam (kg)</th>
                <th className="text-right px-2 py-1.5 w-[90px]">Hacim (m³)</th>
                <th className="text-left px-2 py-1.5">Açıklama</th>
                <th className="w-8"></th>
              </tr>
            </thead>
            <tbody>
              {crates.map((c, i) => {
                const itemVolume = (c.length || 0) * (c.width || 0) * (c.height || 0) / 1_000_000
                const totalWeight = (c.qty || 0) * (c.weight || 0)
                const totalVolume = (c.qty || 0) * itemVolume
                return (
                  <tr key={i} className="border-b border-border/40 hover:bg-muted/20">
                    <td className="px-2 py-1">
                      <Input type="number" min="1" value={c.qty || ''} onChange={(e) => updateCrate(i, 'qty', e.target.value)} className="h-7 text-center tabular-nums" />
                    </td>
                    <td className="px-2 py-1">
                      <div className="flex items-center gap-1">
                        <Input type="number" placeholder="L" value={c.length || ''} onChange={(e) => updateCrate(i, 'length', e.target.value)} className="h-7 text-center tabular-nums" />
                        <span className="text-muted-foreground">×</span>
                        <Input type="number" placeholder="W" value={c.width || ''} onChange={(e) => updateCrate(i, 'width', e.target.value)} className="h-7 text-center tabular-nums" />
                        <span className="text-muted-foreground">×</span>
                        <Input type="number" placeholder="H" value={c.height || ''} onChange={(e) => updateCrate(i, 'height', e.target.value)} className="h-7 text-center tabular-nums" />
                      </div>
                    </td>
                    <td className="px-2 py-1">
                      <Input type="number" step="0.01" value={c.weight || ''} onChange={(e) => updateCrate(i, 'weight', e.target.value)} className="h-7 text-right tabular-nums" />
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums font-medium text-success">
                      {formatNumber(totalWeight, 1)}
                    </td>
                    <td className="px-2 py-1 text-right tabular-nums font-medium text-primary">
                      {formatNumber(totalVolume, 3)}
                    </td>
                    <td className="px-2 py-1">
                      <Input value={c.description || ''} onChange={(e) => updateCrate(i, 'description', e.target.value)} className="h-7 text-xs" />
                    </td>
                    <td className="px-2 py-1">
                      <Button type="button" variant="ghost" size="icon" className="h-6 w-6 text-destructive" onClick={() => removeCrate(i)}>
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
            <tfoot className="bg-muted/40 border-t-2">
              <tr>
                <td className="px-2 py-1.5 text-center font-bold tabular-nums">{totals.totalQty}</td>
                <td colSpan={2} className="px-2 py-1.5 text-right font-semibold text-muted-foreground text-[10px] uppercase">Toplam</td>
                <td className="px-2 py-1.5 text-right font-bold tabular-nums text-success">{formatNumber(totals.totalWeight, 1)} kg</td>
                <td className="px-2 py-1.5 text-right font-bold tabular-nums text-primary">{formatNumber(totals.totalVolume, 3)} m³</td>
                <td colSpan={2}></td>
              </tr>
            </tfoot>
          </table>
        </div>
      )}

      {/* Yeni kap ekle */}
      <Card className="p-3 border-dashed bg-muted/30">
        <div className="grid grid-cols-2 md:grid-cols-7 gap-2 items-end">
          <div className="space-y-1">
            <Label className="text-[10px]">Adet</Label>
            <Input type="number" min="1" value={draft.qty || ''} onChange={(e) => setDraftField('qty', e.target.value)} className="h-8 text-center tabular-nums" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Uzunluk (cm)</Label>
            <Input type="number" value={draft.length || ''} onChange={(e) => setDraftField('length', e.target.value)} className="h-8 text-right tabular-nums" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Genişlik (cm)</Label>
            <Input type="number" value={draft.width || ''} onChange={(e) => setDraftField('width', e.target.value)} className="h-8 text-right tabular-nums" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Yükseklik (cm)</Label>
            <Input type="number" value={draft.height || ''} onChange={(e) => setDraftField('height', e.target.value)} className="h-8 text-right tabular-nums" />
          </div>
          <div className="space-y-1">
            <Label className="text-[10px]">Birim Ağırlık (kg)</Label>
            <Input type="number" step="0.01" value={draft.weight || ''} onChange={(e) => setDraftField('weight', e.target.value)} className="h-8 text-right tabular-nums" />
          </div>
          <div className="space-y-1 col-span-2 md:col-span-1">
            <Label className="text-[10px]">Açıklama</Label>
            <Input value={draft.description || ''} onChange={(e) => setDraftField('description', e.target.value)} className="h-8" />
          </div>
          <Button type="button" size="sm" onClick={addCrate} className="h-8">
            <Plus className="w-3.5 h-3.5" />
            Ekle
          </Button>
        </div>
        {(draft.length && draft.width && draft.height) ? (
          <div className="mt-2 text-xs text-muted-foreground flex items-center gap-1">
            <Calculator className="w-3 h-3" />
            Hacim önizleme: {formatNumber(
              (draft.qty || 0) * (draft.length || 0) * (draft.width || 0) * (draft.height || 0) / 1_000_000,
              3
            )} m³
          </div>
        ) : null}
      </Card>
    </div>
  )
}
