import { useState } from 'react'
import {
  BarChart3, TrendingUp, Users, AlertTriangle, Truck, UserCheck, Loader2, AlertCircle,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { MonthlyRevenueReport } from './MonthlyRevenueReport'
import { CustomerRankingReport } from './CustomerRankingReport'
import { AgingReport } from './AgingReport'
import { VehicleUtilReport } from './VehicleUtilReport'
import { UserPerfReport } from './UserPerfReport'
import { useAuth } from '@/stores/auth'

export function ReportsPage() {
  const { t } = useTranslation()
  const [tab, setTab] = useState('monthly')
  const isAdmin = useAuth((s) => s.hasRole('admin'))

  return (
    <div className="space-y-4 max-w-[1600px]">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 text-white flex items-center justify-center">
          <BarChart3 className="w-5 h-5" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">{t('reports.title')}</h1>
          <p className="text-xs text-muted-foreground">{t('reports.subtitle')}</p>
        </div>
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full md:w-auto">
          <TabsTrigger value="monthly">
            <TrendingUp className="w-3.5 h-3.5" /> {t('reports.monthly_revenue')}
          </TabsTrigger>
          <TabsTrigger value="customers">
            <Users className="w-3.5 h-3.5" /> {t('reports.customer_ranking')}
          </TabsTrigger>
          <TabsTrigger value="aging">
            <AlertTriangle className="w-3.5 h-3.5" /> {t('reports.aging')}
          </TabsTrigger>
          <TabsTrigger value="vehicles">
            <Truck className="w-3.5 h-3.5" /> {t('reports.vehicle_utilization')}
          </TabsTrigger>
          {isAdmin && (
            <TabsTrigger value="users">
              <UserCheck className="w-3.5 h-3.5" /> {t('reports.user_performance')}
            </TabsTrigger>
          )}
        </TabsList>

        <TabsContent value="monthly" className="mt-4">
          <MonthlyRevenueReport />
        </TabsContent>
        <TabsContent value="customers" className="mt-4">
          <CustomerRankingReport />
        </TabsContent>
        <TabsContent value="aging" className="mt-4">
          <AgingReport />
        </TabsContent>
        <TabsContent value="vehicles" className="mt-4">
          <VehicleUtilReport />
        </TabsContent>
        {isAdmin && (
          <TabsContent value="users" className="mt-4">
            <UserPerfReport />
          </TabsContent>
        )}
      </Tabs>
    </div>
  )
}

export function ReportLoading() {
  return (
    <Card className="p-12 text-center text-muted-foreground">
      <Loader2 className="w-6 h-6 animate-spin mx-auto" />
    </Card>
  )
}

export function ReportError({ error }: { error: unknown }) {
  return (
    <Card className="p-8 text-center text-destructive">
      <AlertCircle className="w-8 h-8 mx-auto mb-2" />
      {(error as Error).message}
    </Card>
  )
}
