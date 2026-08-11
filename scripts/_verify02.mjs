import { readFileSync } from 'node:fs'
import { execSync } from 'node:child_process'

// Use vite-node to import the TS file directly
const out = execSync('npx vite-node -e "import(\'/home/lqsxi/projects/insect-world/src/data/_en-parts/insects-02.ts\').then(m=>console.log(JSON.stringify(m.PART_02)))"', { cwd: '/home/lqsxi/projects/insect-world', maxBuffer: 10 * 1024 * 1024 }).toString()
const jsonLine = out.trim().split('\n').pop()
const en = JSON.parse(jsonLine)

const zhSrc = readFileSync('/home/lqsxi/projects/insect-world/src/data/insects.ts', 'utf8')
const ids = ['longhorn-beetle','stick-insect','swallowtail','silk-moth','hornet','tiger-beetle','stag-beetle','jewel-beetle','katydid','mole-cricket']

// crude extraction of zh records by id using vite-node too
const zhOut = execSync(`npx vite-node -e "import('/home/lqsxi/projects/insect-world/src/data/insects.ts').then(m=>{const ids=${JSON.stringify(ids)}; const rows = ids.map(id=>m.INSECTS.find(i=>i.id===id)); console.log(JSON.stringify(rows))})"`, { cwd: '/home/lqsxi/projects/insect-world', maxBuffer: 10*1024*1024 }).toString()
const zhJsonLine = zhOut.trim().split('\n').pop()
const zh = JSON.parse(zhJsonLine)

function numbers(s) {
  return s.match(/\d+(?:[.,]\d+)*(?:\s*[–—-]\s*\d+(?:[.,]\d+)*)?/g) ?? []
}

let problems = []

if (en.length !== 10) problems.push(`expected 10 records, got ${en.length}`)
if (zh.length !== 10) problems.push(`zh lookup failed, got ${zh.length}`)

en.forEach((e, idx) => {
  const z = zh[idx]
  if (!z) { problems.push(`no zh match for idx ${idx} id ${e.id}`); return }
  const prefix = `[${e.id}]`
  if (e.id !== z.id) problems.push(`${prefix} id mismatch`)
  if (e.latin !== z.latin) problems.push(`${prefix} latin mismatch: ${e.latin} vs ${z.latin}`)
  if (e.order !== z.order) problems.push(`${prefix} order mismatch`)
  if (e.metamorphosis !== z.metamorphosis) problems.push(`${prefix} metamorphosis mismatch`)
  if (e.accent !== z.accent) problems.push(`${prefix} accent mismatch`)
  if (e.facts.length !== 6) problems.push(`${prefix} facts length != 6 (${e.facts.length})`)
  if (e.hotspots.length < 5 || e.hotspots.length > 6) problems.push(`${prefix} hotspots length out of range (${e.hotspots.length})`)
  if (e.relatives.length !== 3) problems.push(`${prefix} relatives length != 3 (${e.relatives.length})`)
  if (e.lifecycle.length < 3 || e.lifecycle.length > 4) problems.push(`${prefix} lifecycle length out of range (${e.lifecycle.length})`)
  if (e.lifecycle.length !== z.lifecycle.length) problems.push(`${prefix} lifecycle length mismatch en=${e.lifecycle.length} zh=${z.lifecycle.length}`)
  if (e.relatives.length !== z.relatives.length) problems.push(`${prefix} relatives length mismatch`)

  // facts icon sequence
  const eIcons = e.facts.map(f => f.icon)
  const zIcons = z.facts.map(f => f.icon)
  if (JSON.stringify(eIcons) !== JSON.stringify(zIcons)) problems.push(`${prefix} facts icon sequence mismatch: ${eIcons} vs ${zIcons}`)

  // hotspots id/anchor/tone sequence
  const eIds = e.hotspots.map(h => h.id)
  const zIds = z.hotspots.map(h => h.id)
  if (JSON.stringify(eIds) !== JSON.stringify(zIds)) problems.push(`${prefix} hotspot id sequence mismatch`)
  const eAnchors = e.hotspots.map(h => h.anchor)
  const zAnchors = z.hotspots.map(h => h.anchor)
  if (JSON.stringify(eAnchors) !== JSON.stringify(zAnchors)) problems.push(`${prefix} hotspot anchor sequence mismatch`)
  const eTones = e.hotspots.map(h => h.tone)
  const zTones = z.hotspots.map(h => h.tone)
  if (JSON.stringify(eTones) !== JSON.stringify(zTones)) problems.push(`${prefix} hotspot tone sequence mismatch`)

  // facts icon literal exact match already checked above; also verify facts[].icon exact copy of zh (already same as icon seq)

  // number fidelity in facts values
  z.facts.forEach((f, i) => {
    const nums = numbers(f.value)
    nums.forEach(n => {
      if (!e.facts[i].value.includes(n)) problems.push(`${prefix} facts[${i}] missing number "${n}" — en value: "${e.facts[i].value}"`)
    })
  })

  // length checks
  if (e.summary.length < 85 || e.summary.length > 320) problems.push(`${prefix} summary length ${e.summary.length} out of [85,320]`)
  if (e.trivia.length < 50 || e.trivia.length > 210) problems.push(`${prefix} trivia length ${e.trivia.length} out of [50,210]`)
})

console.log('EN count:', en.length)
console.log('Order (should match batch spec):', en.map(e => e.id).join(', '))
console.log('\n--- Length report ---')
en.forEach(e => console.log(`${e.id}: summary=${e.summary.length} trivia=${e.trivia.length}`))

if (problems.length) {
  console.log('\n--- PROBLEMS ---')
  problems.forEach(p => console.log('FAIL: ' + p))
  process.exitCode = 1
} else {
  console.log('\nALL CHECKS PASSED')
}
