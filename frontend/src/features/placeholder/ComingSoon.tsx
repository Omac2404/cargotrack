import { useParams } from 'react-router-dom'
import { Card, CardContent } from '@/components/ui/card'
import { Construction } from 'lucide-react'

interface Props {
  title: string
  phase?: string
}

export function ComingSoon({ title, phase }: Props) {
  const params = useParams()
  return (
    <div className="space-y-6 max-w-3xl">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Bu bölüm henüz hazır değil.
        </p>
      </div>
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-16 text-center space-y-4">
          <div className="w-12 h-12 rounded-full bg-primary/10 text-primary flex items-center justify-center">
            <Construction className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h3 className="font-semibold">Yapım aşamasında</h3>
            <p className="text-sm text-muted-foreground max-w-sm">
              {phase ? `${phase} kapsamında geliştirilecek.` : 'Yakında.'}
            </p>
          </div>
          {Object.keys(params).length > 0 && (
            <pre className="text-xs bg-muted px-3 py-2 rounded">
              {JSON.stringify(params, null, 2)}
            </pre>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
