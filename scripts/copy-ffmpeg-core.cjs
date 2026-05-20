const fs = require('fs')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

const COPY_MAP = [
  {
    src: path.join(ROOT, 'node_modules', '@ffmpeg', 'core-mt', 'dist', 'esm'),
    dest: path.join(ROOT, 'public', 'ffmpeg-core'),
    label: '@ffmpeg/core-mt',
  },
  {
    src: path.join(ROOT, 'node_modules', '@ffmpeg', 'core', 'dist', 'esm'),
    dest: path.join(ROOT, 'public', 'ffmpeg-core-st'),
    label: '@ffmpeg/core',
  },
]

for (const { src, dest, label } of COPY_MAP) {
  if (!fs.existsSync(src)) {
    console.warn(`[copy-ffmpeg-core] Source not found: ${src} (${label}). Skipping.`)
    continue
  }

  if (!fs.existsSync(dest)) {
    fs.mkdirSync(dest, { recursive: true })
  }

  const files = fs.readdirSync(src)
  for (const file of files) {
    const srcFile = path.join(src, file)
    const destFile = path.join(dest, file)
    const stat = fs.statSync(srcFile)
    if (stat.isFile()) {
      fs.copyFileSync(srcFile, destFile)
    }
  }

  console.log(`[copy-ffmpeg-core] Copied ${files.length} files for ${label} -> ${dest}`)
}
