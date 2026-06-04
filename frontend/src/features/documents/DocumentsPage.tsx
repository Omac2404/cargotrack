import { useMemo, useState, useRef } from 'react'
import { useQuery } from '@tanstack/react-query'
import { toast } from 'sonner'
import { useTranslation } from 'react-i18next'
import {
  FileText, Upload, Trash2, Download, Loader2, Inbox, AlertCircle, FileIcon, Plus,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { api } from '@/lib/api'
import { useShipments, useShipment } from '@/features/shipments/hooks'
import { useUploadDocument, useDeleteDocument, downloadDocument, STANDARD_DOC_SLOTS } from './hooks'
import { cn, formatDate } from '@/lib/utils'
import type { Shipment } from '@/types/api'

interface DocEntry {
  filename?: string
  stored_name?: string
  uploaded_at?: string
  status?: string
}

function parseDocs(raw: unknown): Record<string, DocEntry> {
  if (!raw) return {}
  if (typeof raw === 'string') {
    try { return JSON.parse(raw) || {} } catch { return {} }
  }
  if (typeof raw === 'object') return raw as Record<string, DocEntry>
  return {}
}

export function DocumentsPage() {
  const { t } = useTranslation()
  // Tüm modlardan sevkiyat çek (storage hariç dokümanlar olur)
  const { data: roads = [] } = useShipments('road')
  const { data: maritimes = [] } = useShipments('maritime')
  const { data: airs = [] } = useShipments('air')
  const { data: storages = [] } = useShipments('storage')

  const allShipments = useMemo(
    () => [...roads, ...maritimes, ...airs, ...storages].sort((a, b) =>
      (b.created_at || '').localeCompare(a.created_at || '')
    ),
    [roads, maritimes, airs, storages]
  )

  const [selectedId, setSelectedId] = useState<number | null>(null)
  const { data: shipment, isLoading } = useShipment(selectedId ?? undefined)
  const docs = parseDocs((shipment as Shipment | undefined)?.documents_data)

  const [deleteKey, setDeleteKey] = useState<string | null>(null)
  const [customKeyOpen, setCustomKeyOpen] = useState(false)
  const [customKey, setCustomKey] = useState('')

  const uploadMut = useUploadDocument()
  const deleteMut = useDeleteDocument()
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})

  const handleUpload = (docKey: string, file: File) => {
    if (!selectedId) return
    uploadMut.mutate(
      { shipmentId: selectedId, docKey, file },
      {
        onSuccess: () => toast.success(`${file.name} yüklendi`),
        onError: (err: Error) => toast.error(err.message),
      }
    )
  }

  const handleDelete = () => {
    if (!selectedId || !deleteKey) return
    deleteMut.mutate(
      { shipmentId: selectedId, docKey: deleteKey },
      {
        onSuccess: () => {
          toast.success('Belge silindi')
          setDeleteKey(null)
        },
        onError: (err: Error) => toast.error(err.message),
      }
    )
  }

  const handleDownload = async (docKey: string, filename: string) => {
    try {
      await downloadDocument(selectedId!, docKey, filename)
    } catch (e: unknown) {
      toast.error((e as Error).message)
    }
  }

  // Slot listesi: standart + extra'lar (docs içinde olan ama standart olmayan key'ler)
  const allKeys = useMemo(() => {
    const stdKeys = new Set(STANDARD_DOC_SLOTS.map((s) => s.key))
    const extras = Object.keys(docs).filter((k) => !stdKeys.has(k))
    return [
      ...STANDARD_DOC_SLOTS,
      ...extras.map((k) => ({ key: k, label: k, description: 'Özel belge' })),
    ]
  }, [docs])

  return (
    <div className="space-y-4 max-w-[1400px]">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-pink-500 to-rose-600 text-white flex items-center justify-center">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">{t('documents.title')}</h1>
            <p className="text-xs text-muted-foreground">{t('documents.subtitle')}</p>
          </div>
        </div>
      </div>

      {/* Sevkiyat seçici */}
      <Card className="p-4">
        <Label className="mb-1.5 block">{t('nav.shipments')}</Label>
        <Select
          value={selectedId ? String(selectedId) : ''}
          onValueChange={(v) => setSelectedId(Number(v))}
        >
          <SelectTrigger className="w-full max-w-2xl">
            <SelectValue placeholder={t('common.select')} />
          </SelectTrigger>
          <SelectContent>
            {allShipments.length === 0 && (
              <div className="px-3 py-6 text-center text-xs text-muted-foreground">{t('common.no_data')}</div>
            )}
            {allShipments.map((s) => (
              <SelectItem key={s.id} value={String(s.id)}>
                <span className="font-mono mr-2">{s.shipment_no}</span>
                {s.client_billing && <span className="text-muted-foreground">— {s.client_billing}</span>}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </Card>

      {/* Belge grid */}
      {!selectedId ? (
        <Card className="p-16 text-center text-muted-foreground border-dashed">
          <FileText className="w-12 h-12 mx-auto mb-3 opacity-30" />
          <div className="text-sm">Belgelerini yönetmek için yukarıdan bir sevkiyat seç</div>
        </Card>
      ) : isLoading ? (
        <Card className="p-12 text-center text-muted-foreground">
          <Loader2 className="w-6 h-6 animate-spin mx-auto" />
        </Card>
      ) : (
        <>
          <div className="flex items-center justify-between">
            <div className="text-xs text-muted-foreground">
              <strong className="text-foreground font-mono">{shipment?.shipment_no}</strong>
              {shipment?.client_billing && <> — {shipment.client_billing as string}</>}
            </div>
            <Button variant="outline" size="sm" onClick={() => setCustomKeyOpen(true)}>
              <Plus className="w-3.5 h-3.5" />
              Özel Belge Slotu Ekle
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-3">
            {allKeys.map((slot) => {
              const doc = docs[slot.key]
              const hasFile = !!doc?.stored_name
              return (
                <Card
                  key={slot.key}
                  className={cn(
                    'p-3 transition-colors',
                    hasFile ? 'border-success/30 bg-success/5' : 'border-dashed'
                  )}
                >
                  <div className="space-y-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="space-y-0.5 min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <FileText className={cn('w-3.5 h-3.5 shrink-0', hasFile ? 'text-success' : 'text-muted-foreground')} />
                          <span className="font-semibold text-sm">{slot.label}</span>
                        </div>
                        {slot.description && (
                          <p className="text-[10px] text-muted-foreground truncate">{slot.description}</p>
                        )}
                      </div>
                      {hasFile && <Badge variant="success">{t('common.yes')}</Badge>}
                    </div>

                    {hasFile ? (
                      <div className="space-y-1.5">
                        <div className="text-xs flex items-center gap-1 text-muted-foreground truncate">
                          <FileIcon className="w-3 h-3 shrink-0" />
                          <span className="truncate" title={doc.filename}>{doc.filename}</span>
                        </div>
                        {doc.uploaded_at && (
                          <div className="text-[10px] text-muted-foreground">
                            {formatDate(doc.uploaded_at, true)}
                          </div>
                        )}
                        <div className="flex gap-1.5 pt-1">
                          <Button
                            size="sm"
                            variant="outline"
                            className="flex-1 h-7"
                            onClick={() => handleDownload(slot.key, doc.filename!)}
                          >
                            <Download className="w-3 h-3" />
                            {t('common.open')}
                          </Button>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                            onClick={() => setDeleteKey(slot.key)}
                          >
                            <Trash2 className="w-3 h-3" />
                          </Button>
                          <label className="flex-1">
                            <input
                              type="file"
                              accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0]
                                if (f) handleUpload(slot.key, f)
                                e.target.value = ''
                              }}
                            />
                            <Button asChild size="sm" variant="outline" className="h-7 w-full cursor-pointer">
                              <span><Upload className="w-3 h-3" />{t('common.edit')}</span>
                            </Button>
                          </label>
                        </div>
                      </div>
                    ) : (
                      <label className="block">
                        <input
                          ref={(el) => { fileInputs.current[slot.key] = el }}
                          type="file"
                          accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                          className="hidden"
                          onChange={(e) => {
                            const f = e.target.files?.[0]
                            if (f) handleUpload(slot.key, f)
                            e.target.value = ''
                          }}
                        />
                        <Button
                          asChild
                          size="sm"
                          variant="outline"
                          className="w-full h-7 cursor-pointer border-dashed"
                          disabled={uploadMut.isPending}
                        >
                          <span>
                            {uploadMut.isPending ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Upload className="w-3 h-3" />
                            )}
                            {t('common.add')}
                          </span>
                        </Button>
                      </label>
                    )}
                  </div>
                </Card>
              )
            })}
          </div>

          <div className="text-xs text-muted-foreground p-3 rounded-md bg-muted/30 border">
            <AlertCircle className="w-3.5 h-3.5 inline mr-1" />
            Desteklenen formatlar: PDF, JPG, PNG, DOC(X), XLS(X). Maks. 20MB. Dosyalar yetkili kullanıcılarca <strong>korumalı bir endpoint üzerinden</strong> servis edilir; doğrudan URL paylaşımı çalışmaz.
          </div>
        </>
      )}

      {/* Özel belge slotu ekle */}
      <AlertDialog open={customKeyOpen} onOpenChange={setCustomKeyOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Özel Belge Slotu Ekle</AlertDialogTitle>
            <AlertDialogDescription>
              Standart listede olmayan bir belge türü için slot adı gir (örn: <em>"transit_belgesi"</em>).
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Input
            value={customKey}
            onChange={(e) => setCustomKey(e.target.value.replace(/[^a-z0-9_]/gi, '_').toLowerCase())}
            placeholder="slot_adi"
          />
          <AlertDialogFooter>
            <AlertDialogCancel>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.preventDefault()
                if (customKey && selectedId) {
                  // Boş slot eklemek için backend'e şipment güncelleme: documents_data'ya boş entry
                  // En basit yaklaşım: localde UI gösterme, asıl ekleme upload anında olur
                  // Burada sadece dialog kapatıyoruz, yeni slot otomatik gelecek upload sonrası
                  toast.info(`"${customKey}" slotuna dosya yükleyebilirsin`, { duration: 4000 })
                  // Slot'u görünür yapmak için docs.* içine boş entry kaydet (PATCH değil tam shipment yüklemek lazım — bunun yerine fileInput tıklatalım)
                  setCustomKeyOpen(false)
                  // Kullanıcı dosya seçer → upload olur → slot oluşur
                  setTimeout(() => {
                    const input = document.createElement('input')
                    input.type = 'file'
                    input.accept = '.pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx'
                    input.onchange = () => {
                      const f = input.files?.[0]
                      if (f) handleUpload(customKey, f)
                    }
                    input.click()
                  }, 100)
                  setCustomKey('')
                }
              }}
              disabled={!customKey}
            >
              Devam Et
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Silme onay */}
      <AlertDialog open={!!deleteKey} onOpenChange={(o) => !o && setDeleteKey(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Belgeyi sil?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong className="text-foreground">{deleteKey && docs[deleteKey]?.filename}</strong> kalıcı olarak silinecek. Geri alınamaz.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMut.isPending}>İptal</AlertDialogCancel>
            <AlertDialogAction
              onClick={(e) => { e.preventDefault(); handleDelete() }}
              disabled={deleteMut.isPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMut.isPending && <Loader2 className="w-4 h-4 animate-spin" />}
              Sil
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
