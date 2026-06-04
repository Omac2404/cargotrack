import { useState } from 'react'
import { Plus, X, MapPin } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'

export type PartyKey = 'client' | 'sender' | 'receiver' | 'agent'

export type PartySecondaryData = Partial<{
  /** Müşteri için 2. teslim adresi (sevkiyata özel) */
  delivery_address_2: string
  /** Diğer taraflar için bu sevkiyata özel adres */
  address: string
  /** 2. iletişim kişi */
  contact: string
  /** 2. telefon */
  phone: string
  /** 2. email */
  email: string
  /** Notlar */
  notes: string
}>

export type PartiesData = Partial<Record<PartyKey, PartySecondaryData>>

interface Props {
  partyKey: PartyKey
  data: PartySecondaryData
  onChange: (next: PartySecondaryData) => void
}

const FIELD_LABELS: Record<PartyKey, { label: string; addressKey: 'delivery_address_2' | 'address'; addressLabel: string }> = {
  client:   { label: 'Müşteri',  addressKey: 'delivery_address_2', addressLabel: '2. Teslim Adresi' },
  sender:   { label: 'Gönderici', addressKey: 'address',           addressLabel: 'Bu Sevkiyat İçin Adres' },
  receiver: { label: 'Alıcı',     addressKey: 'address',           addressLabel: 'Bu Sevkiyat İçin Adres' },
  agent:    { label: 'Acente',    addressKey: 'address',           addressLabel: 'Bu Sevkiyat İçin Adres' },
}

/**
 * Sevkiyata özel ek bilgi paneli. Toggleable — varsayılan kapalı, "+ Ek Bilgi Ekle" butonuyla açılır.
 * Partner kaydını değiştirmez; sadece bu sevkiyat için.
 */
export function PartySecondaryFields({ partyKey, data, onChange }: Props) {
  const cfg = FIELD_LABELS[partyKey]
  const hasAny = Object.values(data).some((v) => v && String(v).trim())
  const [open, setOpen] = useState(hasAny)

  const update = (patch: Partial<PartySecondaryData>) => {
    onChange({ ...data, ...patch })
  }

  const clearAll = () => {
    setOpen(false)
    onChange({})
  }

  if (!open) {
    return (
      <Button
        type="button"
        variant="outline"
        size="sm"
        className="mt-2 h-7 text-xs"
        onClick={() => setOpen(true)}
      >
        <Plus className="w-3 h-3" />
        Bu sevkiyata özel ek bilgi ekle
      </Button>
    )
  }

  return (
    <div className="mt-2 rounded-md border-2 border-dashed border-primary/40 bg-primary/5 p-3 space-y-3">
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-primary uppercase tracking-wider">
          {cfg.label} — Sevkiyata Özel Ek Bilgi
        </div>
        <Button type="button" variant="ghost" size="icon" className="h-6 w-6" onClick={clearAll} title="Temizle ve kapat">
          <X className="w-3.5 h-3.5" />
        </Button>
      </div>

      <p className="text-[10px] text-muted-foreground">
        Bu alanlar sadece bu sevkiyat için geçerlidir; partner kaydını değiştirmez.
      </p>

      <div className="space-y-1.5">
        <Label className="text-xs flex items-center gap-1">
          <MapPin className="w-3 h-3" />
          {cfg.addressLabel}
        </Label>
        <Textarea
          rows={2}
          value={(data[cfg.addressKey] as string) || ''}
          onChange={(e) => update({ [cfg.addressKey]: e.target.value })}
          placeholder="Tam adres..."
          className="text-xs"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
        <div className="space-y-1.5">
          <Label className="text-xs">İletişim Kişi</Label>
          <Input
            value={data.contact || ''}
            onChange={(e) => update({ contact: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">Telefon</Label>
          <Input
            value={data.phone || ''}
            onChange={(e) => update({ phone: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
        <div className="space-y-1.5">
          <Label className="text-xs">E-posta</Label>
          <Input
            type="email"
            value={data.email || ''}
            onChange={(e) => update({ email: e.target.value })}
            className="h-8 text-xs"
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label className="text-xs">Notlar</Label>
        <Textarea
          rows={2}
          value={data.notes || ''}
          onChange={(e) => update({ notes: e.target.value })}
          className="text-xs"
        />
      </div>
    </div>
  )
}
