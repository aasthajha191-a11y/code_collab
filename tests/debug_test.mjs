const email = `dbg_${Date.now()}@example.com`
const password = 'Password123!'

async function debug() {
  const reg = await fetch('http://localhost:4000/auth/register', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password, name: 'Dbg' })
  }).then(r => r.json())
  const token = reg.token

  const room = await fetch('http://localhost:4000/api/rooms', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ name: 'DbgRoom', language: 'python' })
  }).then(r => r.json())
  console.log('Created room:', room.id)

  const exec = await fetch(`http://localhost:4000/api/rooms/${room.id}/execute`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: 'print("Hello from Master Test!")', language: 'python' })
  }).then(r => r.json())
  console.log('Execute output:', exec)

  const snap1 = await fetch(`http://localhost:4000/api/rooms/${room.id}/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: 'print("v1")', language: 'python' })
  }).then(r => r.json())
  console.log('Snapshot 1:', snap1)

  const snapDup = await fetch(`http://localhost:4000/api/rooms/${room.id}/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: 'print("v1")', language: 'python' })
  }).then(r => r.json())
  console.log('Snapshot Dup:', snapDup)

  const snap2 = await fetch(`http://localhost:4000/api/rooms/${room.id}/snapshots`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ code: 'print("v2 updated code")', language: 'python' })
  }).then(r => r.json())
  console.log('Snapshot 2:', snap2)

  const comp = await fetch(`http://localhost:4000/api/rooms/${room.id}/versions/compare?fromId=${snap1.id}&toId=${snap2.id}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
  console.log('Compare status:', comp.status, await comp.text())

  const rest = await fetch(`http://localhost:4000/api/rooms/${room.id}/versions/${snap1.id}/restore`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` }
  })
  console.log('Restore status:', rest.status, await rest.text())
}

debug().catch(console.error)

