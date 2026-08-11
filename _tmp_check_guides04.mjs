import { PART_04 } from './src/data/_en-parts/guides-04.ts'

const EXPECTED_IDS = [
  'burying-beetle', 'tortoise-beetle', 'hercules-beetle', 'whirligig-beetle',
  'ground-beetle', 'blister-beetle', 'hister-beetle', 'treehopper',
  'ichneumon-wasp', 'dobsonfly',
]

const BOUNDS = {
  lessonTitle: [10, 48],
  lessonBody: [80, 210],
  motionTitle: [10, 48],
  motionBody: [100, 230],
  habitatTitle: [10, 48],
  habitatBody: [100, 230],
  quizQuestion: [15, 190],
  quizOption: [1, 140],
  quizExplain: [50, 150],
}

let problems = []

const ids = Object.keys(PART_04)
if (ids.length !== 10) problems.push(`Expected 10 keys, got ${ids.length}`)
for (const id of EXPECTED_IDS) {
  if (!ids.includes(id)) problems.push(`Missing id: ${id}`)
}
for (const id of ids) {
  if (!EXPECTED_IDS.includes(id)) problems.push(`Unexpected id: ${id}`)
}

function check(id, label, str, bound) {
  const len = str.length
  const [min, max] = bound
  if (len < min || len > max) {
    problems.push(`${id} ${label}: length ${len} out of [${min},${max}] -> "${str}"`)
  }
}

for (const id of ids) {
  const g = PART_04[id]
  // lesson
  if (g.lesson.length < 3 || g.lesson.length > 4) problems.push(`${id}: lesson steps ${g.lesson.length} not in 3-4`)
  const titles = g.lesson.map(s => s.title)
  if (new Set(titles).size !== titles.length) problems.push(`${id}: duplicate lesson titles ${JSON.stringify(titles)}`)
  const anchorCount = g.lesson.filter(s => s.anchor).length
  if (anchorCount < 2) problems.push(`${id}: only ${anchorCount} lesson steps with anchor`)
  g.lesson.forEach((s, i) => {
    check(id, `lesson[${i}].title`, s.title, BOUNDS.lessonTitle)
    check(id, `lesson[${i}].body`, s.body, BOUNDS.lessonBody)
  })

  check(id, 'motion.title', g.motion.title, BOUNDS.motionTitle)
  check(id, 'motion.body', g.motion.body, BOUNDS.motionBody)

  check(id, 'habitat.title', g.habitat.title, BOUNDS.habitatTitle)
  check(id, 'habitat.body', g.habitat.body, BOUNDS.habitatBody)

  if (g.quiz.length !== 2) problems.push(`${id}: quiz length ${g.quiz.length} != 2`)
  g.quiz.forEach((q, i) => {
    check(id, `quiz[${i}].question`, q.question, BOUNDS.quizQuestion)
    if (q.options.length !== 3) problems.push(`${id} quiz[${i}]: options length ${q.options.length} != 3`)
    const optSet = new Set(q.options)
    if (optSet.size !== q.options.length) problems.push(`${id} quiz[${i}]: duplicate options`)
    q.options.forEach((o, j) => check(id, `quiz[${i}].options[${j}]`, o, BOUNDS.quizOption))
    check(id, `quiz[${i}].explain`, q.explain, BOUNDS.quizExplain)
    if (typeof q.answer !== 'number' || q.answer < 0 || q.answer > 2) {
      problems.push(`${id} quiz[${i}]: bad answer index ${q.answer}`)
    }
  })
}

if (problems.length === 0) {
  console.log('ALL CHECKS PASSED')
} else {
  console.log(`${problems.length} PROBLEMS:`)
  for (const p of problems) console.log(' - ' + p)
}
