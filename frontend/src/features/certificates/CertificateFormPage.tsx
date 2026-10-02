import { useMemo, useState } from 'react'
import { useParams, useNavigate, Link } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toast } from 'sonner'
import { ArrowLeft, Save, Printer, Grid3x3, Loader2, Stamp, Download } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Combobox } from '@/components/shared/Combobox'
import { openPdf } from '@/features/pdf/hooks'
import { useShipments } from '@/features/shipments/hooks'
import {
  useCertificate, useSaveCertificate, getCertificateUrl,
  loadPrintOffset, savePrintOffset,
} from './hooks'
import type { Certificate, CertificateType, Shipment } from '@/types/api'

type FormState = Partial<Certificate>

const EMPTY: FormState = {
  cert_type: 'atr',
  export_country: 'France',
  issue_country: 'France',
}

/** Dosyadan gelen bilgiyi matbu formun kutusuna uygun tek metne çevirir */
function partyBlock(name?: string | null, address?: string | null) {
  return [name || '', address || ''].filter(Boolean).join('\n')
}

export function CertificateFormPage() {
  const { id } = useParams()
  const isEdit = !!id && id !== 'new'
  const { data: existing, isLoading } = useCertificate(isEdit ? id : undefined)

  if (isEdit && isLoading) {
    return <div className="p-10 flex justify-center"><Loader2 className="w-5 h-5 animate-spin" /></div>
  }
  // key: kayit degisince form state'i bastan kurulur (effect ile set etmeye gerek yok)
  return <CertificateEditor key={isEdit ? String(existing?.id ?? id) : 'new'} initial={existing} isEdit={isEdit} id={id} />
}

