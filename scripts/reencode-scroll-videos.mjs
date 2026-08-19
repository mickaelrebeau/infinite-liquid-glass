import { spawn } from 'node:child_process'
import { readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const outDir = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../public/videos')
const files = (await readdir(outDir)).filter((file) => file.endsWith('-full.png'))

for (const file of files) {
  const slug = file.replace(/-full\.png$/, '')
  const inputPath = path.join(outDir, file)
  const outputPath = path.join(outDir, `${slug}.mp4`)
  console.log(`Encode ${slug}`)
  await encode(inputPath, outputPath)
}

function encode(inputPath, outputPath) {
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
        '-t',
        '10',
        '-vf',
        vf,
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
      else reject(new Error(`ffmpeg exited ${code} for ${inputPath}`))
    })
  })
}
