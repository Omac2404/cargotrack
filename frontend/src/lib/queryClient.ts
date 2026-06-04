import { QueryClient } from '@tanstack/react-query'

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: (failureCount, error: unknown) => {
        // 401, 403, 404 retry yapma
        const status = (error as { status?: number })?.status
        if (status && [401, 403, 404].includes(status)) return false
        return failureCount < 2
      },
      staleTime: 30_000,
    },
    mutations: {
      retry: false,
    },
  },
})
