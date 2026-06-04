import { useQuery } from '@tanstack/react-query'
import { Download, History, RotateCcw, X, Loader2, FileText } from 'lucide-react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { api } from '@/lib/api'
import { formatDate } from '@/lib/utils'
import { useState } from 'react'
import { toast } from 'sonner'
import { useQueryClient } from '@tanstack/react-query'
import { useMutation } from '@tanstack/react-query'

interface DocVersion {
  version: number
  filename: string
  uploaded_at: string
  uploaded_by: string | null
}

interface VersionsResponse {
  current: { filename: string; uploaded_at: string; uploaded_by: string | null } | null
  versions: DocVersion[]
}

interface Props {
  shipmentId: number
  docKey: string
  docLabel: string
  open: boolean
  onOpenChange: (o: boolean) => void
}

const IMAGE_EXTS = ['.jpg', '.jpeg', '.png', '.gif', '.webp']
const PDF_EXT = '.pdf'

function fileExt(filename?: string | null): string {
  if (!filename) return ''
  const idx = filename.lastIndexOf('.')
  return idx >= 0 ? filename.slice(idx).toLowerCase() : ''
}

export function DocumentPreviewDialog({ shipmentId, docKey, docLabel, open, onOpenChange }: Props) {
  const [selectedVersion, setSelectedVersion] = useState(0) // 0 = current
  const qc = useQueryClient()

  const { data: meta, isLoading } = useQuery({
    queryKey: ['doc-versions', shipmentId, docKey],
    queryFn: () => api.get<VersionsResponse>(`/api/documents/${shipmentId}/${docKey}/versions`),
    enabled: open,
  })

  const restoreMut = useMutation({
    mutationFn: (version: number) =>
      api.post(`/api/documents/${shipmentId}/${docKey}/restore?version=${version}`, {}),
    onSuccess: (_, version) => {
      toast.success(`Versiyon ${version} geri yüklendi`)
      qc.invalidateQueries({ queryKey: ['doc-versions', shipmentId, docKey] })
      qc.invalidateQueries({ queryKey: ['shipment', shipmentId] })
      setSelectedVersion(0)
    },
    onError: (err: Error) => toast.error(err.message),
  })

  const token = localStorage.getItem('ct_token') || ''
  const filename = selectedVersion === 0
    ? meta?.current?.filename
    : meta?.versions[selectedVersion - 1]?.filename
  const ext = fileExt(filename)
  const previewUrl = `/api/documents/${shipmentId}/${docKey}?inline=1&token=${encodeURIComponent(token)}${selectedVersion > 0 ? `&version=${selectedVersion}` : ''}`
  const downloadUrl = `/api/documents/${shipmentId}/${docKey}?token=${encodeURIComponent(token)}${selectedVersion > 0 ? `&version=${selectedVersion}` : ''}`

  const canPreview = ext === PDF_EXT || IMAGE_EXTS.includes(ext)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            {docLabel}
            {selectedVersion === 0 ? (
              <Badge variant="success">Güncel</Badge>
            ) : (
              <Badge variant="warning">Versiyon {selectedVersion}</Badge>
            )}
          </DialogTitle>
          <DialogDescription>
            {filename ? (
              <span className="font-mono text-xs">{filename}</span>
            ) : (
              'Belge bulunamadı'
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex gap-3 min-h-0 overflow-hidden">
          {/* Preview */}
          <div className="flex-1 min-w-0 rounded-md border bg-muted/30 overflow-hidden flex items-center justify-center">
            {isLoading ? (
              <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
            ) : !filename ? (
              <div className="text-center text-muted-foreground p-6">
                <FileText className="w-12 h-12 mx-auto mb-2 opacity-40" />
                Belge bulunamadı
              </div>
            ) : ext === PDF_EXT ? (
              <iframe src={previewUrl} className="w-full h-full" title={filename} />
            ) : IMAGE_EXTS.includes(ext) ? (
              <img src={previewUrl} alt={filename} className="max-w-full max-h-full object-contain" />
            ) : (
              <div className="text-center text-muted-foreground p-6 space-y-2">
                <FileText className="w-12 h-12 mx-auto opacity-40" />
                <div>Bu dosya türü tarayıcıda önizlenemez ({ext}).</div>
                <Button asChild variant="outline" size="sm">
                  <a href={downloadUrl} download={filename}>
                    <Download className="w-3.5 h-3.5" />
                    İndir ({filename})
                  </a>
                </Button>
              </div>
            )}
          </div>

          {/* Sağ panel: versiyon listesi */}
          <div className="w-[280px] shrink-0 border rounded-md flex flex-col overflow-hidden">
            <div className="px-3 py-2 border-b bg-muted/30 flex items-center gap-2">
              <History className="w-3.5 h-3.5 text-muted-foreground" />
              <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                Versiyonlar ({(meta?.versions.length || 0) + (meta?.current ? 1 : 0)})
              </span>
            </div>
            <div className="flex-1 overflow-y-auto divide-y">
              {/* Current */}
              {meta?.current && (
                <button
                  type="button"
                  className={`w-full text-left p-2.5 hover:bg-accent transition-colors ${selectedVersion === 0 ? 'bg-primary/10' : ''}`}
                  onClick={() => setSelectedVersion(0)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="success" className="text-[10px]">GÜNCEL</Badge>
                  </div>
                  <div className="text-xs font-mono truncate mt-1">{meta.current.filename}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(meta.current.uploaded_at, true)}
                  </div>
                  {meta.current.uploaded_by && (
                    <div className="text-[10px] text-muted-foreground">
                      {meta.current.uploaded_by}
                    </div>
                  )}
                </button>
              )}

              {/* Eski versiyonlar */}
              {meta?.versions.map((v) => (
                <button
                  key={v.version}
                  type="button"
                  className={`w-full text-left p-2.5 hover:bg-accent transition-colors ${selectedVersion === v.version ? 'bg-primary/10' : ''}`}
                  onClick={() => setSelectedVersion(v.version)}
                >
                  <div className="flex items-center justify-between gap-2">
                    <Badge variant="secondary" className="text-[10px]">v{v.version}</Badge>
                  </div>
                  <div className="text-xs font-mono truncate mt-1">{v.filename}</div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">
                    {formatDate(v.uploaded_at, true)}
                  </div>
                  {v.uploaded_by && (
                    <div className="text-[10px] text-muted-foreground">
                      {v.uploaded_by}
                    </div>
                  )}
                </button>
              ))}

              {meta && meta.versions.length === 0 && (
                <div className="p-3 text-center text-xs text-muted-foreground italic">
                  Henüz eski versiyon yok
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Footer butonları */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t">
          {selectedVersion > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => restoreMut.mutate(selectedVersion)}
              disabled={restoreMut.isPending}
            >
              {restoreMut.isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RotateCcw className="w-3.5 h-3.5" />}
              Bu Versiyonu Güncel Yap
            </Button>
          )}
          {filename && (
            <Button asChild variant="outline" size="sm">
              <a href={downloadUrl} download={filename}>
                <Download className="w-3.5 h-3.5" />
                İndir
              </a>
            </Button>
          )}
          <Button type="button" variant="ghost" size="sm" onClick={() => onOpenChange(false)}>
            <X className="w-3.5 h-3.5" />
            Kapat
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
