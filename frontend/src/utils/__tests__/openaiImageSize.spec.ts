import { describe, expect, it } from 'vitest'
import { validateOpenAIImageSize } from '../openaiImageSize'

describe('validateOpenAIImageSize', () => {
  it('allows official sizes for older GPT image models', () => {
    expect(validateOpenAIImageSize('1024x1024', 'gpt-image-1')).toBe('')
    expect(validateOpenAIImageSize('1536x1024', 'gpt-image-1.5')).toBe('')
    expect(validateOpenAIImageSize('1024x1536', 'gpt-image-1-mini')).toBe('')
    expect(validateOpenAIImageSize('auto', 'gpt-image-1')).toBe('')
  })

  it('rejects custom sizes for older GPT image models', () => {
    expect(validateOpenAIImageSize('2048x2048', 'gpt-image-1')).toContain('仅支持')
  })

  it('allows valid custom gpt-image-2 sizes', () => {
    expect(validateOpenAIImageSize('2048x2048', 'gpt-image-2')).toBe('')
    expect(validateOpenAIImageSize('2048x1152', 'gpt-image-2')).toBe('')
    expect(validateOpenAIImageSize('3840x2160', 'gpt-image-2')).toBe('')
    expect(validateOpenAIImageSize('2160x3840', 'gpt-image-2')).toBe('')
  })

  it('rejects invalid gpt-image-2 custom sizes', () => {
    expect(validateOpenAIImageSize('1025x1024', 'gpt-image-2')).toContain('16')
    expect(validateOpenAIImageSize('3841x1024', 'gpt-image-2')).toContain('3840')
    expect(validateOpenAIImageSize('3072x1008', 'gpt-image-2')).toContain('3:1')
    expect(validateOpenAIImageSize('512x512', 'gpt-image-2')).toContain('655,360')
  })
})
