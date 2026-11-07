import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { createSyncQueue, type SyncOp } from './syncQueue'

const KEY = 'test-queue'

function memoryStorage() {
  const data = new Map<string, string>()
  return {
    getItem: (k: string) => data.get(k) ?? null,
    setItem: (k: string, v: string) => void data.set(k, v),
    removeItem: (k: string) => void data.delete(k),
  }
}

const start: SyncOp = {
  kind: 'startSession',
  session: { id: 's1', template_id: 't1', date: '2026-11-07' },
}

function logSet(id: string, reps = 5): SyncOp {
  return {
    kind: 'logSet',
    set: { id, session_id: 's1', exercise_name: 'Squat', set_number: 1, weight: 225, reps, rpe: null, notes: null },
  }
}

describe('syncQueue', () => {
  beforeEach(() => vi.useFakeTimers())
  afterEach(() => vi.useRealTimers())

  it('runs ops in order and empties the queue', async () => {
    const done: string[] = []
    const queue = createSyncQueue({
      key: KEY,
      storage: memoryStorage(),
      execute: async (op) => void done.push(op.kind),
    })

    queue.enqueue(start)
    queue.enqueue(logSet('a'))
    await queue.whenIdle()

    expect(done).toEqual(['startSession', 'logSet'])
    expect(queue.getSnapshot()).toEqual({ pending: 0, lastError: null })
  })

  it('keeps failed ops, reports the error, and retries until the network comes back', async () => {
    let online = false
    const done: string[] = []
    const queue = createSyncQueue({
      key: KEY,
      storage: memoryStorage(),
      retryDelaysMs: [1000],
      execute: async (op) => {
        if (!online) throw new TypeError('Failed to fetch')
        done.push(op.kind)
      },
    })

    queue.enqueue(start)
    queue.enqueue(logSet('a'))
    await vi.advanceTimersByTimeAsync(0)

    expect(queue.getSnapshot()).toEqual({ pending: 2, lastError: 'Failed to fetch' })
    expect(done).toEqual([])

    online = true
    await vi.advanceTimersByTimeAsync(1000)

    expect(done).toEqual(['startSession', 'logSet'])
    expect(queue.getSnapshot()).toEqual({ pending: 0, lastError: null })
  })

  it('restores pending ops from storage, so a reload loses nothing', async () => {
    const storage = memoryStorage()
    const offline = createSyncQueue({
      key: KEY,
      storage,
      execute: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    offline.enqueue(start)
    offline.enqueue(logSet('a'))
    await vi.advanceTimersByTimeAsync(0)
    offline.dispose()

    const done: SyncOp[] = []
    const reloaded = createSyncQueue({ key: KEY, storage, execute: async (op) => void done.push(op) })
    expect(reloaded.getSnapshot().pending).toBe(2)

    await reloaded.flush()
    expect(done).toEqual([start, logSet('a')])
  })

  it('folds a rep edit into its set when the set has not been sent yet', async () => {
    const queue = createSyncQueue({
      key: KEY,
      storage: memoryStorage(),
      execute: async () => {
        throw new TypeError('Failed to fetch')
      },
    })
    queue.enqueue(start)
    queue.enqueue(logSet('a', 5))
    queue.enqueue({ kind: 'updateSet', sessionId: 's1', setId: 'a', updates: { reps: 7 } })
    await vi.advanceTimersByTimeAsync(0)

    expect(queue.getSnapshot().pending).toBe(2)
    expect(queue.peekAll()[1]).toEqual(logSet('a', 7))
  })

  it('queues a rep edit separately when its set is already in flight', async () => {
    let release!: () => void
    const done: SyncOp[] = []
    const queue = createSyncQueue({
      key: KEY,
      storage: memoryStorage(),
      execute: (op) =>
        new Promise<void>((resolve) => {
          done.push(op)
          release = resolve
        }),
    })
    queue.enqueue(logSet('a', 5))
    await vi.advanceTimersByTimeAsync(0)
    queue.enqueue({ kind: 'updateSet', sessionId: 's1', setId: 'a', updates: { reps: 7 } })
    release()
    await vi.advanceTimersByTimeAsync(0)
    release()
    await queue.whenIdle()

    expect(done).toEqual([logSet('a', 5), { kind: 'updateSet', sessionId: 's1', setId: 'a', updates: { reps: 7 } }])
  })

  it('drops an abandoned session outright when none of it reached the server', async () => {
    const execute = vi.fn(async () => {
      throw new TypeError('Failed to fetch')
    })
    const queue = createSyncQueue({ key: KEY, storage: memoryStorage(), execute })
    queue.enqueue(start)
    queue.enqueue(logSet('a'))
    await vi.advanceTimersByTimeAsync(0)
    execute.mockClear()

    queue.enqueue({ kind: 'abandonSession', sessionId: 's1' })

    expect(queue.getSnapshot().pending).toBe(0)
    await vi.advanceTimersByTimeAsync(60_000)
    expect(execute).not.toHaveBeenCalled()
  })

  it('sends a delete for an abandoned session that already reached the server', async () => {
    const done: string[] = []
    const queue = createSyncQueue({ key: KEY, storage: memoryStorage(), execute: async (op) => void done.push(op.kind) })
    queue.enqueue(start)
    await queue.whenIdle()

    queue.enqueue(logSet('a'))
    queue.enqueue({ kind: 'abandonSession', sessionId: 's1' })
    await queue.whenIdle()

    expect(done).toEqual(['startSession', 'abandonSession'])
  })

  it('ignores a second start for the same session', async () => {
    const done: string[] = []
    const queue = createSyncQueue({ key: KEY, storage: memoryStorage(), execute: async (op) => void done.push(op.kind) })
    queue.enqueue(start)
    queue.enqueue(start)
    await queue.whenIdle()

    expect(done).toEqual(['startSession'])
  })
})
