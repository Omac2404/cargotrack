import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  WhAccount, WhOverview, WhMovement, WhService, WhStatement, StatementRecord, StatementStatus,
} from './types'

const K = {
  overview: (period: string) => ['wh-overview', period] as const,
  account: (id: number | string) => ['wh-account', String(id)] as const,
  movements: (id: number | string) => ['wh-movements', String(id)] as const,
  services: (id: number | string) => ['wh-services', String(id)] as const,
  statement: (id: number | string, period: string) => ['wh-statement', String(id), period] as const,
  statements: (id: number | string) => ['wh-statements', String(id)] as const,
}

/** Bir hesaptaki değişiklikten sonra ilgili tüm görünümler tazelenir */
function invalidateAccount(qc: ReturnType<typeof useQueryClient>, id: number | string) {
  qc.invalidateQueries({ queryKey: ['wh-overview'] })
  qc.invalidateQueries({ queryKey: K.account(id) })
  qc.invalidateQueries({ queryKey: K.movements(id) })
  qc.invalidateQueries({ queryKey: K.services(id) })
  qc.invalidateQueries({ queryKey: ['wh-statement', String(id)] })
  qc.invalidateQueries({ queryKey: K.statements(id) })
}

export function useWhOverview(period: string) {
  return useQuery({
    queryKey: K.overview(period),
    queryFn: () => api.get<WhOverview>('/api/warehousing/overview', { period }),
  })
}

export function useWhAccount(id: number | string | undefined) {
  return useQuery({
    queryKey: K.account(id ?? ''),
    queryFn: () => api.get<WhAccount>(`/api/warehousing/accounts/${id}`),
    enabled: !!id,
  })
}

export function useSaveWhAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Partial<WhAccount>) =>
      api.post<{ id: number; account_code?: string; message: string }>('/api/warehousing/accounts', data),
    onSuccess: (res) => invalidateAccount(qc, res.id),
  })
}

export function useDeleteWhAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/warehousing/accounts/${id}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['wh-overview'] }),
  })
}

export function useWhMovements(id: number | string | undefined) {
  return useQuery({
    queryKey: K.movements(id ?? ''),
    queryFn: () => api.get<{ balance: number; movements: WhMovement[] }>(`/api/warehousing/accounts/${id}/movements`),
    enabled: !!id,
  })
}

export function useSaveWhMovement(accountId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<{ id: number; message: string }>(`/api/warehousing/accounts/${accountId}/movements`, data),
    onSuccess: () => invalidateAccount(qc, accountId),
  })
}

export function useDeleteWhMovement(accountId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/warehousing/movements/${id}`),
    onSuccess: () => invalidateAccount(qc, accountId),
  })
}

export function useWhServices(id: number | string | undefined) {
  return useQuery({
    queryKey: K.services(id ?? ''),
    queryFn: () => api.get<WhService[]>(`/api/warehousing/accounts/${id}/services`),
    enabled: !!id,
  })
}

export function useSaveWhService(accountId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (data: Record<string, unknown>) =>
      api.post<{ id: number; message: string }>(`/api/warehousing/accounts/${accountId}/services`, data),
    onSuccess: () => invalidateAccount(qc, accountId),
  })
}

export function useDeleteWhService(accountId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/warehousing/services/${id}`),
    onSuccess: () => invalidateAccount(qc, accountId),
  })
}

export function useWhStatement(id: number | string | undefined, period: string) {
  return useQuery({
    queryKey: K.statement(id ?? '', period),
    queryFn: () => api.get<WhStatement>(`/api/warehousing/accounts/${id}/statement`, { period }),
    enabled: !!id && /^\d{4}-\d{2}$/.test(period),
  })
}

export function useWhStatements(id: number | string | undefined) {
  return useQuery({
    queryKey: K.statements(id ?? ''),
    queryFn: () => api.get<StatementRecord[]>(`/api/warehousing/accounts/${id}/statements`),
    enabled: !!id,
  })
}

export function useCloseWhPeriod(accountId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (period: string) =>
      api.post<{ id: number; statement_no: string; message: string }>(`/api/warehousing/accounts/${accountId}/statements`, { period }),
    onSuccess: () => invalidateAccount(qc, accountId),
  })
}

export function useSetWhStatementStatus(accountId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: ({ id, status, invoice_no }: { id: number; status: StatementStatus; invoice_no?: string }) =>
      api.post<{ message: string }>(`/api/warehousing/statements/${id}/status`, { status, invoice_no }),
    onSuccess: () => invalidateAccount(qc, accountId),
  })
}

export function useDeleteWhStatement(accountId: number) {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => api.delete<{ message: string }>(`/api/warehousing/statements/${id}`),
    onSuccess: () => invalidateAccount(qc, accountId),
  })
}
