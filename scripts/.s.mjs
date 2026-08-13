import { chromium } from 'playwright'
const b = await chromium.launch({ args:['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'] })
const p = await b.newPage({ viewport:{width:900,height:760} })
await p.goto('http://localhost:4179/preview.html',{waitUntil:'load'})
await p.waitForSelector('canvas',{timeout:60000}); await p.waitForTimeout(3000)
for (const n of process.argv.slice(2)) {
  await p.evaluate((x)=>{[...document.querySelectorAll('div > button')].find(y=>y.textContent.trim()===x)?.click()}, n)
  await p.waitForTimeout(4500)
  await p.screenshot({path:`/tmp/audit-shots/now-${n}.png`,clip:{x:210,y:0,width:690,height:760}})
  console.log('✓',n)
}
await b.close()
