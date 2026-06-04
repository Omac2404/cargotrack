import { cn } from '@/lib/utils'

interface Props {
  children: React.ReactNode
  className?: string
}

/**
 * Standard padding wrapper for content pages.
 * Form pages (sticky header) use their own layout without this.
 */
export function PageContainer({ children, className }: Props) {
  return <div className={cn('p-6', className)}>{children}</div>
}
