import { PART_02 } from '../src/data/_en-parts/insects-02.ts'
import { INSECTS } from '../src/data/insects.ts'

const ids = ['longhorn-beetle','stick-insect','swallowtail','silk-moth','hornet','tiger-beetle','stag-beetle','jewel-beetle','katydid','mole-cricket']
const zh = ids.map(id => INSECTS.find(i => i.id === id))

console.log(JSON.stringify({ en: PART_02, zh }))
