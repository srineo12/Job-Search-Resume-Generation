// Deploy to Vercel production
// Run: npm run deploy
import { readFileSync } from 'fs'

const envFile = readFileSync('.env.local', 'utf8')
const env = Object.fromEntries(
  envFile.split('\n')
    .filter(line => line.includes('=') && !line.startsWith('#'))
    .map(line => { const idx = line.indexOf('='); return [line.slice(0, idx).trim(), line.slice(idx + 1).trim()] })
)

const TOKEN = env.VERCEL_TOKEN
const REPO_ID = parseInt(env.VERCEL_REPO_ID)

if (!TOKEN) { console.error('VERCEL_TOKEN not set in .env.local'); process.exit(1) }

console.log('Triggering deployment...')
const res = await fetch('https://api.vercel.com/v13/deployments', {
  method: 'POST',
  headers: { 'Authorization': `Bearer ${TOKEN}`, 'Content-Type': 'application/json' },
  body: JSON.stringify({
    name: 'job-search-resume-generation',
    gitSource: { type: 'github', repo: 'srineo12/Job-Search-Resume-Generation', ref: 'main', repoId: REPO_ID },
    target: 'production'
  })
})

const data = await res.json()
if (data.error) { console.error('Deploy error:', data.error.message); process.exit(1) }

const deployId = data.id
console.log('Deploy started:', deployId)
console.log('Waiting for build...')

for (let i = 0; i < 30; i++) {
  await new Promise(r => setTimeout(r, 5000))
  const status = await fetch(`https://api.vercel.com/v13/deployments/${deployId}`, {
    headers: { 'Authorization': `Bearer ${TOKEN}` }
  }).then(r => r.json())

  const state = status.readyState
  process.stdout.write(`\r[${i+1}/30] ${state}...    `)
  if (state === 'READY') { console.log('\n✅ Deployed! https://job-search-resume-generation-g9fm1159b.vercel.app'); break }
  if (state === 'ERROR') { console.log('\n❌ Deploy failed'); process.exit(1) }
}
