import { type ReactNode } from 'react'
import { ArrowUp, ArrowDown, Minus } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { cn, formatMoney, formatNumber } from '@/lib/utils'

interface Props {
  label: string
  value: ReactNode
  icon?: ReactNode
  sub?: ReactNode
  trend?: { current: number; previous: number; format?: 'count' | 'money' | 'percent' }
  currency?: string
  variant?: 'default' | 'primary' | 'success' | 'warning' | 'destructive'
}

export function StatCard({ label, value, icon, sub, trend, currency = 'EUR', variant = 'default' }: Props) {
  const variantClasses = {
    default: 'text-foreground',
    primary: 'text-primary',
    success: 'text-success',
    warning: 'text-warning',
    destructive: 'text-destructive',
  }
  const iconBg = {
    default: 'bg-muted text-muted-foreground',
    primary: 'bg-primary/10 text-primary',
    success: 'bg-success/10 text-success',
    warning: 'bg-warning/10 text-warning',
    destructive: 'bg-destructive/10 text-destructive',
  }

  let trendNode: ReactNode = null
  if (trend && trend.previous !== 0) {
    const diff = trend.current - trend.previous
    const pct = (diff / Math.abs(trend.previous)) * 100
    const isUp = diff > 0
    const isDown = diff < 0
    const TrendIcon = isUp ? ArrowUp : isDown ? ArrowDown : Minus
    const trendColor = isUp ? 'text-success' : isDown ? 'text-destructive' : 'text-muted-foreground'
    trendNode = (
      <div className={cn('flex items-center gap-0.5 text-[10px] font-medium', trendColor)}>
        <TrendIcon className="w-2.5 h-2.5" />
        <span>{Math.abs(pct).toFixed(1)}%</span>
        <span className="text-muted-foreground font-normal ml-0.5">
          (prev: {trend.format === 'money' ? formatMoney(trend.previous, currency) : formatNumber(trend.previous, 0)})
        </span>
      </div>
    )
  } else if (trend && trend.previous === 0 && trend.current > 0) {
    trendNode = <div className="text-[10px] text-success font-medium">YENİ</div>
  }

  return (
    <Card className="p-3 space-y-1.5">
      <div className="flex items-start justify-between gap-2">
        <span className="text-[10px] uppercase tracking-wider text-muted-foreground font-semibold">{label}</span>
        {icon && (
          <div className={cn('w-7 h-7 rounded-md flex items-center justify-center shrink-0', iconBg[variant])}>
            {icon}
          </div>
        )}
      </div>
      <div className={cn('text-xl font-bold tabular-nums tracking-tight', variantClasses[variant])}>{value}</div>
      {(sub || trendNode) && (
        <div className="flex items-center justify-between gap-2 pt-0.5">
          {sub && <div className="text-[10px] text-muted-foreground">{sub}</div>}
          {trendNode}
        </div>
      )}
    </Card>
  )
}