function CertificateEditor({ initial, isEdit, id }: { initial?: Certificate; isEdit: boolean; id?: string }) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const saveMut = useSaveCertificate()
  const [form, setForm] = useState<FormState>(initial ? { ...initial } : EMPTY)
  // Kalibrasyon kutulari metin olarak tutulur: "2.5" yazarken ara degerler
  // ("2." gibi) sayiya cevrilince kullanicinin yazdigi kayboluyordu.
  const savedOffset = loadPrintOffset()
  const [dxText, setDxText] = useState(String(savedOffset.dx))
  const [dyText, setDyText] = useState(String(savedOffset.dy))
  const offset = { dx: parseFloat(dxText) || 0, dy: parseFloat(dyText) || 0 }

  const set = (key: keyof Certificate, value: string | number | null) =>
    setForm((prev) => ({ ...prev, [key]: value }))

  // Dosyadan doldur — gönderici/alıcı, ülkeler, mal bilgisi ve ağırlık gelir
  const { data: road = [] } = useShipments('road')
  const { data: maritime = [] } = useShipments('maritime')
  const { data: air = [] } = useShipments('air')
  const shipments = useMemo(() => [...road, ...maritime, ...air], [road, maritime, air])
  const shipmentOptions = useMemo(
    () => shipments.map((s) => ({
      value: String(s.id),
      label: s.shipment_no || String(s.id),
      description: [s.sender, s.receiver].filter(Boolean).join(' → '),
    })),
    [shipments]
  )

  const fillFromShipment = (sid: string) => {
    const s = shipments.find((x) => String(x.id) === sid) as Shipment | undefined
    if (!s) return
    const goods = [
      s.quantity ? `${s.quantity} ${s.package_type || ''}`.trim() : '',
      s.goods_description || '',
    ].filter(Boolean).join(' - ')
    setForm((prev) => ({
      ...prev,
      shipment_id: s.id,
      exporter: prev.exporter || partyBlock(s.sender, ''),
      consignee: prev.consignee || partyBlock(s.receiver, ''),
      export_country: prev.export_country || s.departure_country || '',
      destination_country: prev.destination_country || s.arrival_country || '',
      goods_description: prev.goods_description || goods,
      gross_weight: prev.gross_weight || (s.gross_weight ? `${s.gross_weight} KG` : ''),
    }))
    toast.success(t('cert.filled_from_file', { no: s.shipment_no || '' }))
  }

  const submit = (then?: (newId: number) => void) => {
    saveMut.mutate({ ...form, id: isEdit ? Number(id) : undefined }, {
      onSuccess: (d) => {
        toast.success(isEdit ? t('cert.saved') : t('cert.created'))
        if (!isEdit && d.id) navigate(`/certificates/${d.id}`, { replace: true })
        then?.(isEdit ? Number(id) : d.id)
      },
      onError: (e: Error) => toast.error(e.message),
    })
  }

  /** Önce kaydet, sonra yazdır — kağıda her zaman güncel hali gider */
  const saveAndPrint = (grid: boolean) => {
    savePrintOffset(offset)
    submit((certId) => openPdf(getCertificateUrl(certId, offset, grid)))
  }

  const isEur1 = form.cert_type === 'eur1'
  const field = (key: keyof Certificate, label: string, extra?: { type?: string; placeholder?: string; className?: string }) => (
    <div className={`space-y-1.5 ${extra?.className || ''}`}>
      <Label htmlFor={String(key)}>{label}</Label>
      <Input
        id={String(key)}
        type={extra?.type}
        placeholder={extra?.placeholder}
        value={(form[key] as string) || ''}
        onChange={(e) => set(key, e.target.value)}
      />
    </div>
  )
  const area = (key: keyof Certificate, label: string, rows = 4, hint?: string) => (
    <div className="space-y-1.5">
      <Label htmlFor={String(key)}>{label}</Label>
      <Textarea id={String(key)} rows={rows} value={(form[key] as string) || ''}
                onChange={(e) => set(key, e.target.value)} />
      {hint && <p className="text-[10px] text-muted-foreground">{hint}</p>}
    </div>
  )

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Button asChild type="button" variant="ghost" size="icon">
            <Link to="/certificates"><ArrowLeft className="w-4 h-4" /></Link>
          </Button>
          <div>
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Stamp className="w-5 h-5" />
              {isEdit ? t('cert.edit') : t('cert.new')}
            </h1>
            {form.cert_no && <div className="text-xs font-mono text-muted-foreground">{form.cert_no}</div>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="sm" onClick={() => saveAndPrint(true)}
                  title={t('cert.grid_hint')}>
            <Grid3x3 className="w-4 h-4" />
            <span className="hidden md:inline">{t('cert.grid')}</span>
          </Button>
          <Button type="button" variant="outline" size="sm" onClick={() => saveAndPrint(false)}>
            <Printer className="w-4 h-4" />
            {t('cert.print')}
          </Button>
          <Button type="button" size="sm" onClick={() => submit()} disabled={saveMut.isPending}>
            {saveMut.isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
            {t('common.save')}
          </Button>
        </div>
      </div>

      {/* Belge türü + dosyadan doldurma */}
      <Card className="p-4 space-y-4">
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5">
            <Label>{t('cert.type')}</Label>
            <Tabs value={form.cert_type || 'atr'} onValueChange={(v) => set('cert_type', v as CertificateType)}>
              <TabsList>
                <TabsTrigger value="atr">A.TR.</TabsTrigger>
                <TabsTrigger value="eur1">EUR.1</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
          <div className="space-y-1.5 min-w-[240px]">
            <Label>{t('cert.from_file')}</Label>
            <Combobox
              value={form.shipment_id ? String(form.shipment_id) : ''}
              onChange={(v) => { set('shipment_id', v ? Number(v) : null); if (v) fillFromShipment(v) }}
              options={shipmentOptions}
              placeholder={t('cert.from_file_ph')}
              searchPlaceholder={t('cert.from_file_search')}
            />
            <p className="text-[10px] text-muted-foreground">{t('cert.from_file_hint')}</p>
          </div>
          {field('cert_no', t('cert.fields.cert_no'), { placeholder: 'A 575914' })}
        </div>
      </Card>

      {/* Taraflar */}
      <Card className="p-4 space-y-4">
        <h2 className="text-sm font-semibold">{t('cert.sections.parties')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {area('exporter', t('cert.fields.exporter'), 4, t('cert.multiline_hint'))}
          {area('consignee', t('cert.fields.consignee'), 4, t('cert.multiline_hint'))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('export_country', t('cert.fields.export_country'))}
          {field('destination_country', t('cert.fields.destination_country'))}
          {isEur1 && field('origin_country', t('cert.fields.origin_country'))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {field('transport_doc_no', t('cert.fields.transport_doc_no'))}
          {field('transport_doc_date', t('cert.fields.transport_doc_date'), { type: 'date' })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {area('transport_info', t('cert.fields.transport_info'), 3)}
          {area('observations', t('cert.fields.observations'), 3)}
        </div>
      </Card>

      {/* Mal bilgisi */}
      <Card className="p-4 space-y-4">
        <h2 className="text-sm font-semibold">{t('cert.sections.goods')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {field('order_no', t('cert.fields.order_no'))}
          {field('gross_weight', t('cert.fields.gross_weight'), { placeholder: '725 KG', className: 'md:col-span-1' })}
          {isEur1 && field('invoice_ref', t('cert.fields.invoice_ref'), { className: 'md:col-span-2' })}
        </div>
        {area('goods_description', t('cert.fields.goods_description'), 6, t('cert.goods_hint'))}
      </Card>

      {/* Gümrük vizesi ve beyan */}
      <Card className="p-4 space-y-4">
        <h2 className="text-sm font-semibold">{t('cert.sections.customs')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('customs_doc_model', t('cert.fields.customs_doc_model'), { placeholder: 'EXA' })}
          {field('customs_doc_no', t('cert.fields.customs_doc_no'), { placeholder: '26FR10010084830CB5' })}
          {field('customs_doc_date', t('cert.fields.customs_doc_date'), { type: 'date' })}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('customs_office', t('cert.fields.customs_office'), { placeholder: 'AULNAY SOUS BOIS - FR005340' })}
          {field('issue_country', t('cert.fields.issue_country'))}
          {field('issue_place', t('cert.fields.issue_place'))}
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {field('issue_date', t('cert.fields.issue_date'), { type: 'date' })}
          {field('declaration_place', t('cert.fields.declaration_place'))}
          {field('declaration_date', t('cert.fields.declaration_date'), { type: 'date' })}
        </div>
        {area('notes', t('cert.fields.notes'), 2)}
      </Card>

      {/* Yazdırma kalibrasyonu — yazıcıdan yazıcıya değişir, tarayıcıda saklanır */}
      <Card className="p-4 space-y-3">
        <h2 className="text-sm font-semibold">{t('cert.sections.print')}</h2>
        <p className="text-xs text-muted-foreground">{t('cert.print_hint')}</p>
        <p className="text-xs text-muted-foreground">{t('cert.print_scale')}</p>
        <div className="flex flex-wrap items-end gap-4">
          <div className="space-y-1.5 w-32">
            <Label htmlFor="dx">{t('cert.offset_x')}</Label>
            <Input id="dx" type="number" step="0.5" value={dxText}
                   onChange={(e) => setDxText(e.target.value)} />
          </div>
          <div className="space-y-1.5 w-32">
            <Label htmlFor="dy">{t('cert.offset_y')}</Label>
            <Input id="dy" type="number" step="0.5" value={dyText}
                   onChange={(e) => setDyText(e.target.value)} />
          </div>
          <Button type="button" variant="outline" size="sm"
                  onClick={() => { savePrintOffset(offset); toast.success(t('cert.offset_saved')) }}>
            <Download className="w-4 h-4" />
            {t('cert.offset_save')}
          </Button>
        </div>
      </Card>
    </div>
  )
}
