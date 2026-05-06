import SuperJSON from 'superjson'

import { useState } from 'react'
import { QueryClientProvider, QueryClient } from '@tanstack/react-query'
import { createTRPCClient, httpBatchLink, loggerLink } from '@trpc/client'
import { createTRPCContext } from '@trpc/tanstack-react-query'

import type { AppRouter } from '~/server/main'

function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1000
      }
    }
  })
}
let browserQueryClient: QueryClient | undefined = undefined
function getQueryClient() {
  if (typeof window === 'undefined') {
    return makeQueryClient()
  } else {
    browserQueryClient ??= makeQueryClient()
    return browserQueryClient
  }
}

function getBaseUrl() {
  if (typeof window === 'undefined') {
    return process.env.APP_BASE
  }
  return window.location.origin
}

const links = [
  loggerLink({
    enabled: (op) =>
      import.meta.env.DEV ||
      (op.direction === 'down' && op.result instanceof Error)
  }),
  httpBatchLink({
    transformer: SuperJSON,
    url: getBaseUrl() + '/api/rpc',
  })
]

export const { TRPCProvider, useTRPC } = createTRPCContext<AppRouter>()

export function TRPCReactProvider({ children }: { children: React.ReactNode }) {
  const queryClient = getQueryClient()
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