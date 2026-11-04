async function testAll() {
  console.log('Testing Judge0 Python, JavaScript, and Java on ce.judge0.com...')

  // 1. Python (71)
  const py = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language_id: 71,
      source_code: 'import sys\nprint(f"Python version: {sys.version.split()[0]}")\nfor i in range(3): print("Number", i)'
    })
  }).then(r => r.json())
  console.log('Python output:\n', py.stdout)

  // 2. JavaScript (63 - Node.js)
  const js = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language_id: 63,
      source_code: 'console.log("Node version:", process.version);\nconst arr = [10, 20, 30];\nconsole.log("Sum:", arr.reduce((a, b) => a + b, 0));'
    })
  }).then(r => r.json())
  console.log('JavaScript output:\n', js.stdout)

  // 3. Java (62 - OpenJDK)
  const java = await fetch('https://ce.judge0.com/submissions?base64_encoded=false&wait=true', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      language_id: 62,
      source_code: 'public class Main {\n    public static void main(String[] args) {\n        System.out.println("Hello from Real Java Execution in Judge0!");\n    }\n}'
    })
  }).then(r => r.json())
  console.log('Java output:\n', java.stdout)
}

testAll().catch(console.error)

