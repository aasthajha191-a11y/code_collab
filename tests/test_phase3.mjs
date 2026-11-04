const BASE_URL = 'http://localhost:4000'

async function request(path, options = {}) {
  const url = `${BASE_URL}${path}`
  const headers = {
    'Content-Type': 'application/json',
    ...(options.headers || {}),
  }
  const body = options.body ? JSON.stringify(options.body) : undefined

  const res = await fetch(url, {
    method: options.method || 'GET',
    headers,
    body,
  })

  let data = null
  const text = await res.text()
  try {
    data = JSON.parse(text)
  } catch {
    data = text
  }

  return { status: res.status, ok: res.ok, data }
}

async function runTests() {
  console.log('🚀 Starting Phase 3 Backend & Database Tests...\n')
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

  try {
    // 1. Health check
    const health = await request('/health')
    assert(health.status === 200 && health.data.status === 'ok', 'Backend health check responds with ok')

    // 2. User registration (User 1)
    const testEmail1 = `alice_${Date.now()}@example.com`
    const regRes1 = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Developer',
        email: testEmail1,
        password: 'SecurePassword123!',
      },
    })
    assert(regRes1.status === 201, 'User 1 registered with status 201')
    assert(regRes1.data.token && regRes1.data.user.email === testEmail1, 'Registration returns token and user profile')
    const token1 = regRes1.data.token

    // Test duplicate registration error (409)
    const dupRes = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Alice Duplicate',
        email: testEmail1,
        password: 'AnotherPassword!',
      },
    })
    assert(dupRes.status === 409, 'Duplicate registration correctly rejected with 409 Conflict')

    // 3. User login
    const loginRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: testEmail1,
        password: 'SecurePassword123!',
      },
    })
    assert(loginRes.status === 200, 'User login succeeds with status 200')
    assert(loginRes.data.token && loginRes.data.user.name === 'Alice Developer', 'Login returns valid token and user profile')

    // Test invalid password rejection
    const badPassRes = await request('/auth/login', {
      method: 'POST',
      body: {
        email: testEmail1,
        password: 'WrongPassword!',
      },
    })
    assert(badPassRes.status === 401, 'Invalid password correctly rejected with 401')

    // 4. User authentication & authorization (/auth/me)
    const meRes = await request('/auth/me', {
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(meRes.status === 200 && meRes.data.id === regRes1.data.user.id, 'Authenticated /auth/me returns current user')

    // Test unauthenticated request
    const unauthRes = await request('/api/rooms')
    assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with 401')

    // 5. Creating coding room
    const createRoomRes = await request('/api/rooms', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: { name: 'CS Algorithm Lab', language: 'python' },
    })
    assert(createRoomRes.status === 201, 'Room created with status 201')
    const room = createRoomRes.data
    assert(room.name === 'CS Algorithm Lab' && room.language === 'python', 'Room has correct name and language')
    assert(room.ownerId === meRes.data.id, 'Room ownerId matches creator ID')

    // 6. User 2 registration & joining the room
    const testEmail2 = `bob_${Date.now()}@example.com`
    const regRes2 = await request('/auth/register', {
      method: 'POST',
      body: {
        name: 'Bob Collaborator',
        email: testEmail2,
        password: 'BobPassword123!',
      },
    })
    const token2 = regRes2.data.token

    const joinRes = await request(`/api/rooms/${room.id}/join`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token2}` },
    })
    assert(joinRes.status === 200, 'User 2 joined room with status 200')

    // 7. Retrieving room members
    const membersRes = await request(`/api/rooms/${room.id}/members`, {
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(membersRes.status === 200 && membersRes.data.length === 2, 'Room members list contains 2 users (owner + member)')
    assert(membersRes.data.some((m) => m.role === 'owner'), 'Owner role preserved in membership')
    assert(membersRes.data.some((m) => m.role === 'member'), 'Member role preserved in membership')

    // 8. Retrieving user rooms
    const user1Rooms = await request('/api/rooms', {
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(user1Rooms.data.some((r) => r.id === room.id && r.role === 'owner'), 'User 1 retrieves room as owner')

    const user2Rooms = await request('/api/rooms', {
      headers: { Authorization: `Bearer ${token2}` },
    })
    assert(user2Rooms.data.some((r) => r.id === room.id && r.role === 'member'), 'User 2 retrieves room as member')

    // 9. Updating room details
    const updateRes = await request(`/api/rooms/${room.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token1}` },
      body: { name: 'Advanced Distributed Algorithms' },
    })
    assert(updateRes.status === 200 && updateRes.data.name === 'Advanced Distributed Algorithms', 'Room name updated successfully')

    // Test non-owner cannot rename
    const badRenameRes = await request(`/api/rooms/${room.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token2}` },
      body: { name: 'Hacked Name' },
    })
    assert(badRenameRes.status === 403, 'Non-owner rename attempt rejected with 403 Forbidden')

    // 10. Saving and retrieving code documents
    const newCode = 'def quicksort(arr):\n    if len(arr) <= 1: return arr\n    pivot = arr[len(arr) // 2]\n    left = [x for x in arr if x < pivot]\n    mid = [x for x in arr if x == pivot]\n    right = [x for x in arr if x > pivot]\n    return quicksort(left) + mid + quicksort(right)\n'
    const saveCodeRes = await request(`/api/rooms/${room.id}/code`, {
      method: 'PUT',
      headers: { Authorization: `Bearer ${token2}` },
      body: { code: newCode, language: 'python' },
    })
    assert(saveCodeRes.status === 200, 'Code document saved successfully')

    const getCodeRes = await request(`/api/rooms/${room.id}/code`, {
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(getCodeRes.status === 200 && getCodeRes.data.code === newCode, 'Code document retrieved successfully matches saved code')

    // 11. Creating and restoring snapshots
    const snapRes = await request(`/api/rooms/${room.id}/snapshots`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
      body: { code: newCode, language: 'python' },
    })
    assert(snapRes.status === 201, 'Version snapshot created successfully')

    const versionsRes = await request(`/api/rooms/${room.id}/versions`, {
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(versionsRes.status === 200 && versionsRes.data.length >= 2, 'Version history contains created snapshots')

    const v1Id = versionsRes.data[versionsRes.data.length - 1].id
    const restoreRes = await request(`/api/rooms/${room.id}/versions/${v1Id}/restore`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(restoreRes.status === 200, 'Version restored successfully')

    // 12. Deleting room with authorization
    // Non-owner cannot delete
    const badDelRes = await request(`/api/rooms/${room.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token2}` },
    })
    assert(badDelRes.status === 403, 'Non-owner delete attempt rejected with 403 Forbidden')

    // Owner can delete
    const delRes = await request(`/api/rooms/${room.id}`, {
      method: 'DELETE',
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(delRes.status === 200, 'Owner deleted room successfully')

    // Room is gone
    const getDeletedRes = await request(`/api/rooms/${room.id}`, {
      headers: { Authorization: `Bearer ${token1}` },
    })
    assert(getDeletedRes.status === 404, 'Deleted room returned 404 Not Found')

    console.log(`\n========================================`)
    console.log(`All Phase 3 Tests Passed: ${passed} / ${passed + failed}`)
    console.log(`========================================\n`)

    if (failed > 0) {
      process.exit(1)
    }
  } catch (error) {
    console.error('Fatal error during test run:', error)
    process.exit(1)
  }
}

runTests()
