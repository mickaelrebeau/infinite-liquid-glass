import { spawn } from 'node:child_process'
import { mkdir, readdir, unlink } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const sourceDir = path.join(root, 'recordings')
const outDir = path.join(root, 'public', 'videos')

const WIDTH = 1280
const HEIGHT = 640

await mkdir(outDir, { recursive: true })

const files = (await readdir(sourceDir))
  .filter((name) => name.toLowerCase().endsWith('.mov'))
  .sort()

if (files.length === 0) {
  throw new Error(`Aucun fichier .mov dans ${sourceDir}`)
}

function run(command, args) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { stdio: 'inherit' })
    child.on('error', reject)
    child.on('close', (code) => {
      if (code === 0) resolve()
      else reject(new Error(`${command} exited with ${code}`))
    })
  })
}

for (const file of files) {
  const slug = path.basename(file, path.extname(file))
  const input = path.join(sourceDir, file)
  const videoPath = path.join(outDir, `${slug}.mp4`)
  const posterPng = path.join(outDir, `${slug}-poster.png`)
  const posterPath = path.join(outDir, `${slug}.webp`)

  console.log(`\n→ ${slug}`)

  await run('ffmpeg', [
    '-y',
    '-i',
    input,
    '-an',
    '-vf',
    `scale=${WIDTH}:${HEIGHT}:flags=lanczos,fps=24`,
    '-c:v',
    'libx264',
    '-profile:v',
    'high',
    '-level',
    '4.1',
    '-pix_fmt',
    'yuv420p',
    '-preset',
    'slow',
    '-crf',
    '28',
    '-movflags',
    '+faststart',
    videoPath,
  ])

  await run('ffmpeg', [
    '-y',
    '-i',
    videoPath,
    '-frames:v',
    '1',
    '-vf',
    `scale=${WIDTH}:${HEIGHT}:flags=lanczos`,
    posterPng,
  ])

  await run('cwebp', ['-quiet', '-q', '80', posterPng, '-o', posterPath])
  await unlink(posterPng)
}

console.log('\nEncodage web terminé.')
