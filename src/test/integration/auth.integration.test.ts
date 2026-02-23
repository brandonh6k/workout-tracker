import { describe, it, expect, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'
import { adminClient, SUPABASE_URL } from './setup'
import { createAnonClient, cleanupTestUser } from './helpers'

const ANON_KEY =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.CRXP1A7WOeoJeXxjNni43kdQwgnWNReilDMblYTn_I0'

const createdUserIds: string[] = []

afterAll(async () => {
  for (const id of createdUserIds) {
    await cleanupTestUser(id)
  }
})

describe('Auth', () => {
  it('signs up a new user and returns user data', async () => {
    const email = `signup-${Math.random().toString(36).slice(2, 8)}@test.local`
    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })

    const { data, error } = await client.auth.signUp({
      email,
      password: 'test-password-123!',
    })

    expect(error).toBeNull()
    expect(data.user).toBeTruthy()
    expect(data.user!.email).toBe(email)
    createdUserIds.push(data.user!.id)
  })

  it('rejects signup with a short password', async () => {
    const client = createAnonClient()
    const { error } = await client.auth.signUp({
      email: `short-pw-${Date.now()}@test.local`,
      password: '123',
    })
    expect(error).toBeTruthy()
  })

  it('rejects signup with a duplicate email', async () => {
    const email = `dup-${Math.random().toString(36).slice(2, 8)}@test.local`

    // Create user via admin so email is confirmed
    const { data: first } = await adminClient.auth.admin.createUser({
      email,
      password: 'test-password-123!',
      email_confirm: true,
    })
    createdUserIds.push(first.user!.id)

    // Attempt duplicate signup
    const client = createAnonClient()
    const { data } = await client.auth.signUp({
      email,
      password: 'test-password-123!',
    })

    // Supabase returns a "fake" user with no identities for duplicate emails
    expect(
      data.user?.identities?.length === 0 || data.user === null
    ).toBe(true)
  })

  it('signs in with valid credentials', async () => {
    const email = `login-${Math.random().toString(36).slice(2, 8)}@test.local`
    const password = 'test-password-123!'

    const { data: created } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    createdUserIds.push(created.user!.id)

    const client = createAnonClient()
    const { data, error } = await client.auth.signInWithPassword({
      email,
      password,
    })

    expect(error).toBeNull()
    expect(data.session).toBeTruthy()
    expect(data.user!.email).toBe(email)
  })

  it('rejects sign in with wrong password', async () => {
    const email = `wrongpw-${Math.random().toString(36).slice(2, 8)}@test.local`
    const { data: created } = await adminClient.auth.admin.createUser({
      email,
      password: 'correct-password-123!',
      email_confirm: true,
    })
    createdUserIds.push(created.user!.id)

    const client = createAnonClient()
    const { error } = await client.auth.signInWithPassword({
      email,
      password: 'wrong-password-999!',
    })
    expect(error).toBeTruthy()
  })

  it('getUser returns the authenticated user', async () => {
    const email = `getuser-${Math.random().toString(36).slice(2, 8)}@test.local`
    const password = 'test-password-123!'

    const { data: created } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    createdUserIds.push(created.user!.id)

    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email, password })

    const {
      data: { user },
    } = await client.auth.getUser()

    expect(user).toBeTruthy()
    expect(user!.email).toBe(email)
  })

  it('signOut clears the session', async () => {
    const email = `signout-${Math.random().toString(36).slice(2, 8)}@test.local`
    const password = 'test-password-123!'

    const { data: created } = await adminClient.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
    })
    createdUserIds.push(created.user!.id)

    const client = createClient(SUPABASE_URL, ANON_KEY, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    await client.auth.signInWithPassword({ email, password })
    await client.auth.signOut()

    const {
      data: { session },
    } = await client.auth.getSession()
    expect(session).toBeNull()
  })

  it('unauthenticated client gets empty results from protected tables', async () => {
    const client = createAnonClient()
    const { data, error } = await client.from('workout_templates').select('*')

    expect(error).toBeNull()
    expect(data).toEqual([])
  })
})
