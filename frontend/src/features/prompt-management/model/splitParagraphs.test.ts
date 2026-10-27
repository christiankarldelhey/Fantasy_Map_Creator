import { describe, expect, it } from 'vitest'
import { splitParagraphs } from './splitParagraphs'

describe('splitParagraphs', () => {
  it('splits on blank lines', () => {
    expect(splitParagraphs('Uno.\n\nDos.\n\n\nTres.')).toEqual(['Uno.', 'Dos.', 'Tres.'])
  })

  it('keeps single line breaks inside a paragraph', () => {
    expect(splitParagraphs('Verso uno\nverso dos\n\nOtro.')).toEqual(['Verso uno\nverso dos', 'Otro.'])
  })

  it('trims whitespace and drops empty paragraphs', () => {
    expect(splitParagraphs('  \n\n  Hola  \n\n   \n')).toEqual(['Hola'])
  })

  it('returns an empty list for empty input', () => {
    expect(splitParagraphs('')).toEqual([])
    expect(splitParagraphs(null)).toEqual([])
  })
})
