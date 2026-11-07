// Outbox for active-workout writes. A dropped request must never cost a logged set,
// so every write is queued, persisted, and retried until it lands. Ops carry
// client-generated ids, which makes a retry after a lost response a no-op server side.

export type SetRow = {
  id: string
  session_id: string
  exercise_name: string
  set_number: number
  weight: number
  reps: number
  rpe: number | null
  notes: string | null
}

export type SetUpdates = { reps?: number }

export type SyncOp =
  | { kind: 'startSession'; session: { id: string; template_id: string | null; date: string } }
  | { kind: 'logSet'; set: SetRow }
  | { kind: 'updateSet'; sessionId: string; setId: string; updates: SetUpdates }
  | { kind: 'completeSession'; sessionId: string; durationMinutes: number }
  | { kind: 'abandonSession'; sessionId: string }

export type SyncSnapshot = { pending: number; lastError: string | null }

type QueueStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

type Options = {
  key: string
  storage: QueueStorage
  execute: (op: SyncOp) => Promise<void>
  retryDelaysMs?: number[]
}

const DEFAULT_RETRY_DELAYS_MS = [2_000, 5_000, 10_000, 30_000]

function sessionOf(op: SyncOp): string | null {
  switch (op.kind) {
    case 'startSession':
      return op.session.id
    case 'logSet':
      return op.set.session_id
    case 'updateSet':
    case 'completeSession':
    case 'abandonSession':
      return op.sessionId
  }
}

function load(storage: QueueStorage, key: string): SyncOp[] {
  try {
    const raw = storage.getItem(key)
    const parsed: unknown = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? (parsed as SyncOp[]) : []
  } catch {
    return []
  }
}

export function createSyncQueue({ key, storage, execute, retryDelaysMs = DEFAULT_RETRY_DELAYS_MS }: Options) {
  let ops = load(storage, key)
  let inFlight: SyncOp | null = null
  let running: Promise<void> | null = null
  let retryTimer: ReturnType<typeof setTimeout> | null = null
  let attempt = 0
  let snapshot: SyncSnapshot = { pending: ops.length, lastError: null }
  const listeners = new Set<() => void>()
  let idleWaiters: Array<() => void> = []

  const update = (lastError: string | null) => {
    try {
      if (ops.length) storage.setItem(key, JSON.stringify(ops))
      else storage.removeItem(key)
    } catch {
      // Storage full or unavailable: the ops still live in memory for this page
    }
    snapshot = { pending: ops.length, lastError }
    listeners.forEach((l) => l())
    if (ops.length === 0) {
      idleWaiters.forEach((resolve) => resolve())
      idleWaiters = []
    }
  }

  const scheduleRetry = () => {
    if (retryTimer) return
    const delay = retryDelaysMs[Math.min(attempt, retryDelaysMs.length - 1)]
    attempt++
    retryTimer = setTimeout(() => {
      retryTimer = null
      void flush()
    }, delay)
  }

  const run = async () => {
    while (ops.length) {
      inFlight = ops[0]
      try {
        await execute(inFlight)
      } catch (err) {
        inFlight = null
        update(err instanceof Error ? err.message : String(err))
        scheduleRetry()
        return
      }
      ops = ops.filter((op) => op !== inFlight)
      inFlight = null
      attempt = 0
      update(null)
    }
  }

  function flush(): Promise<void> {
    if (retryTimer) {
      clearTimeout(retryTimer)
      retryTimer = null
    }
    running ??= run().finally(() => {
      running = null
    })
    return running
  }

  function enqueue(op: SyncOp) {
    if (op.kind === 'startSession' && ops.some((o) => o.kind === 'startSession' && o.session.id === op.session.id)) {
      return
    }

    if (op.kind === 'updateSet') {
      const pendingInsert = ops.find(
        (o): o is Extract<SyncOp, { kind: 'logSet' }> =>
          o !== inFlight && o.kind === 'logSet' && o.set.id === op.setId
      )
      if (pendingInsert) {
        ops = ops.map((o) => (o === pendingInsert ? { ...pendingInsert, set: { ...pendingInsert.set, ...op.updates } } : o))
        update(snapshot.lastError)
        return
      }
    }

    if (op.kind === 'abandonSession') {
      const neverSent = ops.some(
        (o) => o !== inFlight && o.kind === 'startSession' && o.session.id === op.sessionId
      )
      ops = ops.filter((o) => o === inFlight || sessionOf(o) !== op.sessionId)
      if (neverSent) {
        update(ops.length ? snapshot.lastError : null)
        return
      }
    }

    ops = [...ops, op]
    update(snapshot.lastError)
    // Deferred so ops enqueued in the same tick go out as one run
    void Promise.resolve().then(flush)
  }

  return {
    enqueue,
    flush,
    getSnapshot: () => snapshot,
    peekAll: (): readonly SyncOp[] => ops,
    subscribe(listener: () => void) {
      listeners.add(listener)
      return () => listeners.delete(listener)
    },
    whenIdle(): Promise<void> {
      if (ops.length === 0) return Promise.resolve()
      return new Promise((resolve) => idleWaiters.push(resolve))
    },
    dispose() {
      if (retryTimer) clearTimeout(retryTimer)
      retryTimer = null
      listeners.clear()
    },
  }
}

export type SyncQueue = ReturnType<typeof createSyncQueue>
