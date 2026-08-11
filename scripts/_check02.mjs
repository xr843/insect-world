import { readFileSync } from 'node:fs'

const { en, zh } = JSON.parse(readFileSync(process.argv[2], 'utf8'))

function numbers(s) {
  return s.match(/\d+(?:[.,]\d+)*(?:\s*[–—-]\s*\d+(?:[.,]\d+)*)?/g) ?? []
}

let problems = []

if (en.length !== 10) problems.push(`expected 10 records, got ${en.length}`)

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

  const eIcons = e.facts.map(f => f.icon)
  const zIcons = z.facts.map(f => f.icon)
  if (JSON.stringify(eIcons) !== JSON.stringify(zIcons)) problems.push(`${prefix} facts icon sequence mismatch: ${eIcons} vs ${zIcons}`)

  const eIds = e.hotspots.map(h => h.id)
  const zIds = z.hotspots.map(h => h.id)
  if (JSON.stringify(eIds) !== JSON.stringify(zIds)) problems.push(`${prefix} hotspot id sequence mismatch`)
  const eAnchors = e.hotspots.map(h => h.anchor)
  const zAnchors = z.hotspots.map(h => h.anchor)
  if (JSON.stringify(eAnchors) !== JSON.stringify(zAnchors)) problems.push(`${prefix} hotspot anchor sequence mismatch`)
  const eTones = e.hotspots.map(h => h.tone)
  const zTones = z.hotspots.map(h => h.tone)
  if (JSON.stringify(eTones) !== JSON.stringify(zTones)) problems.push(`${prefix} hotspot tone sequence mismatch`)

  z.facts.forEach((f, i) => {
    const nums = numbers(f.value)
    nums.forEach(n => {
      if (!e.facts[i].value.includes(n)) problems.push(`${prefix} facts[${i}] missing number "${n}" — en value: "${e.facts[i].value}"`)
    })
  })

  if (e.summary.length < 85 || e.summary.length > 320) problems.push(`${prefix} summary length ${e.summary.length} out of [85,320]`)
  if (e.trivia.length < 50 || e.trivia.length > 210) problems.push(`${prefix} trivia length ${e.trivia.length} out of [50,210]`)
})

console.log('EN count:', en.length)
console.log('Order:', en.map(e => e.id).join(', '))
console.log('\n--- Length report ---')
en.forEach(e => console.log(`${e.id}: summary=${e.summary.length} trivia=${e.trivia.length}`))

if (problems.length) {
  console.log('\n--- PROBLEMS ---')
  problems.forEach(p => console.log('FAIL: ' + p))
  process.exitCode = 1
} else {
  console.log('\nALL CHECKS PASSED')
}
