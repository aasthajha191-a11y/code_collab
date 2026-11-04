async function run() {
  const schema = await fetch('https://render.com/schema/render.yaml.json').then(r => r.json())
  const serviceDefs = schema.definitions || schema['$defs'] || {}
  for (const [k, v] of Object.entries(serviceDefs)) {
    if (k.toLowerCase().includes('web') || k.toLowerCase().includes('static') || k.toLowerCase().includes('service')) {
      console.log('Def:', k, 'Properties:', Object.keys(v.properties || {}))
    }
  }
}
run().catch(console.error)

