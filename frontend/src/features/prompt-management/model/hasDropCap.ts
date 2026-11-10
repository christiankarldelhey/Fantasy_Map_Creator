// A drop cap spans about two lines: a shorter first paragraph would let it
// overflow into the next one and leave a gap before its first line.
const MIN_DROP_CAP_CHARS = 160

export function hasDropCap(paragraph: string): boolean {
  return paragraph.trim().length >= MIN_DROP_CAP_CHARS
}
