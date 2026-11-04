import { io } from '../backend/node_modules/socket.io-client/build/esm/index.js'
import * as Y from '../backend/node_modules/yjs/dist/yjs.mjs'

const BASE_URL = 'http://localhost:4000'

async function postJson(path, body, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...headers },
    body: JSON.stringify(body),
  })
  return { status: res.status, data: await res.json() }
}

async function getJson(path, headers = {}) {
  const res = await fetch(`${BASE_URL}${path}`, {
    headers: { 'Content-Type': 'application/json', ...headers },
  })
  return { status: res.status, data: await res.json() }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function runRealtimeTests() {
  console.log('=====================================================')
  console.log('⚡ PHASE 4 REAL-TIME COLLABORATION TEST SUITE')
  console.log('=====================================================\n')

  let passed = 0
  let failed = 0

  function assert(condition, message) {
    if (condition) {
      console.log(`  ✓ ${message}`)
      passed++
    } else {
      console.error(`  ✗ FAIL: ${message}`)
      failed++
    }
  }

  // 1. Create two test accounts
  const email1 = `collab_alice_${Date.now()}@test.com`
  const email2 = `collab_bob_${Date.now()}@test.com`
  const password = 'RealtimePassword123!'

  const reg1 = await postJson('/auth/register', { name: 'Alice CRDT', email: email1, password })
  const reg2 = await postJson('/auth/register', { name: 'Bob CRDT', email: email2, password })

  assert(reg1.status === 201 && reg2.status === 201, 'Registered Alice and Bob test accounts')
  const token1 = reg1.data.token
  const token2 = reg2.data.token

  // 2. Alice creates a room
  const createRoomRes = await postJson(
    '/api/rooms',
    { name: 'Real-Time CRDT Lab', language: 'javascript' },
    { Authorization: `Bearer ${token1}` }
  )
  assert(createRoomRes.status === 201, 'Alice created room')
  const roomId = createRoomRes.data.id

  // 3. Bob joins the room
  const joinRes = await postJson(`/api/rooms/${roomId}/join`, {}, { Authorization: `Bearer ${token2}` })
  assert(joinRes.status === 200, 'Bob joined room via API')

  // 4. Authenticated Socket.IO connections
  const socket1 = io(BASE_URL, {
    auth: { token: token1 },
    transports: ['websocket'],
  })

  const socket2 = io(BASE_URL, {
    auth: { token: token2 },
    transports: ['websocket'],
  })

  await new Promise((resolve, reject) => {
    let connectedCount = 0
    function onConn() {
      connectedCount++
      if (connectedCount === 2) resolve(true)
    }
    socket1.on('connect', onConn)
    socket2.on('connect', onConn)
    socket1.on('connect_error', reject)
    socket2.on('connect_error', reject)
  })
  assert(socket1.connected && socket2.connected, 'Both Alice and Bob authenticated with Socket.IO')

  // 5. Local Y.Docs for Alice and Bob
  const doc1 = new Y.Doc()
  const text1 = doc1.getText('monaco')

  const doc2 = new Y.Doc()
  const text2 = doc2.getText('monaco')

  // Wire sync-update listeners
  doc1.on('update', (update, origin) => {
    if (origin !== 'remote' && socket1.connected) {
      socket1.emit('sync-update', { roomId, update: Array.from(update) })
    }
  })

  doc2.on('update', (update, origin) => {
    if (origin !== 'remote' && socket2.connected) {
      socket2.emit('sync-update', { roomId, update: Array.from(update) })
    }
  })

  socket1.on('sync-update', (updateBytes) => {
    Y.applyUpdate(doc1, new Uint8Array(updateBytes), 'remote')
  })

  socket2.on('sync-update', (updateBytes) => {
    Y.applyUpdate(doc2, new Uint8Array(updateBytes), 'remote')
  })

  // 6. Join room and receive full state
  let roomUsersCount = 0
  socket1.on('room-users', (users) => {
    roomUsersCount = users.length
  })

  const syncPromise1 = new Promise((resolve) => {
    socket1.on('sync-full-state', (bytes) => {
      Y.applyUpdate(doc1, new Uint8Array(bytes), 'remote')
      resolve(true)
    })
  })
  socket1.emit('join-room', roomId)
  await syncPromise1
  assert(text1.length > 0, 'Alice received initial room code from server Y.Doc')

  const syncPromise2 = new Promise((resolve) => {
    socket2.on('sync-full-state', (bytes) => {
      Y.applyUpdate(doc2, new Uint8Array(bytes), 'remote')
      resolve(true)
    })
  })
  socket2.emit('join-room', roomId)
  await syncPromise2
  assert(text1.toString() === text2.toString(), 'Bob synchronized with identical document state on join')

  // 7. Verify presence (room-users)
  await sleep(200)
  assert(roomUsersCount === 2, 'Socket.IO broadcast presence showing 2 active collaborators')

  // 8. Real-time edit from Alice transmitted to Bob
  const aliceInsert = '\n// Edited by Alice at runtime\nfunction add(a, b) { return a + b; }\n'
  text1.insert(text1.length, aliceInsert)

  // Give socket transport 200ms to deliver update
  await sleep(300)
  assert(text2.toString().includes('function add(a, b)'), 'Bob received Alice edit in real time')
  assert(text1.toString() === text2.toString(), 'Alice and Bob Y.Docs are in exact sync')

  // 9. Concurrent editing (CRDT conflict resolution)
  // Alice edits at index 0, Bob edits at the end simultaneously
  text1.insert(0, '/* Top Banner: CodeCollab */\n')
  text2.insert(text2.length, '// Bottom signature: Bob\n')

  await sleep(400)
  assert(text1.toString() === text2.toString(), 'CRDT converged: Alice and Bob have identical converged state after concurrent edits')
  assert(
    text1.toString().startsWith('/* Top Banner: CodeCollab */') &&
    text1.toString().includes('// Bottom signature: Bob'),
    'Both concurrent modifications were preserved without data loss or overwrites'
  )

  // 10. Awareness / cursor exchange
  let bobReceivedAwareness = false
  socket2.on('awareness-update', (data) => {
    if (data.state?.cursor?.line === 42) {
      bobReceivedAwareness = true
    }
  })

  socket1.emit('awareness-update', {
    roomId,
    state: {
      user: { id: reg1.data.user.id, name: 'Alice CRDT', avatarUrl: null },
      cursor: { line: 42, column: 15 },
    },
  })

  await sleep(300)
  assert(bobReceivedAwareness, 'Bob received Alice cursor position update')

  // 11. Cleanup sockets
  socket1.emit('leave-room', roomId)
  socket2.emit('leave-room', roomId)
  socket1.disconnect()
  socket2.disconnect()

  console.log(`\n========================================`)
  console.log(`All Phase 4 Real-Time Tests Passed: ${passed} / ${passed + failed}`)
  console.log(`========================================\n`)

  if (failed > 0) {
    process.exit(1)
  }
}

runRealtimeTests().catch((err) => {
  console.error('Test error:', err)
  process.exit(1)
})
