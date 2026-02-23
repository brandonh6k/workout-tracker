import { createClient } from '@supabase/supabase-js'
import { beforeAll } from 'vitest'

const SUPABASE_URL = 'http://127.0.0.1:54321'
const SERVICE_ROLE_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU'

export const adminClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
})

export { SUPABASE_URL }

beforeAll(async () => {
  const { error } = await adminClient.from('exercises').select('id').limit(1)
  if (error) {
    throw new Error(
      `Cannot reach local Supabase (${SUPABASE_URL}). ` +
        `Start it with: npm run db:start\n` +
        `Error: ${error.message}`
    )
  }
})
