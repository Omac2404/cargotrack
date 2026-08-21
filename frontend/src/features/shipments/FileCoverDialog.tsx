import { useEffect, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { FileBadge2, Loader2, RotateCcw, Save } from 'lucide-react'

import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  fetchCoverFields, openFileCoverWithValues, saveCoverValues, type CoverFieldsResponse,
} from '@/features/pdf/hooks'

interface Props {
  shipmentId: number
  open: boolean
  onOpenChange: (o: boolean) => void
}

/**
 * Dosya kapağı oluşturmadan önce alanları gözden geçirme/düzenleme ekranı.
 *
 * Alanlar sevkiyattan otomatik doldurulur (plaka, atanmış araçtan gelir) ama
 * hepsi serbestçe değiştirilebilir: kapakta gümrük/müşteri fatura numarası gibi
 * sistemde tutulmayan bilgiler de olabiliyor. "Oluştur"a basılınca PDF
 * ekrandaki değerlerle üretilir; sevkiyat kaydı değişmez.
 */
export function FileCoverDialog({ shipmentId, open, onOpenChange }: Props) {
  const { t } = useTranslation()
  const [data, setData] = useState<CoverFieldsResponse | null>(null)
  const [values, setValues] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  const save = async () => {
    setSaving(true)
    try {
      await saveCoverValues(shipmentId, values)
      // Diyalog acik kalir; kayitli degerler bir sonraki acilista aynen gelir
      setData((d) => (d ? { ...d, values: { ...values } } : d))
      toast.success(t('cover.saved', { defaultValue: 'Kapak bilgileri kaydedildi' }))
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (!open) return
    setLoading(true)
    fetchCoverFields(shipmentId)
      .then((d) => { setData(d); setValues({ ...d.values }) })
      .catch((e: Error) => toast.error(e.message))
      .finally(() => setLoading(false))
  }, [open, shipmentId])

  const setField = (key: string, v: string) => setValues((s) => ({ ...s, [key]: v }))

  const resetToAuto = () => {
    if (data) {
      // data.values kayitli duzenlemeleri de icerir; sifirlama SAF otomatiklere doner
      setValues({ ...data.auto })
      toast.success(t('cover.reset_done', { defaultValue: 'Alanlar otomatik değerlere döndürüldü' }))
    }
  }

  const generate = async () => {
    setGenerating(true)
    try {
      await openFileCoverWithValues(shipmentId, values)
      onOpenChange(false)
    } catch (e) {
      toast.error((e as Error).message)
    } finally {
      setGenerating(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileBadge2 className="w-5 h-5" />
            {t('cover.title', { defaultValue: 'Dosya Kapağı' })}
            {data?.shipment_no && (
              <span className="font-mono text-xs text-muted-foreground">{data.shipment_no}</span>
            )}
          </DialogTitle>
          <DialogDescription>
            {t('cover.subtitle', {
              defaultValue: 'Alanlar sevkiyattan otomatik dolduruldu. Değiştirebilir, boş kalanları elle yazabilirsin. "Oluştur" dediğinde PDF ekrandaki değerlerle hazırlanır — sevkiyat kaydı değişmez.',
            })}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="py-16 text-center text-muted-foreground">
            <Loader2 className="w-6 h-6 animate-spin mx-auto" />
          </div>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-4 gap-y-3">
              {data.fields.left.map((f) => (
                <CoverField key={f.key} label={f.label} value={values[f.key] ?? ''}
                            onChange={(v) => setField(f.key, v)} />
              ))}
              {data.fields.right.map((f) => (
                <CoverField key={f.key} label={f.label} value={values[f.key] ?? ''}
                            onChange={(v) => setField(f.key, v)} />
              ))}
            </div>

            <div className="space-y-1.5 pt-2 border-t">
              <Label htmlFor="cover-observation" className="text-[10px] font-semibold uppercase tracking-wider">
                OBSERVATION
              </Label>
              <Textarea
                id="cover-observation"
                rows={5}
                value={values.observation ?? ''}
                onChange={(e) => setField('observation', e.target.value)}
                placeholder={t('cover.observation_ph', { defaultValue: 'Mal tanımı, notlar, ürün listesi...' })}
              />
            </div>
          </div>
        ) : null}

        <DialogFooter className="gap-2">
          <Button type="button" variant="ghost" onClick={resetToAuto} disabled={!data || generating}>
            <RotateCcw className="w-4 h-4" />
            {t('cover.reset', { defaultValue: 'Otomatik değerlere dön' })}
          </Button>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
            {t('common.cancel')}
          </Button>
          <Button type="button" variant="secondary" onClick={save} disabled={!data || saving || generating}>
            {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save')}
          </Button>
          <Button type="button" onClick={generate} disabled={!data || generating || saving}>
            {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <FileBadge2 className="w-4 h-4" />}
            {t('cover.generate', { defaultValue: 'Oluştur' })}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function CoverField({
  label, value, onChange,
}: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-1">
      <Label className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">
        {label}
      </Label>
      <Input value={value} onChange={(e) => onChange(e.target.value)} className="h-9" />
    </div>
  )
}
