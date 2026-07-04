/**
 * Image Generation gateway endpoints.
 * Calls this site's own gateway using one of the user's gateway API keys
 * (NOT the panel JWT), so it bypasses apiClient.
 */

import { buildGatewayUrl } from './url'

export type ImageGenerationProvider = 'openai' | 'gemini'

export interface GeneratedImage {
  b64_json?: string
  url?: string
  revised_prompt?: string
  mime_type?: string
}

export interface ImageGenerationReference {
  file?: File
  url?: string
}

export interface GatewayModel {
  id?: string
  name?: string
  display_name?: string
}

export interface GenerateImagesParams {
  prompt: string
  model: string
  n: number
  provider?: ImageGenerationProvider
  /** e.g. '1024x1024'; 'auto' or empty means let the upstream decide */
  size?: string
  /** Gemini imageConfig.aspectRatio, e.g. '1:1' or '16:9' */
  aspectRatio?: string
  /** Gemini imageConfig.imageSize, e.g. '2K' or '4K' */
  imageSize?: string
  /** auto | low | medium | high */
  quality?: string
  /** When present the request goes to /v1/images/edits (image-to-image) */
  referenceImages?: ImageGenerationReference[]
}

export class ImageGenerationError extends Error {
  status: number
  type?: string

  constructor(status: number, message: string, type?: string) {
    super(message)
    this.name = 'ImageGenerationError'
    this.status = status
    this.type = type
  }
}

interface GatewayErrorBody {
  error?: { type?: string; message?: string; status?: string; code?: number }
  message?: string
}

interface GatewayModelsResponse {
  data?: Array<GatewayModel | string>
  models?: Array<GatewayModel | string>
}

interface GatewayResponseBody {
  text: string
  parsed: unknown
}

interface GeminiInlineData {
  data?: string
  mimeType?: string
  mime_type?: string
}

interface GeminiFileData {
  fileUri?: string
  file_uri?: string
  mimeType?: string
  mime_type?: string
}

interface GeminiPart {
  text?: string
  inlineData?: GeminiInlineData
  inline_data?: GeminiInlineData
  fileData?: GeminiFileData
  file_data?: GeminiFileData
}

interface GeminiContent {
  parts?: GeminiPart[]
}

interface GeminiCandidate {
  content?: GeminiContent
}

interface GeminiGenerateContentResponse {
  candidates?: GeminiCandidate[]
  response?: GeminiGenerateContentResponse
  data?: GeneratedImage[]
}

function fileToDataURL(file: File, signal?: AbortSignal): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const cleanup = () => signal?.removeEventListener('abort', abort)
    const abort = () => {
      reader.abort()
      cleanup()
      reject(new DOMException('Aborted', 'AbortError'))
    }
    if (signal?.aborted) {
      abort()
      return
    }
    signal?.addEventListener('abort', abort, { once: true })
    reader.onerror = () => {
      cleanup()
      reject(reader.error ?? new Error('Failed to read reference image'))
    }
    reader.onload = () => {
      cleanup()
      if (typeof reader.result === 'string') {
        resolve(reader.result)
      } else {
        reject(new Error('Failed to read reference image'))
      }
    }
    reader.readAsDataURL(file)
  })
}

function dataURLToInlineData(
  dataURL: string,
  fallbackMimeType = 'image/png'
): GeminiInlineData | null {
  if (!dataURL.startsWith('data:')) return null
  const commaIndex = dataURL.indexOf(',')
  if (commaIndex === -1) return null
  const metadata = dataURL.slice(5, commaIndex)
  if (!metadata.toLowerCase().includes(';base64')) return null
  return {
    mimeType: metadata.split(';')[0] || fallbackMimeType,
    data: dataURL.slice(commaIndex + 1)
  }
}

async function readGatewayResponse(response: Response): Promise<GatewayResponseBody> {
  const text = await response.text()
  let parsed: unknown = null
  try {
    parsed = text ? JSON.parse(text) : null
  } catch {
    // non-JSON body, keep raw text for the error message below
  }
  return { text, parsed }
}

function gatewayErrorMessage(response: Response, body: GatewayResponseBody): string {
  const errBody = (body.parsed ?? {}) as GatewayErrorBody
  return (
    errBody.error?.message ||
    errBody.message ||
    body.text.slice(0, 300) ||
    `HTTP ${response.status}`
  )
}

function shouldRetryGeminiWithoutResponseFormat(message: string): boolean {
  const normalized = message.toLowerCase()
  return normalized.includes('response_format') || normalized.includes('response format')
}

