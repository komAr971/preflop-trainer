export function downloadJson(filename: string, data: unknown): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  document.body.appendChild(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

/** Safe file name from a chart name. */
export function fileNameFor(name: string): string {
  const base = name.trim().replace(/[\\/:*?"<>|]+/g, '_').replace(/\s+/g, ' ')
  return `${base || 'chart'}.json`
}

/** Reads a File/Blob as text (FileReader works in every browser and in jsdom). */
export function readText(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(String(reader.result))
    reader.onerror = () => reject(reader.error)
    reader.readAsText(blob)
  })
}
