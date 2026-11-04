async function test() {
  console.log('Sending execution request to ce.judge0.com...')
  const res = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language_id: 71,
      source_code: 'print("REAL CLOUD JUDGE0 EXECUTED SUCCESSFULLY")'
    })
  })
  console.log('Status:', res.status)
  const data = await res.json()
  console.log('Data:', data)
}
test().catch(console.error)

