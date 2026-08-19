import { chromium } from 'playwright'
import { spawn } from 'node:child_process'
import { mkdir, writeFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const outDir = path.join(root, 'public', 'videos')

const sites = [
  { slug: 'own', url: 'https://www.own-minimalist.fr/' },
  { slug: 'mercato', url: 'https://www.mercatocopilot.fr/' },
  { slug: 'tv-track', url: 'https://www.tv-track.com/' },
  { slug: 'talento', url: 'https://cv-compare.up.railway.app/' },
  { slug: 'godot', url: 'https://mickaelrebeau.github.io/GODOT/firstgame/index.html' },
  { slug: 'focus', url: 'https://github.com/mickaelrebeau/Focus' },
  { slug: 'portfolio', url: 'https://www.rebeaumickael.fr/' },
]

const COOKIE_SELECTORS = [
  'button:has-text("Accepter")',
  'button:has-text("Accept")',
  'button:has-text("I agree")',
  'button:has-text("Tout accepter")',
  '#didomi-notice-agree-button',
  '.cky-btn-accept',
  '[data-testid="cookie-accept"]',
]

await mkdir(outDir, { recursive: true })

const browser = await chromium.launch({ headless: true })

for (const site of sites) {
  const shotPath = path.join(outDir, `${site.slug}-full.png`)
  const posterPath = path.join(outDir, `${site.slug}.jpg`)
  const videoPath = path.join(outDir, `${site.slug}.mp4`)
  const page = await browser.newPage({
    viewport: { width: 1280, height: 960 },
    deviceScaleFactor: 1,
  })

  console.log(`Capture ${site.slug} → ${site.url}`)

  try {
    await page.goto(site.url, { waitUntil: 'domcontentloaded', timeout: 45000 })
    await page.waitForTimeout(1800)
    await dismissCookies(page)
    await page.waitForTimeout(600)
    await page.screenshot({ path: posterPath, type: 'jpeg', quality: 82 })
    await page.screenshot({ path: shotPath, fullPage: true })
    await encodeScrollVideo(shotPath, videoPath)
    console.log(`OK ${site.slug}`)
  } catch (error) {
    console.error(`FAIL ${site.slug}`, error.message)
    await writeFallbackPoster(posterPath, site.slug, site.url)
    await encodeScrollVideo(posterPath, videoPath).catch(() => {})
  } finally {
    await page.close()
  }
}

await browser.close()
console.log('Videos ready in public/videos')

async function dismissCookies(page) {
  for (const selector of COOKIE_SELECTORS) {
    const button = page.locator(selector).first()
    if (await button.count()) {
      await button.click({ timeout: 1500 }).catch(() => {})
    }
  }
  await page.keyboard.press('Escape').catch(() => {})
}

function encodeScrollVideo(inputPath, outputPath) {
  const vf =
    "scale=960:-2,pad=960:max(720\\,ih):(ow-iw)/2:0,fps=24,crop=960:720:0:'min((ih-720)*t/10,max(ih-720,0))'"

  return new Promise((resolve, reject) => {
    const ffmpeg = spawn(
      'ffmpeg',
      [
        '-y',
        '-loop',
        '1',
        '-i',
        inputPath,
        '-vf',
        vf,
        '-t',
        '10',
        '-an',
        '-c:v',
        'libx264',
        '-pix_fmt',
        'yuv420p',
        '-movflags',
        '+faststart',
        '-crf',
        '23',
        outputPath,
      ],
      { stdio: 'inherit' },
    )

    ffmpeg.on('exit', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`ffmpeg exited ${code}`))
    })
  })
}

async function writeFallbackPoster(filePath, title, url) {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="960" height="720">
    <rect width="100%" height="100%" fill="#0b1020"/>
    <text x="80" y="360" fill="white" font-size="48" font-family="Inter, sans-serif">${title}</text>
    <text x="80" y="420" fill="#9aa4bf" font-size="22" font-family="Inter, sans-serif">${url}</text>
  </svg>`
  await writeFile(filePath.replace(/\.jpg$/, '.svg'), svg)
}
