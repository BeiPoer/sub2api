const GPT_IMAGE_STANDARD_SIZES = new Set(['1024x1024', '1536x1024', '1024x1536'])
const GPT_IMAGE_2_MIN_PIXELS = 655360
const GPT_IMAGE_2_MAX_PIXELS = 8294400
const GPT_IMAGE_2_MAX_EDGE = 3840

function isGPTImage2Model(model: string): boolean {
  const id = model.trim().toLowerCase()
  return id === 'gpt-image-2' || id.startsWith('gpt-image-2-')
}

function parseImageSize(size: string): { width: number; height: number } | null {
  const match = size.trim().toLowerCase().match(/^(\d+)x(\d+)$/)
  if (!match) return null
  return {
    width: Number(match[1]),
    height: Number(match[2])
  }
}

export function validateOpenAIImageSize(size: string, model: string): string {
  const normalized = size.trim().toLowerCase()
  if (normalized === 'auto') return ''

  const parsed = parseImageSize(normalized)
  if (!parsed || parsed.width <= 0 || parsed.height <= 0) {
    return '请输入有效尺寸，例如 1024x1024'
  }

  if (!isGPTImage2Model(model)) {
    return GPT_IMAGE_STANDARD_SIZES.has(normalized)
      ? ''
      : '当前 OpenAI 模型仅支持 1024x1024、1536x1024、1024x1536 或 auto'
  }

  const { width, height } = parsed
  if (width > GPT_IMAGE_2_MAX_EDGE || height > GPT_IMAGE_2_MAX_EDGE) {
    return 'OpenAI 尺寸单边不能超过 3840px'
  }
  if (width % 16 !== 0 || height % 16 !== 0) {
    return 'OpenAI 自定义尺寸宽高都必须是 16 的倍数'
  }

  const longEdge = Math.max(width, height)
  const shortEdge = Math.min(width, height)
  if (longEdge > shortEdge * 3) {
    return 'OpenAI 尺寸长边和短边比例不能超过 3:1'
  }

  const pixels = width * height
  if (pixels < GPT_IMAGE_2_MIN_PIXELS || pixels > GPT_IMAGE_2_MAX_PIXELS) {
    return 'OpenAI 尺寸总像素需在 655,360 到 8,294,400 之间'
  }

  return ''
}