function extractModelID(entry: GatewayModel | string): string | null {
  if (typeof entry === 'string') return entry.trim() || null
  return (entry.id || entry.name || '').trim() || null
}

function normalizeModelID(modelID: string): string {
  return modelID.trim().replace(/^models\//, '')
}

function dedupeModelIDs(modelIDs: string[]): string[] {
  const seen = new Set<string>()
  const result: string[] = []
  for (const id of modelIDs) {
    const normalized = normalizeModelID(id)
    if (!normalized || seen.has(normalized)) continue
    seen.add(normalized)
    result.push(normalized)
  }
  return result
}

/**
 * List models visible to a gateway API key. The backend applies the key's
 * group/platform/model_mapping/custom-list rules.
 */
export async function listModels(
  apiKey: string,
  signal?: AbortSignal
): Promise<string[]> {
  const response = await fetch(buildGatewayUrl('/v1/models'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${apiKey}` },
    signal
  })

  const bodyText = await readGatewayResponse(response)

  if (!response.ok) {
    const errBody = (bodyText.parsed ?? {}) as GatewayErrorBody
    const message = gatewayErrorMessage(response, bodyText)
    throw new ImageGenerationError(response.status, message, errBody.error?.type)
  }

  const body = (bodyText.parsed ?? {}) as GatewayModelsResponse
  const entries = Array.isArray(body.data)
    ? body.data
    : Array.isArray(body.models)
      ? body.models
      : Array.isArray(bodyText.parsed)
        ? (bodyText.parsed as Array<GatewayModel | string>)
        : []
  return dedupeModelIDs(entries.map(extractModelID).filter((id): id is string => Boolean(id)))
}

async function buildGeminiParts(
  prompt: string,
  referenceImages: ImageGenerationReference[],
  signal?: AbortSignal
): Promise<GeminiPart[]> {
  const parts: GeminiPart[] = [{ text: prompt }]

  for (const ref of referenceImages) {
    if (ref.file instanceof File) {
      const dataURL = await fileToDataURL(ref.file, signal)
      const inlineData = dataURLToInlineData(dataURL, ref.file.type || 'image/png')
      if (inlineData) parts.push({ inlineData })
      continue
    }

    const url = ref.url?.trim()
    if (!url) continue
    const inlineData = dataURLToInlineData(url)
    if (inlineData) {
      parts.push({ inlineData })
    } else {
      parts.push({ fileData: { fileUri: url } })
    }
  }

  return parts
}

function extractGeminiImages(parsed: unknown): GeneratedImage[] {
  const body = parsed as GeminiGenerateContentResponse | null
  if (Array.isArray(body?.data) && body.data.length > 0) return body.data

  const responseBody = body?.response ?? body
  const candidates = responseBody?.candidates ?? []
  const images: GeneratedImage[] = []

  for (const candidate of candidates) {
    const parts = candidate.content?.parts ?? []
    const revisedPrompt = parts.find((part) => typeof part.text === 'string')?.text

    for (const part of parts) {
      const fileData = part.fileData ?? part.file_data
      const fileUri = fileData?.fileUri ?? fileData?.file_uri
      if (fileUri) {
        images.push({
          url: fileUri,
          revised_prompt: revisedPrompt
        })
        continue
      }

      const inlineData = part.inlineData ?? part.inline_data
      if (inlineData?.data) {
        images.push({
          b64_json: inlineData.data,
          mime_type: inlineData.mimeType ?? inlineData.mime_type ?? 'image/png',
          revised_prompt: revisedPrompt
        })
      }
    }
  }

  return images
}

async function requestGeminiImages(
  apiKey: string,
  params: GenerateImagesParams,
  signal?: AbortSignal
): Promise<GeneratedImage[]> {
  const model = normalizeModelID(params.model)
  const referenceImages = params.referenceImages ?? []
  const imageConfig: Record<string, string> = {}
  if (params.aspectRatio && params.aspectRatio !== 'auto') {
    imageConfig.aspectRatio = params.aspectRatio
  }
  if (params.imageSize) {
    imageConfig.imageSize = params.imageSize
  }

  const endpoint = buildGatewayUrl(`/v1beta/models/${encodeURIComponent(model)}:generateContent`)
  const parts = await buildGeminiParts(params.prompt, referenceImages, signal)
  const buildBody = (includeResponseFormat: boolean) =>
    JSON.stringify({
      contents: [
        {
          role: 'user',
          parts
        }
      ],
      generationConfig: {
        responseModalities: ['IMAGE'],
        ...(Object.keys(imageConfig).length > 0 ? { imageConfig } : {})
      },
      ...(includeResponseFormat ? { response_format: 'url' } : {})
    })
  const requestInit = (includeResponseFormat: boolean): RequestInit => ({
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    body: buildBody(includeResponseFormat),
    signal
  })

  let response = await fetch(endpoint, requestInit(true))
  let body = await readGatewayResponse(response)
  if (!response.ok) {
    const message = gatewayErrorMessage(response, body)
    if (shouldRetryGeminiWithoutResponseFormat(message)) {
      response = await fetch(endpoint, requestInit(false))
      body = await readGatewayResponse(response)
    }
    if (!response.ok) {
      const errBody = (body.parsed ?? {}) as GatewayErrorBody
      throw new ImageGenerationError(
        response.status,
        gatewayErrorMessage(response, body),
        errBody.error?.type
      )
    }
  }

  const images = extractGeminiImages(body.parsed)
  if (images.length === 0) {
    throw new ImageGenerationError(response.status, 'Empty response from Gemini image gateway')
  }
  return images
}

async function generateGeminiImages(
  apiKey: string,
  params: GenerateImagesParams,
  signal?: AbortSignal
): Promise<GeneratedImage[]> {
  const requested = Math.max(1, Math.min(10, Math.round(params.n || 1)))
  const images: GeneratedImage[] = []

  for (let index = 0; index < requested; index += 1) {
    if (signal?.aborted) throw new DOMException('Aborted', 'AbortError')
    images.push(...(await requestGeminiImages(apiKey, params, signal)))
    if (images.length >= requested) break
  }

  return images.slice(0, requested)
}

/**
 * Generate (or edit, when reference images are provided) images through the
 * site gateway. The request is synchronous and can take several minutes, so
 * no timeout is applied. Pass an AbortSignal to cancel.
 */
export async function generateImages(
  apiKey: string,
  params: GenerateImagesParams,
  signal?: AbortSignal
): Promise<GeneratedImage[]> {
  if (params.provider === 'gemini') {
    return generateGeminiImages(apiKey, params, signal)
  }

  const referenceImages = params.referenceImages ?? []
  const fileReferences = referenceImages
    .map((ref) => ref.file)
    .filter((file): file is File => file instanceof File)
  const urlReferences = referenceImages
    .map((ref) => ref.url?.trim())
    .filter((url): url is string => Boolean(url))
  const isEdit = fileReferences.length > 0 || urlReferences.length > 0
  const endpoint = isEdit ? '/v1/images/edits' : '/v1/images/generations'
  const headers: Record<string, string> = { Authorization: `Bearer ${apiKey}` }
  let body: BodyInit

  const size = params.size && params.size !== 'auto' ? params.size : undefined
  const quality = params.quality || undefined

  if (isEdit) {
    if (urlReferences.length > 0) {
      const localImageURLs = await Promise.all(
        fileReferences.map((file) => fileToDataURL(file, signal))
      )
      headers['Content-Type'] = 'application/json'
      body = JSON.stringify({
        prompt: params.prompt,
        model: params.model,
        n: params.n,
        images: [...urlReferences, ...localImageURLs].map((url) => ({ image_url: url })),
        ...(size ? { size } : {}),
        ...(quality ? { quality } : {}),
        response_format: 'url'
      })
    } else {
      const form = new FormData()
      for (const file of fileReferences) {
        form.append('image', file)
      }
      form.append('prompt', params.prompt)
      form.append('model', params.model)
      form.append('n', String(params.n))
      if (size) form.append('size', size)
      if (quality) form.append('quality', quality)
      form.append('response_format', 'url')
      body = form
    }
  } else {
    headers['Content-Type'] = 'application/json'
    body = JSON.stringify({
      prompt: params.prompt,
      model: params.model,
      n: params.n,
      ...(size ? { size } : {}),
      ...(quality ? { quality } : {}),
      response_format: 'url'
    })
  }

  const response = await fetch(buildGatewayUrl(endpoint), {
    method: 'POST',
    headers,
    body,
    signal
  })

  const bodyText = await readGatewayResponse(response)

  if (!response.ok) {
    const errBody = (bodyText.parsed ?? {}) as GatewayErrorBody
    const message = gatewayErrorMessage(response, bodyText)
    throw new ImageGenerationError(response.status, message, errBody.error?.type)
  }

  const data = (bodyText.parsed as { data?: GeneratedImage[] } | null)?.data
  if (!Array.isArray(data) || data.length === 0) {
    throw new ImageGenerationError(response.status, 'Empty response from image gateway')
  }
  return data
}

export const imageGenerationAPI = {
  listModels,
  generateImages
}

export default imageGenerationAPI
