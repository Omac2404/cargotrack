import { Component, type ReactNode, type ErrorInfo } from 'react'
import { AlertOctagon, RefreshCcw, Home } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'

interface Props {
  children: ReactNode
  fallback?: ReactNode
}

interface State {
  hasError: boolean
  error: Error | null
  errorInfo: ErrorInfo | null
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false, error: null, errorInfo: null }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null }
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('[ErrorBoundary]', error, errorInfo)
    this.setState({ errorInfo })
  }

  handleReset = () => {
    this.setState({ hasError: false, error: null, errorInfo: null })
  }

  handleReload = () => {
    window.location.reload()
  }

  handleHome = () => {
    window.location.href = '/'
  }

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) return this.props.fallback

      return (
        <div className="min-h-[60vh] flex items-center justify-center p-6">
          <Card className="max-w-lg w-full p-6 space-y-4">
            <div className="flex items-start gap-3">
              <div className="w-10 h-10 rounded-lg bg-destructive/10 text-destructive flex items-center justify-center shrink-0">
                <AlertOctagon className="w-5 h-5" />
              </div>
              <div className="space-y-1 flex-1">
                <h2 className="text-lg font-semibold">Beklenmeyen bir hata oluştu</h2>
                <p className="text-sm text-muted-foreground">
                  Uygulama bir sorunla karşılaştı. Sayfayı yeniden yükleyebilir veya ana sayfaya dönebilirsin.
                </p>
              </div>
            </div>

            {this.state.error && (
              <details className="text-xs bg-muted/50 rounded p-3 border">
                <summary className="cursor-pointer font-medium select-none">Teknik detay</summary>
                <pre className="mt-2 overflow-auto max-h-48 text-[10px] whitespace-pre-wrap break-all">
                  {this.state.error.message}
                  {this.state.error.stack && '\n\n' + this.state.error.stack}
                </pre>
              </details>
            )}

            <div className="flex gap-2 pt-1">
              <Button onClick={this.handleReload} className="flex-1">
                <RefreshCcw className="w-4 h-4" />
                Sayfayı Yenile
              </Button>
              <Button onClick={this.handleHome} variant="outline">
                <Home className="w-4 h-4" />
                Ana Sayfa
              </Button>
            </div>
          </Card>
        </div>
      )
    }

    return this.props.children
  }
}
