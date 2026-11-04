import http from 'http'
import { io } from '../backend/node_modules/socket.io-client/build/esm/index.js'
import * as Y from '../backend/node_modules/yjs/dist/yjs.mjs'

const BASE_URL = 'http://localhost:4000'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const res = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
  })
  const text = await res.text()
  let data
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }
  return { status: res.status, ok: res.ok, data }
}

async function runMasterTestSuite() {
  console.log('====================================================')
  console.log('       CODECOLLAB PHASE 9 MASTER TEST SUITE         ')
  console.log('====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  [PASS] ${message}`)
      passed++
    } else {
      console.error(`  [FAIL] ${message}`)
      failed++
    }
  }

  // 1. Health & Server check
  console.log('--- 1. Infrastructure & Health Checks ---')
  const healthRes = await request('/health')
  assert(healthRes.status === 200 && healthRes.data.status === 'ok', 'Health endpoint returns 200 OK')

  // 2. Auth Flow
  console.log('\n--- 2. Authentication & Authorization ---')
  const emailA = `alice_${Date.now()}@example.com`
  const emailB = `bob_${Date.now()}@example.com`
  const password = 'Password123!'

  const regA = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password, name: 'Alice' }),
  })
  assert(regA.status === 201 && regA.data.user.email === emailA, 'Register user Alice')
  const tokenA = regA.data.token

  const regDup = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password, name: 'Alice Duplicate' }),
  })
  assert(regDup.status === 409, 'Duplicate registration rejected with 409')

  const loginBad = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password: 'WrongPassword' }),
  })
  assert(loginBad.status === 401, 'Invalid password rejected with 401')

  const loginA = await request('/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email: emailA, password }),
  })
  assert(loginA.status === 200 && loginA.data.token, 'Login user Alice returns valid JWT')

  const regB = await request('/auth/register', {
    method: 'POST',
    body: JSON.stringify({ email: emailB, password, name: 'Bob' }),
  })
  assert(regB.status === 201, 'Register user Bob')
  const tokenB = regB.data.token

  // 3. Room Management
  console.log('\n--- 3. Room Management & Memberships ---')
  const roomRes = await request('/api/rooms', {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ name: 'Master Room', language: 'python' }),
  })
  assert(roomRes.status === 201 && roomRes.data.id, 'Alice creates room')
  const roomId = roomRes.data.id

  const joinB = await request(`/api/rooms/${roomId}/join`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenB}` },
  })
  assert(joinB.status === 200, 'Bob joins room')

  const membersRes = await request(`/api/rooms/${roomId}/members`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert(membersRes.status === 200 && membersRes.data.length === 2, 'Room membership contains Alice and Bob')

  // 4. Code Execution (Phase 5)
  console.log('\n--- 4. Code Execution (Python, JS, Java, Syntax & Runtime Errors) ---')
  const pyCode = 'print("Count: 2")'
  const pyExec = await request(`/api/rooms/${roomId}/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ code: pyCode, language: 'python' }),
  })
  assert(pyExec.status === 200 && pyExec.data.stdout.includes('Count: 2'), 'Python execution succeeds with stdout')

  const jsCode = 'console.log("Sum: 6")'
  const jsExec = await request(`/api/rooms/${roomId}/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ code: jsCode, language: 'javascript' }),
  })
  assert(jsExec.status === 200 && jsExec.data.stdout.includes('Sum: 6'), 'JavaScript execution succeeds with stdout')

  const javaCode = `public class Main {
    public static void main(String[] args) {
        System.out.println("Java Master Test OK");
    }
}`
  const javaExec = await request(`/api/rooms/${roomId}/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ code: javaCode, language: 'java' }),
  })
  assert(javaExec.status === 200 && javaExec.data.stdout.includes('Java Master Test OK'), 'Java execution succeeds with stdout')

  const errCode = 'def broken_syntax(:\n  print("oops")'
  const errExec = await request(`/api/rooms/${roomId}/execute`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ code: errCode, language: 'python' }),
  })
  assert(errExec.status === 200 && (errExec.data.status?.id === 6 || errExec.data.status?.id === 11 || errExec.data.compile_output || errExec.data.stderr), 'Compilation/syntax error handled gracefully')

  // 5. Version History & Deduplication (Phase 6)
  console.log('\n--- 5. Persistence, Version History & Deduplication ---')
  const snap1 = await request(`/api/rooms/${roomId}/snapshots`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ code: 'print("v1")', language: 'python' }),
  })
  assert(snap1.status === 201 && snap1.data.id, 'Create initial snapshot v1')
  const snap1Id = snap1.data.id

  const snapDup = await request(`/api/rooms/${roomId}/snapshots`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ code: 'print("v1")', language: 'python' }),
  })
  assert(snapDup.status === 200 && snapDup.data.unchanged === true, 'Duplicate snapshot prevented (unchanged: true)')

  const snap2 = await request(`/api/rooms/${roomId}/snapshots`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
    body: JSON.stringify({ code: 'print("v2 updated code")', language: 'python' }),
  })
  assert(snap2.status === 201 && snap2.data.id, 'Create snapshot v2')
  const snap2Id = snap2.data.id

  const compareRes = await request(`/api/rooms/${roomId}/versions/compare?fromId=${snap1Id}&toId=${snap2Id}`, {
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert(compareRes.status === 200 && compareRes.data.diff && compareRes.data.diff.hasChanges === true, 'Compare versions returns diff lines')

  const restoreRes = await request(`/api/rooms/${roomId}/versions/${snap1Id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${tokenA}` },
  })
  assert(restoreRes.status === 200 && restoreRes.data.currentCode === 'print("v1")', 'Restore v1 updates current room code')

  // 6. Real-Time Collaboration & Sockets (Phase 4 & 7)
  console.log('\n--- 6. Real-Time Collaboration & Sockets (Redis pub/sub capable) ---')
  await new Promise((resolve) => {
    const s1 = io(BASE_URL, { auth: { token: tokenA } })
    const s2 = io(BASE_URL, { auth: { token: tokenB } })

    let s2SawUpdate = false
    let s2SawAwareness = false

    function checkDone() {
      if (s2SawUpdate && s2SawAwareness) {
        assert(true, 'Yjs document sync update received by collaborating socket')
        assert(true, 'Cursor/presence awareness update received by peer socket')
        s1.disconnect()
        s2.disconnect()
        resolve()
      }
    }

    s2.on('sync-update', (update) => {
      if (update) {
        s2SawUpdate = true
        checkDone()
      }
    })

    s2.on('awareness-update', (data) => {
      if (data) {
        s2SawAwareness = true
        checkDone()
      }
    })

    s1.on('connect', () => {
      s1.emit('join-room', roomId)
    })

    s2.on('connect', () => {
      s2.emit('join-room', roomId)
    })

    // Once both join, trigger real-time updates
    setTimeout(() => {
      const doc = new Y.Doc()
      const text = doc.getText('monaco')
      let validUpdate = null
      doc.on('update', (u) => {
        validUpdate = Array.from(u)
      })
      text.insert(0, 'Hello from Alice')

      s1.emit('sync-update', { roomId, update: validUpdate })
      s1.emit('awareness-update', { roomId, state: { cursor: { line: 5, col: 10 } } })
    }, 600)

    setTimeout(() => {
      if (!s2SawUpdate || !s2SawAwareness) {
        assert(s2SawUpdate, 'Yjs document sync update received')
        assert(s2SawAwareness, 'Cursor awareness update received')
        s1.disconnect()
        s2.disconnect()
        resolve()
      }
    }, 2500)
  })

  console.log('\n====================================================')
  console.log(`TOTAL PASSED: ${passed} | TOTAL FAILED: ${failed}`)
  console.log('====================================================')
  if (failed > 0) process.exit(1)
}

runMasterTestSuite().catch((err) => {
  console.error('Fatal error during test suite:', err)
  process.exit(1)
})
