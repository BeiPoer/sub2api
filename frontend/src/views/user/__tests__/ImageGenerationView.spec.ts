import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { flushPromises, mount, type VueWrapper } from '@vue/test-utils'
import { nextTick } from 'vue'

import ImageGenerationView from '../ImageGenerationView.vue'

const {
  listKeys,
  getAvailableGroups,
  listModels,
  generateImages,
  fetchPublicSettings,
  showError,
  showSuccess,
  appStore
} = vi.hoisted(() => ({
  listKeys: vi.fn(),
  getAvailableGroups: vi.fn(),
  listModels: vi.fn(),
  generateImages: vi.fn(),
  fetchPublicSettings: vi.fn(),
  showError: vi.fn(),
  showSuccess: vi.fn(),
  appStore: {
    cachedPublicSettings: {} as Record<string, number[]>,
    fetchPublicSettings: vi.fn(),
    showError: vi.fn(),
    showSuccess: vi.fn()
  }
}))

vi.mock('@/api/keys', () => ({ keysAPI: { list: listKeys } }))
vi.mock('@/api/groups', () => ({ userGroupsAPI: { getAvailable: getAvailableGroups } }))
vi.mock('@/api/imageGeneration', () => ({ listModels, generateImages }))
vi.mock('@/stores/app', () => ({ useAppStore: () => appStore }))
vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({ t: (key: string) => key })
  }
})

const AppLayoutStub = { template: '<div><slot /></div>' }

if (!HTMLElement.prototype.scrollIntoView) {
  Object.defineProperty(HTMLElement.prototype, 'scrollIntoView', {
    configurable: true,
    value: vi.fn()
  })
}

let wrapper: VueWrapper | undefined

function normalizedText(button: ReturnType<VueWrapper['findAll']>[number]): string {
  return button.text().replace(/\s+/g, ' ').trim()
}

function buttonByText(view: VueWrapper, text: string) {
  const button = view.findAll('button').find((item) => normalizedText(item) === text)
  expect(button, `找不到按钮：${text}`).toBeDefined()
  return button!
}

async function openSettings(view: VueWrapper) {
  const trigger = view
    .findAll('button')
    .find((button) => normalizedText(button).includes('张'))
  expect(trigger, '找不到设置按钮').toBeDefined()
  await trigger!.trigger('click')
  await nextTick()
}

function ratioLabels(view: VueWrapper): string[] {
  return view
    .findAll('button')
    .map(normalizedText)
    .filter((text) => /^\d+:\d+(?: · [124]K)?$/.test(text))
}

async function mountView(options: {
  groupId: number
  settings: Record<string, number[]>
  model: string
}) {
  appStore.cachedPublicSettings = options.settings
  listKeys.mockResolvedValue({
    items: [
      {
        id: 1,
        key: 'sk-image-test',
        name: 'image-test',
        status: 'active',
        group_id: options.groupId,
        group: { id: options.groupId, name: 'image' }
      }
    ]
  })
  getAvailableGroups.mockResolvedValue([{ id: options.groupId, name: 'image' }])
  listModels.mockResolvedValue([options.model])
  generateImages.mockResolvedValue([{ url: 'https://example.test/image.png' }])

  wrapper = mount(ImageGenerationView, {
    global: {
      stubs: {
        AppLayout: AppLayoutStub,
        'router-link': true,
        Select: true,
        LoadingSpinner: true,
        Icon: true
      }
    }
  })
  await flushPromises()
  await flushPromises()
  return wrapper
}

async function submit(view: VueWrapper) {
  await view.find('textarea').setValue('draw a poster')
  await view.find('button[title="生成"]').trigger('click')
  await flushPromises()
}

describe('ImageGenerationView image mode settings', () => {
  beforeEach(() => {
    localStorage.clear()
    vi.clearAllMocks()
    appStore.cachedPublicSettings = {}
    appStore.fetchPublicSettings = fetchPublicSettings
    appStore.showError = showError
    appStore.showSuccess = showSuccess
    fetchPublicSettings.mockResolvedValue(undefined)
  })

  afterEach(() => {
    wrapper?.unmount()
    wrapper = undefined
  })

  it('shows ratio-only GPT options and sends the mapped size', async () => {
    const view = await mountView({
      groupId: 1,
      settings: { gpt_2k_image_generation_group_ids: [1] },
      model: 'gpt-image-2'
    })
    await openSettings(view)

    expect(view.findAll('input[type="number"]')).toHaveLength(0)
    expect(ratioLabels(view)).toEqual(['1:1', '3:4', '4:3', '9:16', '16:9'])

    await buttonByText(view, '9:16').trigger('click')
    await submit(view)

    expect(generateImages).toHaveBeenCalledOnce()
    expect(generateImages.mock.calls[0][1]).toMatchObject({
      provider: 'openai',
      size: '1152x2048'
    })
  })

  it('shows all GPT 4K presets and applies the selected dimensions', async () => {
    const view = await mountView({
      groupId: 2,
      settings: { gpt_4k_image_generation_group_ids: [2] },
      model: 'gpt-image-2'
    })
    await openSettings(view)

    expect(view.findAll('input[type="number"]')).toHaveLength(2)
    expect(ratioLabels(view)).toEqual([
      '1:1 · 1K',
      '3:4 · 1K',
      '4:3 · 1K',
      '1:1 · 2K',
      '9:16 · 2K',
      '16:9 · 2K',
      '1:1 · 4K',
      '9:16 · 4K',
      '16:9 · 4K'
    ])

    await buttonByText(view, '1:1 · 4K').trigger('click')
    expect(view.findAll('input[type="number"]')[0].element.value).toBe('2880')
    expect(view.findAll('input[type="number"]')[1].element.value).toBe('2880')
  })

  it('sends Banana resolution and aspect ratio without a pixel size', async () => {
    const view = await mountView({
      groupId: 3,
      settings: { gemini_image_generation_group_ids: [3] },
      model: 'gemini-3-pro-image-preview'
    })
    await openSettings(view)

    expect(view.findAll('input[type="number"]')).toHaveLength(0)
    expect(ratioLabels(view)).toEqual(['1:1', '2:3', '3:2', '3:4', '4:3', '9:16', '16:9', '21:9'])
    expect(view.findAll('label').map(normalizedText)).not.toContain('quality')

    await buttonByText(view, '4K').trigger('click')
    await buttonByText(view, '21:9').trigger('click')
    await submit(view)

    expect(generateImages).toHaveBeenCalledOnce()
    expect(generateImages.mock.calls[0][1]).toMatchObject({
      provider: 'gemini',
      size: '',
      aspectRatio: '21:9',
      imageSize: '4K'
    })
    expect(generateImages.mock.calls[0][1]).not.toHaveProperty('quality')
  })

  it('restores Banana ratio and resolution after the key determines the mode', async () => {
    localStorage.setItem(
      'sub2api:image_generation_prefs',
      JSON.stringify({ aspectRatio: '21:9', bananaImageSize: '4K' })
    )
    const view = await mountView({
      groupId: 3,
      settings: { gemini_image_generation_group_ids: [3] },
      model: 'gemini-3-pro-image-preview'
    })
    await openSettings(view)

    expect(buttonByText(view, '21:9').classes()).toContain('border-gray-900')
    expect(buttonByText(view, '4K').classes()).toContain('border-primary-500')
  })
})
