import SuperJSON from 'superjson'

import { useState } from 'react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'

import type { AppRouter } from '~/server/main'

let browserQueryClient: QueryClient | undefined = undefined

const links = [
  loggerLink({
    enabled: (op) =>
      import.meta.env.DEV ||
      (op.direction === 'down' && op.result instanceof Error)
  }),
  httpBatchLink({
    transformer: SuperJSON,
    url: (typeof window === 'undefined' ? process.env.APP_BASE : window.location.origin) + '/api/rpc',
  })
]

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    if (typeof window === 'undefined') {
      return new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 60 * 1000
          }
        }
      })
    }
    browserQueryClient ??= new QueryClient({
      defaultOptions: {
        queries: {
          staleTime: 60 * 1000
        }
      }
    })
    return browserQueryClient
  })
  const [trpcClient] = useState(() =>
    createTRPCClient<AppRouter>({
      links
    })
  )

  return (
    <QueryClientProvider client={queryClient}>
      <TRPCProvider trpcClient={trpcClient} queryClient={queryClient}>
        {children}
      </TRPCProvider>
    </QueryClientProvider>
  )
}