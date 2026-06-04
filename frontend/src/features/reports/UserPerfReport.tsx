import { useState } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend,
} from 'recharts'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableHeader, TableBody, TableHead, TableRow, TableCell,
} from '@/components/ui/table'
import { useUserPerformance } from './hooks'
import { ReportLoading, ReportError } from './ReportsPage'
import { ExportButton } from '@/components/shared/ExportButton'
import { exportFormatters } from '@/lib/export'
import { formatMoney } from '@/lib/utils'

const CURRENT_YEAR = new Date().getFullYear()
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i)

const ROLE_LABELS: Record<string, { label: string; variant: 'default' | 'destructive' | 'success' | 'secondary' }> = {
  super_admin: { label: 'Süper Admin', variant: 'destructive' },
  admin: { label: 'Admin', variant: 'default' },
  user: { label: 'Kullanıcı', variant: 'secondary' },
}

export function UserPerfReport() {
  const [year, setYear] = useState(CURRENT_YEAR)
  const { data, isLoading, error } = useUserPerformance(year)

  if (isLoading) return <ReportLoading />
  if (error) return <ReportError error={error} />
  if (!data) return null

  const sortedUsers = [...data.users].sort((a, b) => b.shipment_count - a.shipment_count)
  const chartData = sortedUsers
    .filter((u) => u.shipment_count > 0)
    .slice(0, 10)
    .map((u) => ({ name: u.full_name || u.username, sevkiyat: u.shipment_count, kar: u.profit }))

  return (
    <div className="space-y-4">
      <Card className="p-3 flex flex-wrap items-end gap-3">
        <div className="space-y-1">
          <Label className="text-[10px]">Yıl</Label>
          <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
            <SelectTrigger className="h-8 w-[100px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              {YEARS.map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="text-xs text-muted-foreground">
          {data.users.length} kullanıcı · {sortedUsers.reduce((s, u) => s + u.shipment_count, 0)} toplam sevkiyat
        </div>
        <div className="ml-auto">
          <ExportButton
            data={sortedUsers as unknown as Record<string, unknown>[]}
            filename={`personel_performans_${year}`}
            sheetName="Personel Performansı"
            columns={[
              { header: 'Kullanıcı Adı', key: 'username' },
              { header: 'Tam Ad', key: 'full_name' },
              { header: 'Rol', key: 'role', format: (v) => ROLE_LABELS[v as string]?.label || String(v ?? '') },
              { header: 'Sevkiyat Sayısı', key: 'shipment_count' },
              { header: 'Toplam Ciro', key: 'total_sale', format: (v) => exportFormatters.number(v) },
              { header: 'Toplam Kâr', key: 'profit', format: (v) => exportFormatters.number(v) },
            ]}
          />
        </div>
      </Card>

      {/* Top 10 grafik */}
      {chartData.length > 0 && (
        <Card className="p-4">
          <h3 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Top 10 Kullanıcı — Sevkiyat ve Kâr ({year})
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData} layout="vertical" margin={{ left: 100 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis type="number" tick={{ fontSize: 11 }} />
              <YAxis type="category" dataKey="name" tick={{ fontSize: 11 }} width={100} />
              <Tooltip />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Bar dataKey="sevkiyat" name="Sevkiyat" fill="hsl(var(--primary))" />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      <Card className="overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Kullanıcı</TableHead>
              <TableHead>Rol</TableHead>
              <TableHead className="text-right">Sevkiyat</TableHead>
              <TableHead className="text-right">Toplam Ciro</TableHead>
              <TableHead className="text-right">Toplam Kâr</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sortedUsers.map((u) => {
              const role = ROLE_LABELS[u.role]
              return (
                <TableRow key={u.id}>
                  <TableCell>
                    <div className="font-medium text-sm">{u.full_name || u.username}</div>
                    <div className="text-[10px] text-muted-foreground font-mono">@{u.username}</div>
                  </TableCell>
                  <TableCell>
                    {role && <Badge variant={role.variant}>{role.label}</Badge>}
                  </TableCell>
                  <TableCell className="text-right tabular-nums font-medium">{u.shipment_count}</TableCell>
                  <TableCell className="text-right tabular-nums">{formatMoney(u.total_sale, 'EUR')}</TableCell>
                  <TableCell className={`text-right tabular-nums font-medium ${u.profit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatMoney(u.profit, 'EUR')}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </Card>
    </div>
  )
}
