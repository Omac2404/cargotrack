import { useState, useRef } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { toast } from 'sonner'
import {
  FileText, Upload, Trash2, Download, Loader2, CheckCircle2, Circle, AlertCircle, Eye,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { cn, formatDate } from '@/lib/utils'
import { useUploadDocument, useDeleteDocument, downloadDocument } from '@/features/documents/hooks'
import { DocumentPreviewDialog } from '@/features/documents/DocumentPreviewDialog'
import { api } from '@/lib/api'
import type { DocItem } from '@/lib/constants/transportModes'
import type { DocStage, DocumentSlotEntry, DocumentsData } from '@/types/api'

interface Props {
  shipmentId: number
  docList: DocItem[]
  documentsData: DocumentsData
  /** Belge durumu değiştiğinde shipment update gerekir */
  onStageChange?: (key: string, stage: DocStage) => void
}

const STAGE_LABELS: Record<DocStage, string> = {
  missing: 'Eksik',
  uploaded: 'Yüklü',
  approved: 'Onaylı',
}

const STAGE_COLORS: Record<DocStage, string> = {
  missing: 'bg-destructive/10 text-destructive border-destructive/30',
  uploaded: 'bg-warning/10 text-warning border-warning/30',
  approved: 'bg-success/10 text-success border-success/30',
}

export function DocumentChecklist({ shipmentId, docList, documentsData, onStageChange }: Props) {
  const qc = useQueryClient()
  const uploadMut = useUploadDocument()
  const deleteMut = useDeleteDocument()
  const fileInputs = useRef<Record<string, HTMLInputElement | null>>({})
  const [previewKey, setPreviewKey] = useState<{ key: string; label: string } | null>(null)

  const updateStageMut = useMutation({
    mutationFn: async ({ docKey, stage }: { docKey: string; stage: DocStage }) => {
      // Mevcut documents_data'yı al ve sadece bu key'in status'unu değiştir
      const next: DocumentsData = { ...documentsData }
      if (!next[docKey]) next[docKey] = { status: stage }
      else next[docKey] = { ...next[docKey], status: stage }
      // Backend save_shipment endpoint'i tüm shipment'ı bekliyor — sadece documents_data güncelliyoruz
      await api.post(`/api/shipments`, { id: shipmentId, documents_data: JSON.stringify(next) })
    },
    onSuccess: (_, vars) => {
      onStageChange?.(vars.docKey, vars.stage)
      qc.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      toast.success(`${vars.docKey} → ${STAGE_LABELS[vars.stage]}`)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const handleUpload = (key: string, file: File) => {
    uploadMut.mutate(
      { shipmentId, docKey: key, file },
      {
        onSuccess: () => {
          toast.success(`${file.name} yüklendi`)
          qc.invalidateQueries({ queryKey: ['shipment', shipmentId] })
        },
        onError: (err: Error) => toast.error(err.message),
      }
    )
  }

  const handleDelete = (key: string) => {
    if (!confirm(`${key} belgesi silinecek. Emin misin?`)) return
    deleteMut.mutate(
      { shipmentId, docKey: key },
      {
        onSuccess: () => {
          toast.success('Belge silindi')
          qc.invalidateQueries({ queryKey: ['shipment', shipmentId] })
        },
        onError: (err: Error) => toast.error(err.message),
      }
    )
  }

  const handleDownload = async (key: string, filename: string) => {
    try {
      await downloadDocument(shipmentId, key, filename)
    } catch (err) {
      toast.error((err as Error).message)
    }
  }

  return (
    <div className="space-y-2">
      {docList.map((item) => {
        const doc = documentsData[item.key] as DocumentSlotEntry | undefined
        const stage: DocStage = doc?.status as DocStage || (doc?.stored_name ? 'uploaded' : 'missing')
        const hasFile = !!doc?.stored_name

        return (
          <Card key={item.key} className={cn(
            'p-3 transition-colors',
            stage === 'approved' && 'border-success/30 bg-success/5',
            stage === 'uploaded' && 'border-warning/30 bg-warning/5',
            stage === 'missing' && 'border-dashed',
          )}>
            <div className="flex items-center gap-3">
              <FileText className={cn('w-5 h-5 shrink-0',
                stage === 'approved' && 'text-success',
                stage === 'uploaded' && 'text-warning',
                stage === 'missing' && 'text-muted-foreground',
              )} />

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-medium truncate">{item.label}</span>
                  <Badge className={cn('text-[10px]', STAGE_COLORS[stage])}>
                    {STAGE_LABELS[stage]}
                  </Badge>
                </div>
                {doc?.filename && (
                  <div className="text-xs text-muted-foreground truncate">
                    {doc.filename}
                    {doc.uploaded_at && ` · ${formatDate(doc.uploaded_at, true)}`}
                  </div>
                )}
              </div>

              {/* 3-stage trafik ışığı */}
              <div className="flex items-center gap-1">
                <StageButton
                  active={stage === 'missing'}
                  onClick={() => updateStageMut.mutate({ docKey: item.key, stage: 'missing' })}
                  color="destructive"
                  title="Eksik"
                />
                <StageButton
                  active={stage === 'uploaded'}
                  onClick={() => updateStageMut.mutate({ docKey: item.key, stage: 'uploaded' })}
                  color="warning"
                  title="Yüklü"
                  disabled={!hasFile}
                />
                <StageButton
                  active={stage === 'approved'}
                  onClick={() => updateStageMut.mutate({ docKey: item.key, stage: 'approved' })}
                  color="success"
                  title="Onaylı"
                  disabled={!hasFile}
                />
              </div>

              {/* Aksiyonlar */}
              <div className="flex items-center gap-1">
                {hasFile && (
                  <>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => setPreviewKey({ key: item.key, label: item.label })}
                            title="Önizle / Versiyonlar">
                      <Eye className="w-3.5 h-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7"
                            onClick={() => handleDownload(item.key, doc!.filename || item.key)}
                            title="İndir">
                      <Download className="w-3.5 h-3.5" />
                    </Button>
                    <Button type="button" variant="ghost" size="icon" className="h-7 w-7 text-destructive"
                            onClick={() => handleDelete(item.key)}
                            title="Sil">
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </>
                )}
                <input
                  type="file"
                  ref={(el) => { fileInputs.current[item.key] = el }}
                  className="hidden"
                  accept=".pdf,.jpg,.jpeg,.png,.doc,.docx,.xls,.xlsx"
                  onChange={(e) => {
                    const f = e.target.files?.[0]
                    if (f) handleUpload(item.key, f)
                    e.target.value = ''
                  }}
                />
                <Button type="button" variant={hasFile ? 'ghost' : 'outline'} size="sm"
                        onClick={() => fileInputs.current[item.key]?.click()}
                        disabled={uploadMut.isPending}>
                  {uploadMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                  {hasFile ? 'Değiştir' : 'Yükle'}
                </Button>
              </div>
            </div>
          </Card>
        )
      })}

      {previewKey && (
        <DocumentPreviewDialog
          shipmentId={shipmentId}
          docKey={previewKey.key}
          docLabel={previewKey.label}
          open={!!previewKey}
          onOpenChange={(o) => !o && setPreviewKey(null)}
        />
      )}
    </div>
  )
}

function StageButton({
  active, onClick, color, title, disabled,
}: {
  active: boolean
  onClick: () => void
  color: 'destructive' | 'warning' | 'success'
  title: string
  disabled?: boolean
}) {
  const colors = {
    destructive: active ? 'bg-destructive border-destructive text-destructive-foreground' : 'border-muted-foreground/30 text-muted-foreground hover:border-destructive hover:text-destructive',
    warning: active ? 'bg-warning border-warning text-warning-foreground' : 'border-muted-foreground/30 text-muted-foreground hover:border-warning hover:text-warning',
    success: active ? 'bg-success border-success text-success-foreground' : 'border-muted-foreground/30 text-muted-foreground hover:border-success hover:text-success',
  }
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      title={title}
      className={cn(
        'w-5 h-5 rounded border-2 transition-all flex items-center justify-center',
        colors[color],
        disabled && 'opacity-30 cursor-not-allowed',
      )}
    >
      {active ? <CheckCircle2 className="w-3 h-3" /> : <Circle className="w-2 h-2" />}
    </button>
  )
}
