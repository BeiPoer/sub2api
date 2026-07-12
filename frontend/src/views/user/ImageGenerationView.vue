<template>
  <AppLayout>
    <!-- Loading keys -->
    <div v-if="keysLoading" class="flex items-center justify-center py-20">
      <LoadingSpinner />
    </div>

    <!-- No eligible API keys -->
    <div v-else-if="eligibleKeys.length === 0" class="card">
      <div class="card-body">
        <div class="flex flex-col items-center gap-3 py-10 text-center">
          <div
            class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-500/10"
          >
            <Icon name="key" size="lg" class="text-amber-500" />
          </div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ imageText('noKeysTitle') }}
          </h3>
          <p class="max-w-md text-sm text-gray-500 dark:text-gray-400">
            {{ imageText('noKeysHint') }}
          </p>
          <p v-if="allowedGroupNames" class="max-w-md text-sm text-gray-500 dark:text-gray-400">
            {{ imageText('allowedGroups', { groups: allowedGroupNames }) }}
          </p>
          <div class="mt-2 flex gap-2">
            <router-link to="/keys" class="btn btn-primary btn-sm">
              <Icon name="plus" size="sm" class="mr-1.5" />
              {{ imageText('createKey') }}
            </router-link>
            <button type="button" class="btn btn-secondary btn-sm" @click="loadKeys">
              <Icon name="refresh" size="sm" class="mr-1.5" />
              {{ t('common.refresh') }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Chat-style studio -->
    <div
      v-else
      class="grid gap-4 xl:grid-cols-[minmax(0,1fr)_20rem]"
      :style="{ minHeight: 'calc(100vh - 9rem)' }"
    >
      <div class="flex min-w-0 flex-col">
        <!-- Conversation stream -->
        <div class="flex-1 space-y-6 pb-4">
        <!-- Empty state -->
        <div
          v-if="turns.length === 0"
          class="flex flex-col items-center justify-center gap-3 py-20 text-center"
        >
          <div
            class="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary-50 dark:bg-primary-500/10"
          >
            <Icon name="sparkles" size="xl" class="text-primary-500" />
          </div>
          <h3 class="text-base font-semibold text-gray-900 dark:text-white">
            {{ imageText('emptyTitle') }}
          </h3>
          <p class="max-w-md text-sm text-gray-500 dark:text-gray-400">
            {{ imageText('emptyHint') }}
          </p>
        </div>

        <template v-else>
          <div v-for="turn in turns" :key="turn.id" class="space-y-3">
            <!-- User prompt bubble (right) -->
            <div class="flex justify-end">
              <div class="max-w-[85%] space-y-2">
                <div v-if="turn.referencePreviews.length > 0" class="flex flex-wrap justify-end gap-2">
                  <img
                    v-for="preview in turn.referencePreviews"
                    :key="preview"
                    :src="preview || imagePlaceholderSrc"
                    class="h-16 w-16 rounded-lg border border-gray-200 object-cover dark:border-dark-600"
                    alt=""
                    @error="onImageError"
                  />
                </div>
                <div
                  class="rounded-2xl rounded-tr-md bg-primary-500 px-4 py-2.5 text-sm text-white shadow-sm"
                >
                  <p class="whitespace-pre-wrap break-words">{{ turn.prompt }}</p>
                </div>
                <div class="flex items-center justify-end gap-2 text-xs text-gray-400 dark:text-gray-500">
                  <span
                    class="rounded-md bg-gray-100 px-1.5 py-0.5 dark:bg-dark-700 dark:text-gray-400"
                  >
                    {{
                      turn.mode === 'edit'
                        ? imageText('editMode')
                        : imageText('generateMode')
                    }}
                  </span>
                  <span>{{ turn.model }}</span>
                  <span>{{ turn.size === 'auto' ? imageText('sizeAuto') : turn.size }}</span>
                  <span>{{ imageText('imagesCount', { count: turn.n }) }}</span>
                </div>
              </div>
            </div>

            <!-- Assistant response (left) -->
            <div class="flex justify-start">
              <div class="flex max-w-[85%] gap-2.5">
                <div
                  class="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary-50 dark:bg-primary-500/10"
                >
                  <Icon name="sparkles" size="sm" class="text-primary-500" />
                </div>
                <div class="min-w-0 flex-1">
                  <!-- Running -->
                  <div v-if="turn.status === 'running'" class="grid grid-cols-2 gap-3 sm:grid-cols-3">
                    <div
                      v-for="i in turn.n"
                      :key="i"
                      class="flex h-28 w-28 flex-col items-center justify-center gap-3 rounded-xl border border-dashed border-gray-300 bg-gray-50 px-5 py-6 sm:h-32 sm:w-32 dark:border-dark-600 dark:bg-dark-800/50"
                    >
                      <span
                        class="h-7 w-7 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"
                      ></span>
                      <span class="text-xs leading-none text-gray-400 dark:text-gray-500">
                        {{ imageText('elapsedSeconds', { seconds: elapsedFor(turn) }) }}
                      </span>
                    </div>
                  </div>

                  <!-- Error -->
                  <div
                    v-else-if="turn.status === 'error'"
                    class="flex flex-col items-start gap-2 rounded-2xl rounded-tl-md border border-red-200 bg-red-50 px-4 py-3 dark:border-red-500/30 dark:bg-red-500/10"
                  >
                    <p class="break-all text-sm text-red-600 dark:text-red-400">
                      {{ imageText('failed') }}: {{ turn.error }}
                    </p>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      :disabled="isGenerating"
                      @click="retryTurn(turn)"
                    >
                      <Icon name="refresh" size="sm" class="mr-1.5" />
                      {{ imageText('retry') }}
                    </button>
                  </div>

                  <!-- Success grid -->
                  <div v-else class="space-y-2">
                    <div class="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      <div
                        v-for="(result, index) in turn.results"
                        :key="result.id"
                        class="group relative aspect-square overflow-hidden rounded-xl border border-gray-200 bg-gray-100 dark:border-dark-600 dark:bg-dark-700"
                      >
                        <img
                          :src="result.src || imagePlaceholderSrc"
                          class="h-full w-full cursor-zoom-in object-cover"
                          loading="lazy"
                          alt=""
                          @error="onImageError"
                          @click="openLightbox(turn, index)"
                        />
                        <div
                          class="pointer-events-none absolute inset-x-0 bottom-0 flex justify-end gap-1.5 bg-gradient-to-t from-black/50 to-transparent p-2 opacity-0 transition-opacity group-hover:opacity-100"
                        >
                          <button
                            type="button"
                            class="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-gray-700 shadow hover:bg-white"
                            :title="imageText('useAsReference')"
                            @click.stop="addResultAsReference(result)"
                          >
                            <Icon name="plus" size="sm" />
                          </button>
                          <button
                            type="button"
                            class="pointer-events-auto flex h-8 w-8 items-center justify-center rounded-lg bg-white/90 text-gray-700 shadow hover:bg-white"
                            :title="imageText('download')"
                            @click.stop="downloadResult(turn, result, index)"
                          >
                            <Icon name="download" size="sm" />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div class="flex items-center gap-3 text-xs text-gray-400 dark:text-gray-500">
                      <span>{{ imageText('elapsedSeconds', { seconds: elapsedFor(turn) }) }}</span>
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 hover:text-primary-500"
                        :disabled="isGenerating"
                        @click="retryTurn(turn)"
                      >
                        <Icon name="refresh" size="xs" />
                        {{ imageText('retry') }}
                      </button>
                      <button
                        type="button"
                        class="inline-flex items-center gap-1 hover:text-red-500"
                        @click="removeTurn(turn.id)"
                      >
                        <Icon name="trash" size="xs" />
                        {{ t('common.delete') }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
          <div ref="streamEnd"></div>
        </template>
      </div>

      <!-- Composer (sticky bottom) -->
      <div class="sticky bottom-0 pb-2 pt-2">
        <div
          class="rounded-2xl border border-gray-200 bg-white/95 p-3 shadow-lg backdrop-blur dark:border-dark-600 dark:bg-dark-800/95"
          :class="
            isComposerDragOver
              ? 'border-primary-400 ring-2 ring-primary-200 dark:border-primary-500 dark:ring-primary-500/20'
              : ''
          "
          @dragenter="onComposerDragEnter"
          @dragover="onComposerDragOver"
          @dragleave="onComposerDragLeave"
          @drop="onComposerDrop"
          @paste="onComposerPaste"
        >
          <!-- Reference thumbnails -->
          <div v-if="referenceImages.length > 0" class="mb-2 flex flex-wrap gap-2">
            <div
              v-for="(ref, index) in referenceImages"
              :key="ref.preview"
              class="relative h-14 w-14 overflow-hidden rounded-lg border border-gray-200 dark:border-dark-600"
            >
              <img
                :src="ref.preview || imagePlaceholderSrc"
                class="h-full w-full object-cover"
                alt=""
                @error="onImageError"
              />
              <button
                type="button"
                class="absolute right-0.5 top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-black/60 text-white hover:bg-black/80"
                :title="t('common.delete')"
                @click="removeReference(index)"
              >
                <Icon name="x" size="xs" />
              </button>
            </div>
          </div>

          <!-- Textarea -->
          <textarea
            ref="promptInput"
            v-model="prompt"
            class="w-full resize-none border-0 bg-transparent px-1 text-sm text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-0 dark:text-white dark:placeholder-gray-500"
            :placeholder="imageText('promptPlaceholder')"
            rows="2"
            @keydown.enter.exact.prevent="onSubmit"
          ></textarea>

          <!-- Action bar -->
          <div class="mt-1 flex items-center justify-between gap-2">
            <div class="flex items-center gap-1.5">
              <!-- New conversation -->
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 disabled:cursor-not-allowed disabled:opacity-50 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-gray-200"
                :title="imageText('newConversation')"
                :disabled="isGenerating"
                @click="startNewConversation"
              >
                <Icon name="plus" size="md" />
              </button>

              <!-- Attach reference -->
              <button
                type="button"
                class="flex h-8 w-8 items-center justify-center rounded-lg text-gray-500 transition-colors hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-dark-700 dark:hover:text-gray-200"
                :title="imageText('addReference')"
                @click="fileInput?.click()"
              >
                <Icon name="upload" size="md" />
              </button>
              <input
                ref="fileInput"
                type="file"
                accept="image/*"
                multiple
                class="hidden"
                @change="onFilesSelected"
              />

              <!-- Settings popover trigger -->
              <div ref="settingsWrap" class="relative">
                <button
                  type="button"
                  class="flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs text-gray-600 transition-colors hover:border-gray-300 dark:border-dark-600 dark:text-gray-300 dark:hover:border-dark-500"
                  @click="settingsOpen = !settingsOpen"
                >
                  <Icon name="cog" size="sm" />
                  <span class="hidden sm:inline">{{ settingsSummary }}</span>
                  <span class="sm:hidden">{{ imageText('settings') }}</span>
                </button>

                <!-- Popover -->
                <div
                  v-if="settingsOpen"
                  class="absolute bottom-full left-0 z-30 mb-2 max-h-[calc(100vh-8rem)] w-[min(34rem,calc(100vw-2rem))] space-y-4 overflow-y-auto rounded-2xl border border-gray-200 bg-white p-4 shadow-xl dark:border-dark-600 dark:bg-dark-800"
                >
                  <h3 class="text-base font-semibold text-gray-900 dark:text-white">
                    {{ imageText('imageSettings') }}
                  </h3>
                  <div>
                    <label class="input-label">{{ imageText('apiKey') }}</label>
                    <Select
                      v-model="selectedKeyId"
                      :options="keyOptions"
                      :placeholder="imageText('apiKeyPlaceholder')"
                    />
                  </div>
                  <div>
                    <label class="input-label">{{ imageText('model') }}</label>
                    <Select
                      v-model="model"
                      :options="modelOptions"
                      :placeholder="imageText('modelPlaceholder')"
                      :disabled="modelsLoading || modelOptions.length === 0"
                      searchable
                      :empty-text="modelsLoading ? imageText('modelsLoading') : imageText('noImageModels')"
                    />
                    <p
                      v-if="modelsError"
                      class="mt-1 text-xs text-amber-600 dark:text-amber-400"
                    >
                      {{ modelsError }}
                    </p>
                  </div>
                  <div>
                    <div class="mb-1 flex items-center gap-1">
                      <label class="input-label mb-0">{{ imageText('size') }}</label>
                      <span class="text-xs text-gray-400 dark:text-gray-500" :title="imageText('sizeHint')">
                        <Icon name="infoCircle" size="xs" />
                      </span>
                    </div>
                    <div class="grid grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2">
                      <label
                        class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-dark-700 dark:text-gray-400"
                      >
                        <span>W</span>
                        <input
                          v-model.number="imageWidth"
                          type="number"
                          min="512"
                          max="4096"
                          step="1"
                          class="w-full border-0 bg-transparent p-0 text-gray-900 focus:outline-none focus:ring-0 dark:text-white"
                          @input="onCustomSizeInput"
                        />
                      </label>
                      <span class="text-sm text-gray-400">×</span>
                      <label
                        class="flex items-center gap-2 rounded-lg bg-gray-100 px-3 py-2 text-sm text-gray-500 dark:bg-dark-700 dark:text-gray-400"
                      >
                        <span>H</span>
                        <input
                          v-model.number="imageHeight"
                          type="number"
                          min="512"
                          max="4096"
                          step="1"
                          class="w-full border-0 bg-transparent p-0 text-gray-900 focus:outline-none focus:ring-0 dark:text-white"
                          @input="onCustomSizeInput"
                        />
                      </label>
                    </div>
                    <p
                      v-if="sizeValidationError"
                      class="mt-1 text-xs text-red-600 dark:text-red-400"
                    >
                      {{ sizeValidationError }}
                    </p>
                  </div>
                  <div>
                    <div class="mb-1 flex items-center gap-1">
                      <label class="input-label mb-0">{{ imageText('aspectRatio') }}</label>
                      <span class="text-xs text-gray-400 dark:text-gray-500" :title="imageText('aspectRatioHint')">
                        <Icon name="infoCircle" size="xs" />
                      </span>
                    </div>
                    <div class="grid grid-cols-3 gap-2 sm:grid-cols-5">
                      <button
                        v-for="option in visibleAspectRatioOptions"
                        :key="option.value"
                        type="button"
                        class="flex min-h-[4.5rem] flex-col items-center justify-center gap-1 rounded-xl border px-2 py-2 text-sm transition-colors disabled:cursor-not-allowed disabled:opacity-40"
                        :class="
                          selectedAspectRatio === option.value
                            ? 'border-gray-900 bg-white text-gray-900 dark:border-white dark:bg-dark-800 dark:text-white'
                            : 'border-gray-200 text-gray-700 hover:border-gray-300 dark:border-dark-600 dark:text-gray-300 dark:hover:border-dark-500'
                        "
                        :disabled="option.disabled"
                        @click="selectAspectRatio(option)"
                      >
                        <span
                          class="block rounded-sm border border-current"
                          :style="aspectRatioIconStyle(option)"
                        ></span>
                        <span>{{ option.label }}</span>
                      </button>
                    </div>
                  </div>
                  <div>
                    <label class="input-label">{{ imageText('quality') }}</label>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="option in qualityOptions"
                        :key="option.value"
                        type="button"
                        class="rounded-lg border px-2.5 py-1 text-xs transition-colors"
                        :class="
                          quality === option.value
                            ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:text-gray-300'
                        "
                        @click="quality = option.value"
                      >
                        {{ option.label }}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label class="input-label">{{ imageText('count') }}</label>
                    <div class="flex flex-wrap gap-1.5">
                      <button
                        v-for="n in countOptions"
                        :key="n"
                        type="button"
                        class="min-w-12 rounded-full border px-3 py-1.5 text-sm transition-colors"
                        :class="
                          count === n
                            ? 'border-primary-500 bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-400'
                            : 'border-gray-200 text-gray-600 hover:border-gray-300 dark:border-dark-600 dark:text-gray-300'
                        "
                        @click="count = n"
                      >
                        {{ imageText('countUnit', { count: n }) }}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <!-- Send -->
            <button
              type="button"
              class="flex h-9 w-9 items-center justify-center rounded-xl bg-primary-500 text-white transition-colors hover:bg-primary-600 disabled:cursor-not-allowed disabled:opacity-50"
              :disabled="isGenerating || !selectedKeyId || !model.trim() || modelsLoading"
              :title="imageText('generate')"
              @click="onSubmit"
            >
              <span
                v-if="isGenerating"
                class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white"
              ></span>
              <Icon v-else name="sparkles" size="md" />
            </button>
          </div>
        </div>
      </div>
      </div>

      <aside class="min-w-0 xl:sticky xl:top-4 xl:self-start">
        <div
          class="rounded-xl border border-gray-200 bg-white/95 p-3 shadow-sm dark:border-dark-600 dark:bg-dark-800/95"
        >
          <div class="mb-2 flex items-center justify-between gap-2">
            <h3 class="text-sm font-semibold text-gray-900 dark:text-white">
              {{ imageText('chatHistory') }}
            </h3>
            <span class="text-xs text-gray-400 dark:text-gray-500">
              {{ historyRecords.length }}/10
            </span>
          </div>
          <p class="mb-3 text-xs leading-5 text-gray-500 dark:text-gray-400">
            {{ imageText('chatHistoryNotice') }}
          </p>

          <div v-if="historyLoading" class="flex justify-center py-8">
            <LoadingSpinner />
          </div>
          <div v-else-if="historyRecords.length === 0" class="py-8 text-center text-sm text-gray-400 dark:text-gray-500">
            {{ imageText('chatHistoryEmpty') }}
          </div>
          <div v-else class="max-h-[calc(100vh-14rem)] space-y-2 overflow-y-auto pr-1">
            <button
              v-for="record in historyRecords"
              :key="record.id"
              type="button"
              class="flex w-full items-center gap-2 rounded-lg border border-gray-200 bg-white p-2 text-left transition-colors hover:border-primary-300 hover:bg-primary-50/60 dark:border-dark-600 dark:bg-dark-800 dark:hover:border-primary-500/60 dark:hover:bg-primary-500/10"
              @click="restoreHistoryRecord(record)"
            >
              <Icon name="chat" size="sm" class="shrink-0 text-gray-400 dark:text-gray-500" />
              <p
                class="min-w-0 flex-1 truncate text-sm font-medium text-gray-800 dark:text-gray-100"
                :title="conversationSummary(record)"
              >
                {{ conversationSummary(record) }}
              </p>
              <span class="shrink-0 text-xs text-gray-400 dark:text-gray-500">
                {{ formatHistoryTime(record.updatedAt) }}
              </span>
            </button>
          </div>
        </div>
      </aside>
    </div>

    <!-- Lightbox -->
    <Teleport to="body">
      <div
        v-if="lightbox"
        class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
        @click.self="closeLightbox"
      >
        <button
          type="button"
          class="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white hover:bg-white/20"
          :title="t('common.close')"
          @click="closeLightbox"
        >
          <Icon name="x" size="md" />
        </button>
        <button
          v-if="lightboxResults.length > 1"
          type="button"
          class="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
          @click.stop="stepLightbox(-1)"
        >
          ‹
        </button>
        <img
          v-if="lightboxResult"
          :src="lightboxResult.src || imagePlaceholderSrc"
          class="max-h-full max-w-full rounded-xl object-contain"
          alt=""
          @error="onImageError"
        />
        <button
          v-if="lightboxResults.length > 1"
          type="button"
          class="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-xl text-white hover:bg-white/20"
          @click.stop="stepLightbox(1)"
        >
          ›
        </button>
        <button
          v-if="lightboxTurn && lightboxResult"
          type="button"
          class="absolute bottom-4 left-1/2 flex -translate-x-1/2 items-center rounded-lg bg-white/10 px-4 py-2 text-sm text-white hover:bg-white/20"
          @click.stop="downloadResult(lightboxTurn, lightboxResult, lightbox?.index ?? 0)"
        >
          <Icon name="download" size="sm" class="mr-1.5" />
          {{ imageText('download') }}
        </button>
      </div>
    </Teleport>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import AppLayout from '@/components/layout/AppLayout.vue'
import Select from '@/components/common/Select.vue'
import LoadingSpinner from '@/components/common/LoadingSpinner.vue'
import Icon from '@/components/icons/Icon.vue'
import { useAppStore } from '@/stores/app'
import { keysAPI } from '@/api/keys'
import { userGroupsAPI } from '@/api/groups'
import { validateOpenAIImageSize } from '@/utils/openaiImageSize'
import {
  generateImages,
  listModels,
  type GeneratedImage,
  type ImageGenerationProvider,
  type ImageGenerationReference
} from '@/api/imageGeneration'
import type { ApiKey, Group } from '@/types'

interface ReferenceImage {
  file?: File
  url?: string
  preview: string
  auto?: boolean
}

interface GeneratedResult {
  id: string
  src: string
  blob?: Blob
  remoteUrl?: string
}

interface StoredImage {
  src: string
  remoteUrl?: string
}

interface StoredReference {
  preview: string
  url?: string
}

interface HistoryTurn {
  id: string
  prompt: string
  model: string
  provider?: ImageGenerationProvider
  size: string
  aspectRatio?: string
  imageSize?: string
  quality: string
  n: number
  mode: 'generate' | 'edit'
  referencePreviews: string[]
  referenceImages: StoredReference[]
  results: StoredImage[]
  elapsedSeconds: number
  createdAt: number
}

interface HistoryRecord {
  id: string
  turns: HistoryTurn[]
  createdAt: number
  updatedAt: number
}

type LegacyHistoryRecord = HistoryTurn

type HistoryTransactionMode = 'readonly' | 'readwrite'

interface Turn {
  id: string
  prompt: string
  model: string
  provider: ImageGenerationProvider
  size: string
  aspectRatio?: string
  imageSize?: string
  quality: string
  n: number
  mode: 'generate' | 'edit'
  referenceImages: ImageGenerationReference[]
  referencePreviews: string[]
  status: 'running' | 'success' | 'error'
  error?: string
  startedAt: number
  finishedAt?: number
  results: GeneratedResult[]
}

interface AspectRatioOption {
  value: string
  label: string
  width: number
  height: number
  tier?: '2k' | '4k'
  disabled?: boolean
}

interface ImageGenerationPublicSettings {
  image_generation_group_ids?: number[]
  gpt_2k_image_generation_group_ids?: number[]
  gpt_4k_image_generation_group_ids?: number[]
  gemini_image_generation_group_ids?: number[]
}

const PREFS_STORAGE_KEY = 'sub2api:image_generation_prefs'
const HISTORY_DB_NAME = 'sub2api:image-generation'
const HISTORY_DB_VERSION = 1
const HISTORY_STORE_NAME = 'chat-history'
const HISTORY_LIMIT = 10
const imageMessages: Record<string, string | ((params: Record<string, unknown>) => string)> = {
  noKeysTitle: '没有可用的 API 密钥',
  noKeysHint: '您还没有可用于生图的 API 密钥，请先在指定分组下创建一个。',
  allowedGroups: ({ groups }) => `可用分组：${groups ?? ''}`,
  createKey: '去创建密钥',
  loadKeysFailed: '加载 API 密钥失败',
  imageSettings: '图像设置',
  apiKey: 'API 密钥',
  apiKeyPlaceholder: '选择用于生图的 API 密钥',
  model: '模型',
  modelPlaceholder: '选择模型',
  modelsLoading: '正在加载该密钥可用模型...',
  noImageModels: '该密钥暂无可用于生图的模型',
  loadModelsFailed: '加载模型列表失败',
  size: '尺寸',
  sizeAuto: '自动',
  sizeHint: '宽高会作为 size 参数传给生图接口',
  aspectRatio: '宽高比',
  aspectRatioHint: '选择宽高比会自动填充推荐宽高，也可以手动输入尺寸',
  quality: '质量',
  qualityAuto: '自动',
  qualityLow: '低',
  qualityMedium: '中',
  qualityHigh: '高',
  count: '数量',
  settings: '设置',
  newConversation: '新对话',
  addReference: '添加参考图',
  promptPlaceholder: '描述你想生成的图像，例如：一只在草地上奔跑的柯基犬，阳光明媚，摄影风格',
  promptRequired: '请输入提示词',
  keyMissing: '请先选择 API 密钥',
  modelRequired: '请先选择模型',
  generate: '生成',
  generateMode: '文生图',
  editMode: '图生图',
  emptyTitle: '还没有生成记录',
  emptyHint: '输入提示词并点击"生成"，结果会展示在这里。',
  chatHistory: '聊天记录',
  chatHistoryEmpty: '暂无聊天记录',
  chatHistoryNotice:
    '聊天记录将存于浏览器缓存，部分源图片根据存储服务策略不同，可能会在1到3天不等的时间失效，请及时保存需要的图片。',
  download: '下载',
  useAsReference: '加入参考图',
  referenceAdded: '已加入参考图',
  retry: '重试',
  failed: '生成失败',
  elapsedSeconds: ({ seconds }) => `${seconds ?? 0} 秒`,
  imagesCount: ({ count }) => `${count ?? 0} 张`,
  countUnit: ({ count }) => `${count ?? 0} 张`
}
const imagePlaceholderSrc =
  'data:image/svg+xml;charset=UTF-8,' +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 240 240"><rect width="240" height="240" fill="#f3f4f6"/><path d="M58 162l40-42 31 30 18-20 35 32" fill="none" stroke="#9ca3af" stroke-width="10" stroke-linecap="round" stroke-linejoin="round"/><circle cx="156" cy="78" r="18" fill="#d1d5db"/><rect x="42" y="42" width="156" height="156" rx="18" fill="none" stroke="#d1d5db" stroke-width="8"/></svg>`
  )

const { t } = useI18n()
const appStore = useAppStore()
const publicSettings = computed(
  () => (appStore.cachedPublicSettings ?? {}) as ImageGenerationPublicSettings
)

function imageText(key: string, params: Record<string, unknown> = {}): string {
  const message = imageMessages[key]
  if (typeof message === 'function') return message(params)
  return message ?? key
}

// ---- API keys ----
const keysLoading = ref(true)
const apiKeys = ref<ApiKey[]>([])
const availableGroups = ref<Group[]>([])
const selectedKeyId = ref<number | null>(null)

const gpt2KGroupIds = computed(
  () => publicSettings.value.gpt_2k_image_generation_group_ids ?? []
)
const gpt4KGroupIds = computed(
  () => publicSettings.value.gpt_4k_image_generation_group_ids ?? []
)
const geminiGroupIds = computed(
  () => publicSettings.value.gemini_image_generation_group_ids ?? []
)
const legacyImageGenerationGroupIds = computed(
  () => publicSettings.value.image_generation_group_ids ?? []
)

const configuredGroupIds = computed(() => {
  const ids = [
    ...gpt2KGroupIds.value,
    ...gpt4KGroupIds.value,
    ...geminiGroupIds.value,
    ...legacyImageGenerationGroupIds.value
  ]
  return Array.from(new Set(ids))
})

// 配置了分组则只展示这些分组下的 key；未配置则不限制
const eligibleKeys = computed(() => {
  const active = apiKeys.value.filter((key) => key.status === 'active')
  const ids = configuredGroupIds.value
  if (ids.length === 0) return active
  return active.filter((key) => key.group_id != null && ids.includes(key.group_id))
})

const keyOptions = computed(() =>
  eligibleKeys.value.map((key) => ({
    value: key.id,
    label: key.group?.name ? `${key.name} · ${key.group.name}` : key.name
  }))
)

const allowedGroupNames = computed(() => {
  const ids = configuredGroupIds.value
  if (ids.length === 0) return ''
  const byId = new Map(availableGroups.value.map((group) => [group.id, group.name]))
  return ids.map((id) => byId.get(id) ?? `#${id}`).join('、')
})

const selectedKey = computed(
  () => eligibleKeys.value.find((key) => key.id === selectedKeyId.value) ?? null
)

const selectedGroupId = computed(() => selectedKey.value?.group_id ?? null)
const selectedImageProvider = computed<ImageGenerationProvider>(() => {
  const groupId = selectedGroupId.value
  if (groupId != null && geminiGroupIds.value.includes(groupId)) return 'gemini'
  return 'openai'
})
const selectedKeyAllows4K = computed(() => {
  if (selectedImageProvider.value === 'gemini') return true
  const groupId = selectedGroupId.value
  if (groupId == null) return true
  if (gpt4KGroupIds.value.includes(groupId)) return true
  if (gpt2KGroupIds.value.includes(groupId)) return false
  return true
})

async function loadKeys() {
  keysLoading.value = true
  try {
    await appStore.fetchPublicSettings()
    const [keysResult, groupsResult] = await Promise.allSettled([
      keysAPI.list(1, 100, { status: 'active' }),
      userGroupsAPI.getAvailable()
    ])
    if (keysResult.status === 'fulfilled') {
      apiKeys.value = keysResult.value.items
    } else {
      appStore.showError(imageText('loadKeysFailed'))
    }
    if (groupsResult.status === 'fulfilled') {
      availableGroups.value = groupsResult.value
    }
  } finally {
    keysLoading.value = false
  }
}

// 保持选中项有效；默认选第一个
watch(
  eligibleKeys,
  (keys) => {
    if (keys.length === 0) {
      selectedKeyId.value = null
      return
    }
    if (!keys.some((key) => key.id === selectedKeyId.value)) {
      selectedKeyId.value = keys[0].id
    }
  },
  { immediate: true }
)

// ---- Form state ----
const prompt = ref('')
const model = ref('')
const modelsLoading = ref(false)
const modelsError = ref('')
const imageWidth = ref(1024)
const imageHeight = ref(1024)
const selectedAspectRatio = ref('1:1')
const quality = ref('auto')
const count = ref(1)
const referenceImages = ref<ReferenceImage[]>([])
const fileInput = ref<HTMLInputElement | null>(null)
const promptInput = ref<HTMLTextAreaElement | null>(null)
const isComposerDragOver = ref(false)
let composerDragDepth = 0
const historyLoading = ref(false)
const historyRecords = ref<HistoryRecord[]>([])
const conversationId = ref(createConversationId())

function revokePreviewURL(preview: string) {
  if (preview.startsWith('blob:')) {
    URL.revokeObjectURL(preview)
  }
}

function onImageError(event: Event) {
  const img = event.target as HTMLImageElement | null
  if (!img || img.src === imagePlaceholderSrc) return
  img.src = imagePlaceholderSrc
}

function createConversationId(): string {
  return `conversation-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`
}

function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function isHistoryTurn(value: unknown): value is HistoryTurn {
  return (
    isObject(value) &&
    typeof value.id === 'string' &&
    typeof value.prompt === 'string' &&
    Array.isArray(value.results)
  )
}

function normalizeHistoryRecord(value: HistoryRecord | LegacyHistoryRecord): HistoryRecord | null {
  if ('turns' in value && Array.isArray(value.turns)) {
    const turns = value.turns.filter(isHistoryTurn)
    if (turns.length === 0) return null
    const firstTime = turns[0].createdAt
    const lastTime = turns[turns.length - 1].createdAt
    return {
      id: typeof value.id === 'string' ? value.id : createConversationId(),
      turns,
      createdAt: Number.isFinite(value.createdAt) ? value.createdAt : firstTime,
      updatedAt: Number.isFinite(value.updatedAt) ? value.updatedAt : lastTime
    }
  }

  if (!isHistoryTurn(value)) return null
  return {
    id: value.id,
    turns: [value],
    createdAt: value.createdAt,
    updatedAt: value.createdAt
  }
}

function openHistoryDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === 'undefined') {
      reject(new Error('IndexedDB is not available'))
      return
    }
    const request = indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(HISTORY_STORE_NAME)) {
        db.createObjectStore(HISTORY_STORE_NAME, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open IndexedDB'))
  })
}

async function withHistoryStore<T>(
  mode: HistoryTransactionMode,
  run: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | void> {
  const db = await openHistoryDB()
  try {
    return await new Promise<T | void>((resolve, reject) => {
      const transaction = db.transaction(HISTORY_STORE_NAME, mode)
      const store = transaction.objectStore(HISTORY_STORE_NAME)
      const request = run(store)
      let result: T | void
      if (request) {
        request.onsuccess = () => {
          result = request.result
        }
        request.onerror = () => reject(request.error ?? new Error('IndexedDB request failed'))
      }
      transaction.oncomplete = () => resolve(result)
      transaction.onerror = () => reject(transaction.error ?? new Error('IndexedDB transaction failed'))
      transaction.onabort = () => reject(transaction.error ?? new Error('IndexedDB transaction aborted'))
    })
  } finally {
    db.close()
  }
}

async function loadHistoryRecords() {
  historyLoading.value = true
  try {
    const records = await withHistoryStore<Array<HistoryRecord | LegacyHistoryRecord>>(
      'readonly',
      (store) => store.getAll()
    )
    historyRecords.value = (records ?? [])
      .map((record) => normalizeHistoryRecord(record))
      .filter((record): record is HistoryRecord => record != null)
      .sort((a, b) => b.updatedAt - a.updatedAt)
      .slice(0, HISTORY_LIMIT)
  } catch {
    historyRecords.value = []
  } finally {
    historyLoading.value = false
  }
}

async function saveHistoryRecord(record: HistoryRecord) {
  const next = [record, ...historyRecords.value.filter((item) => item.id !== record.id)]
    .sort((a, b) => b.updatedAt - a.updatedAt)
    .slice(0, HISTORY_LIMIT)
  historyRecords.value = next
  try {
    await withHistoryStore('readwrite', (store) => {
      for (const item of next) store.put(item)
    })
    const keys = await withHistoryStore('readonly', (store) => store.getAllKeys())
    const keep = new Set(next.map((item) => item.id))
    const stale = (keys ?? []).filter((key) => typeof key === 'string' && !keep.has(key))
    if (stale.length === 0) return
    await withHistoryStore('readwrite', (store) => {
      for (const key of stale) store.delete(key)
    })
  } catch {
    // 历史记录是浏览器缓存能力，写入失败不影响生图主流程。
  }
}

// ---- Settings popover ----
const settingsOpen = ref(false)
const settingsWrap = ref<HTMLElement | null>(null)

const gatewayModelIds = ref<string[]>([])
const modelOptions = computed(() =>
  gatewayModelIds.value.map((id) => ({
    value: id,
    label: id
  }))
)

let modelListRequestId = 0
let modelListController: AbortController | null = null

function providerForModelID(modelId: string): ImageGenerationProvider {
  const id = modelId.toLowerCase()
  return id.startsWith('gemini-') && id.includes('image') ? 'gemini' : 'openai'
}

function isSupportedImageGenerationModelID(
  modelId: string,
  provider: ImageGenerationProvider
): boolean {
  const id = modelId.toLowerCase()
  if (provider === 'gemini') {
    return id.startsWith('gemini-') && id.includes('image')
  }
  return (
    id.startsWith('gpt-image-') ||
    id === 'grok-imagine' ||
    id.startsWith('grok-imagine-image') ||
    id === 'grok-imagine-edit'
  )
}

function sortModelIDs(modelIds: string[], provider: ImageGenerationProvider): string[] {
  return [...modelIds]
    .filter((id) => isSupportedImageGenerationModelID(id, provider))
    .sort((a, b) => a.localeCompare(b))
}

async function loadModelsForSelectedKey() {
  modelListController?.abort()
  const requestId = ++modelListRequestId
  const key = selectedKey.value
  modelsError.value = ''

  if (!key) {
    gatewayModelIds.value = []
    model.value = ''
    modelsLoading.value = false
    return
  }

  const controller = new AbortController()
  modelListController = controller
  modelsLoading.value = true

  try {
    const provider = selectedImageProvider.value
    const modelIds = sortModelIDs(await listModels(key.key, controller.signal), provider)
    if (requestId !== modelListRequestId) return
    gatewayModelIds.value = modelIds
    if (!modelIds.includes(model.value)) {
      model.value = modelIds[0] ?? ''
    }
  } catch (error) {
    if (controller.signal.aborted || requestId !== modelListRequestId) return
    gatewayModelIds.value = []
    model.value = ''
    modelsError.value =
      error instanceof Error ? error.message : imageText('loadModelsFailed')
  } finally {
    if (requestId === modelListRequestId) {
      modelsLoading.value = false
      if (modelListController === controller) modelListController = null
    }
  }
}

watch(
  () => [selectedKey.value?.id ?? null, selectedImageProvider.value] as const,
  () => {
    void loadModelsForSelectedKey()
  },
  { immediate: true }
)

const aspectRatioOptions: AspectRatioOption[] = [
  { value: '1:1', label: '1:1', width: 1024, height: 1024 },
  { value: '2:3', label: '2:3', width: 1024, height: 1536 },
  { value: '3:2', label: '3:2', width: 1536, height: 1024 },
  { value: '3:4', label: '3:4', width: 1024, height: 1365 },
  { value: '4:3', label: '4:3', width: 1365, height: 1024 },
  { value: '9:16', label: '9:16', width: 1024, height: 1820 },
  { value: '16:9', label: '16:9', width: 1920, height: 1088 },
  { value: '1:1-2k', label: '1:1(2k)', width: 2048, height: 2048, tier: '2k' },
  { value: '16:9-2k', label: '16:9(2k)', width: 2048, height: 1152, tier: '2k' },
  { value: '9:16-2k', label: '9:16(2k)', width: 1152, height: 2048, tier: '2k' },
  { value: '16:9-4k', label: '16:9(4k)', width: 3840, height: 2160, tier: '4k' },
  { value: '9:16-4k', label: '9:16(4k)', width: 2160, height: 3840, tier: '4k' },
  { value: 'auto', label: 'auto', width: 1024, height: 1024 }
]

const selectedGeminiAllowsImageSize = computed(() => {
  if (selectedImageProvider.value !== 'gemini') return true
  const id = model.value.trim().toLowerCase()
  if (!id) return true
  return !id.includes('gemini-2.5-flash-image')
})

const visibleAspectRatioOptions = computed(() =>
  aspectRatioOptions.filter((option) => {
    if (!selectedKeyAllows4K.value && option.tier === '4k') return false
    if (!selectedGeminiAllowsImageSize.value && option.tier) return false
    return true
  })
)

const countOptions = Array.from({ length: 10 }, (_, index) => index + 1)

const qualityOptions = computed(() => [
  { value: 'auto', label: imageText('qualityAuto') },
  { value: 'low', label: imageText('qualityLow') },
  { value: 'medium', label: imageText('qualityMedium') },
  { value: 'high', label: imageText('qualityHigh') }
])

function qualityLabel(value: string): string {
  return qualityOptions.value.find((option) => option.value === value)?.label ?? value
}

const size = computed(() =>
  selectedAspectRatio.value === 'auto'
    ? 'auto'
    : imageDimensionValue(imageWidth.value) != null && imageDimensionValue(imageHeight.value) != null
      ? `${imageDimensionValue(imageWidth.value)}x${imageDimensionValue(imageHeight.value)}`
      : ''
)

const sizeValidationError = computed(() => {
  if (selectedImageProvider.value !== 'openai') return ''
  return validateOpenAIImageSize(size.value, model.value)
})

const selectedAspectRatioOption = computed(() =>
  aspectRatioOptions.find((item) => item.value === selectedAspectRatio.value)
)

const sizeSummary = computed(() => {
  if (selectedAspectRatio.value === 'auto') return imageText('sizeAuto')
  const option = selectedAspectRatioOption.value
  return option ? `${option.label} · ${size.value}` : size.value
})

const geminiAspectRatio = computed(() => {
  const option = selectedAspectRatioOption.value
  if (!option || option.value === 'auto') return undefined
  return option.label.replace(/\(.+\)$/, '')
})

const geminiImageSize = computed(() => {
  if (selectedImageProvider.value !== 'gemini') return undefined
  if (!selectedGeminiAllowsImageSize.value) return undefined
  const tier = selectedAspectRatioOption.value?.tier
  if (tier === '2k') return '2K'
  if (tier === '4k') return '4K'
  return undefined
})

const settingsSummary = computed(() => {
  return `${qualityLabel(quality.value)} · ${sizeSummary.value} · ${imageText('imagesCount', { count: count.value })}`
})

function imageDimensionValue(value: unknown): number | null {
  const number = Number(value)
  return Number.isInteger(number) && number > 0 ? number : null
}

function storedImageDimension(value: number): number {
  const dimension = Math.round(value)
  return Number.isFinite(dimension) && dimension > 0 ? dimension : 1024
}

function matchAspectRatioValue(width: number, height: number): string {
  const exact = aspectRatioOptions.find((option) => option.width === width && option.height === height)
  if (exact) return exact.value
  return 'custom'
}

function applySizeString(value: string) {
  if (value === 'auto') {
    selectedAspectRatio.value = 'auto'
    return
  }
  const match = value.match(/^(\d+)x(\d+)$/i)
  if (!match) return
  imageWidth.value = Number(match[1])
  imageHeight.value = Number(match[2])
  selectedAspectRatio.value = matchAspectRatioValue(imageWidth.value, imageHeight.value)
}

function selectAspectRatio(option: AspectRatioOption) {
  if (option.disabled) return
  selectedAspectRatio.value = option.value
  if (option.value !== 'auto') {
    imageWidth.value = option.width
    imageHeight.value = option.height
  }
}

function onCustomSizeInput() {
  const width = imageDimensionValue(imageWidth.value)
  const height = imageDimensionValue(imageHeight.value)
  selectedAspectRatio.value = width != null && height != null ? matchAspectRatioValue(width, height) : 'custom'
}

function aspectRatioIconStyle(option: AspectRatioOption): Record<string, string> {
  if (option.value === 'auto') {
    return { width: '1.25rem', height: '1.25rem', borderStyle: 'dashed' }
  }
  const max = 1.35
  const min = 0.45
  const ratio = option.width / option.height
  if (ratio >= 1) {
    return {
      width: `${max}rem`,
      height: `${Math.max(min, max / ratio)}rem`
    }
  }
  return {
    width: `${Math.max(min, max * ratio)}rem`,
    height: `${max}rem`
  }
}

watch([visibleAspectRatioOptions, selectedAspectRatio], ([options]) => {
  if (selectedAspectRatio.value === 'custom') return
  if (options.some((option) => option.value === selectedAspectRatio.value)) return
  selectAspectRatio(options[0] ?? aspectRatioOptions[0])
})

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_STORAGE_KEY)
    if (!raw) return
    const prefs = JSON.parse(raw) as Partial<{
      model: string
      size: string
      width: number
      height: number
      aspectRatio: string
      quality: string
      count: number
      keyId: number
    }>
    if (typeof prefs.model === 'string' && prefs.model) model.value = prefs.model
    if (typeof prefs.aspectRatio === 'string' && prefs.aspectRatio) {
      const option = aspectRatioOptions.find((item) => item.value === prefs.aspectRatio)
      if (option) selectAspectRatio(option)
    } else if (typeof prefs.size === 'string' && prefs.size) {
      applySizeString(prefs.size)
    }
    if (typeof prefs.width === 'number' && typeof prefs.height === 'number') {
      imageWidth.value = storedImageDimension(prefs.width)
      imageHeight.value = storedImageDimension(prefs.height)
      selectedAspectRatio.value = matchAspectRatioValue(imageWidth.value, imageHeight.value)
    }
    if (typeof prefs.quality === 'string' && prefs.quality) quality.value = prefs.quality
    if (typeof prefs.count === 'number' && prefs.count >= 1 && prefs.count <= 10) {
      count.value = prefs.count
    }
    if (typeof prefs.keyId === 'number') selectedKeyId.value = prefs.keyId
  } catch {
    // 忽略损坏的本地偏好
  }
}

watch([model, imageWidth, imageHeight, selectedAspectRatio, quality, count, selectedKeyId], () => {
  try {
    localStorage.setItem(
      PREFS_STORAGE_KEY,
      JSON.stringify({
        model: model.value,
        size: size.value,
        width: imageWidth.value,
        height: imageHeight.value,
        aspectRatio: selectedAspectRatio.value,
        quality: quality.value,
        count: count.value,
        keyId: selectedKeyId.value ?? undefined
      })
    )
  } catch {
    // localStorage 不可用时静默跳过
  }
})

// ---- Reference images ----
function fileToPreviewDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'))
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read image'))
    }
    reader.readAsDataURL(file)
  })
}

async function addReferenceFiles(files: Iterable<File>): Promise<number> {
  const refs = (
    await Promise.all(
      Array.from(files)
        .filter((file) => file.type.startsWith('image/'))
        .map(async (file): Promise<ReferenceImage | null> => {
          try {
            return { file, preview: await fileToPreviewDataURL(file) }
          } catch {
            return null
          }
        })
    )
  ).filter((ref): ref is ReferenceImage => ref != null)

  if (refs.length === 0) return 0
  referenceImages.value.push(...refs)
  promptInput.value?.focus()
  return refs.length
}

function imageFilesFromDataTransfer(dataTransfer: DataTransfer | null): File[] {
  if (!dataTransfer) return []
  const itemFiles = Array.from(dataTransfer.items ?? [])
    .filter((item) => item.kind === 'file' && item.type.startsWith('image/'))
    .map((item) => item.getAsFile())
    .filter((file): file is File => file != null)
  if (itemFiles.length > 0) return itemFiles
  return Array.from(dataTransfer.files ?? []).filter((file) => file.type.startsWith('image/'))
}

function imageFilesFromClipboard(event: ClipboardEvent): File[] {
  return imageFilesFromDataTransfer(event.clipboardData)
}

function onFilesSelected(event: Event) {
  const input = event.target as HTMLInputElement
  void addReferenceFiles(Array.from(input.files ?? []))
  input.value = ''
}

function onComposerDragEnter(event: DragEvent) {
  if (imageFilesFromDataTransfer(event.dataTransfer).length === 0) return
  event.preventDefault()
  composerDragDepth += 1
  isComposerDragOver.value = true
}

function onComposerDragOver(event: DragEvent) {
  if (imageFilesFromDataTransfer(event.dataTransfer).length === 0) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
  isComposerDragOver.value = true
}

function onComposerDragLeave(event: DragEvent) {
  if (imageFilesFromDataTransfer(event.dataTransfer).length === 0) return
  event.preventDefault()
  composerDragDepth = Math.max(0, composerDragDepth - 1)
  if (composerDragDepth === 0) isComposerDragOver.value = false
}

function onComposerDrop(event: DragEvent) {
  const files = imageFilesFromDataTransfer(event.dataTransfer)
  if (files.length === 0) return
  event.preventDefault()
  composerDragDepth = 0
  isComposerDragOver.value = false
  void addReferenceFiles(files)
}

function onComposerPaste(event: ClipboardEvent) {
  const files = imageFilesFromClipboard(event)
  if (files.length === 0) return
  event.preventDefault()
  void addReferenceFiles(files)
}

function isEditableTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  return Boolean(target.closest('input, textarea, [contenteditable="true"]'))
}

function onDocumentPaste(event: ClipboardEvent) {
  if (event.defaultPrevented) return
  const files = imageFilesFromClipboard(event)
  if (files.length === 0) return
  if (isEditableTarget(event.target) && event.target !== promptInput.value) return
  event.preventDefault()
  void addReferenceFiles(files)
}

function removeReference(index: number) {
  const [removed] = referenceImages.value.splice(index, 1)
  if (!removed) return
  const inUse = turns.value.some((turn) => turn.referencePreviews.includes(removed.preview))
  if (!inUse) revokePreviewURL(removed.preview)
}

function resultToReference(result: GeneratedResult, auto = false): ReferenceImage | null {
  if (result.remoteUrl) {
    return {
      url: result.remoteUrl,
      preview: result.remoteUrl,
      auto
    }
  }
  const blob = result.blob
  if (!blob) return null
  const file = new File([blob], `reference-${Date.now()}.png`, {
    type: blob.type || 'image/png'
  })
  return {
    file,
    preview: URL.createObjectURL(file),
    auto
  }
}

function clearAutoReferences() {
  const kept: ReferenceImage[] = []
  for (const ref of referenceImages.value) {
    if (ref.auto) {
      const inUse = turns.value.some((turn) => turn.referencePreviews.includes(ref.preview))
      if (!inUse) revokePreviewURL(ref.preview)
    } else {
      kept.push(ref)
    }
  }
  referenceImages.value = kept
}

function setAutoReferencesFromResults(results: GeneratedResult[]) {
  clearAutoReferences()
  const refs = results
    .map((result) => resultToReference(result, true))
    .filter((ref): ref is ReferenceImage => ref != null)
  if (refs.length === 0) return
  referenceImages.value.push(...refs)
}

async function addResultAsReference(result: GeneratedResult) {
  const ref = resultToReference(result)
  if (!ref) return
  referenceImages.value.push(ref)
  appStore.showSuccess(imageText('referenceAdded'))
  promptInput.value?.focus()
}

// ---- Generation ----
const turns = ref<Turn[]>([])
const streamEnd = ref<HTMLElement | null>(null)
const isGenerating = computed(() => turns.value.some((turn) => turn.status === 'running'))
let activeController: AbortController | null = null

// 生成中的耗时计时
const nowTick = ref(Date.now())
let tickTimer: number | null = null

function ensureTicker() {
  if (tickTimer != null) return
  tickTimer = window.setInterval(() => {
    nowTick.value = Date.now()
    if (!turns.value.some((turn) => turn.status === 'running') && tickTimer != null) {
      clearInterval(tickTimer)
      tickTimer = null
    }
  }, 500)
}

function elapsedFor(turn: Turn): number {
  const end = turn.status === 'running' ? nowTick.value : (turn.finishedAt ?? turn.startedAt)
  return Math.max(0, Math.round((end - turn.startedAt) / 1000))
}

function scrollToBottom() {
  void nextTick(() => {
    streamEnd.value?.scrollIntoView({ behavior: 'smooth', block: 'end' })
  })
}

function b64ToBlob(b64: string, mime = 'image/png'): Blob {
  const binary = atob(b64)
  const bytes = new Uint8Array(binary.length)
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i)
  }
  return new Blob([bytes], { type: mime })
}

function blobToDataURL(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onerror = () => reject(reader.error ?? new Error('Failed to read image'))
    reader.onload = () => {
      if (typeof reader.result === 'string') resolve(reader.result)
      else reject(new Error('Failed to read image'))
    }
    reader.readAsDataURL(blob)
  })
}

function toResults(turnId: string, data: GeneratedImage[]): GeneratedResult[] {
  return data.map((item, index) => {
    if (item.url) {
      return { id: `${turnId}-${index}`, src: item.url, remoteUrl: item.url }
    }
    if (item.b64_json) {
      const blob = b64ToBlob(item.b64_json, item.mime_type || 'image/png')
      const src = `data:${blob.type || 'image/png'};base64,${item.b64_json}`
      return { id: `${turnId}-${index}`, src, blob }
    }
    return { id: `${turnId}-${index}`, src: '' }
  })
}

async function resultToStoredImage(result: GeneratedResult): Promise<StoredImage | null> {
  if (result.remoteUrl) {
    return { src: result.remoteUrl, remoteUrl: result.remoteUrl }
  }
  if (result.blob) {
    return { src: await blobToDataURL(result.blob) }
  }
  if (result.src) {
    return { src: result.src }
  }
  return null
}

function conversationSummary(record: HistoryRecord): string {
  return record.turns[0]?.prompt || imageText('emptyTitle')
}

function formatHistoryTime(value: number): string {
  try {
    return new Intl.DateTimeFormat(undefined, {
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    }).format(new Date(value))
  } catch {
    return ''
  }
}

function turnToHistoryTurn(turn: Turn, results: StoredImage[]): HistoryTurn {
  const createdAt = turn.finishedAt ?? Date.now()
  return {
    id: turn.id,
    prompt: turn.prompt,
    model: turn.model,
    provider: turn.provider,
    size: turn.size,
    aspectRatio: turn.aspectRatio,
    imageSize: turn.imageSize,
    quality: turn.quality,
    n: turn.n,
    mode: turn.mode,
    referencePreviews: [...turn.referencePreviews],
    referenceImages: turn.referenceImages.map((ref, index) => ({
      url: ref.url,
      preview: turn.referencePreviews[index] ?? ref.url ?? imagePlaceholderSrc
    })),
    results,
    elapsedSeconds: elapsedFor(turn),
    createdAt
  }
}

async function saveTurnToHistory(turn: Turn) {
  if (turn.status !== 'success' || turn.results.length === 0) return
  const results = (
    await Promise.all(turn.results.map((result) => resultToStoredImage(result)))
  ).filter((image): image is StoredImage => image != null)
  if (results.length === 0) return
  const historyTurn = turnToHistoryTurn(turn, results)
  const existing = historyRecords.value.find((record) => record.id === conversationId.value)
  await saveHistoryRecord({
    id: conversationId.value,
    turns: existing
      ? [...existing.turns.filter((item) => item.id !== historyTurn.id), historyTurn]
      : [historyTurn],
    createdAt: existing?.createdAt ?? historyTurn.createdAt,
    updatedAt: historyTurn.createdAt
  })
}

function storedImageToResult(turnId: string, image: StoredImage, index: number): GeneratedResult {
  return {
    id: `${turnId}-${index}`,
    src: image.src || imagePlaceholderSrc,
    remoteUrl: image.remoteUrl || image.src
  }
}

function releaseConversation() {
  for (const existing of turns.value) {
    releaseResults(existing)
    for (const preview of existing.referencePreviews) revokePreviewURL(preview)
  }
  for (const ref of referenceImages.value) revokePreviewURL(ref.preview)
  turns.value = []
  referenceImages.value = []
  closeLightbox()
}

function historyTurnToTurn(historyTurn: HistoryTurn): Turn {
  return {
    id: historyTurn.id,
    prompt: historyTurn.prompt,
    model: historyTurn.model,
    provider: historyTurn.provider ?? providerForModelID(historyTurn.model),
    size: historyTurn.size,
    aspectRatio: historyTurn.aspectRatio,
    imageSize: historyTurn.imageSize,
    quality: historyTurn.quality,
    n: historyTurn.n,
    mode: historyTurn.mode,
    referenceImages: historyTurn.referenceImages.map((ref) => ({ url: ref.url || ref.preview })),
    referencePreviews: [...historyTurn.referencePreviews],
    status: 'success',
    startedAt: historyTurn.createdAt,
    finishedAt: historyTurn.createdAt + historyTurn.elapsedSeconds * 1000,
    results: historyTurn.results.map((image, index) => storedImageToResult(historyTurn.id, image, index))
  }
}

function restoreHistoryRecord(record: HistoryRecord) {
  releaseConversation()
  conversationId.value = record.id
  turns.value = record.turns.map((turn) => historyTurnToTurn(turn))
  setAutoReferencesFromResults(turns.value.at(-1)?.results ?? [])
  prompt.value = ''
  scrollToBottom()
}

function startNewConversation() {
  if (isGenerating.value) return
  releaseConversation()
  conversationId.value = createConversationId()
  prompt.value = ''
  promptInput.value?.focus()
}

async function runTurn(turn: Turn) {
  const key = selectedKey.value
  if (!key) {
    turn.status = 'error'
    turn.error = imageText('keyMissing')
    return
  }

  turn.status = 'running'
  turn.error = undefined
  turn.startedAt = Date.now()
  turn.finishedAt = undefined
  ensureTicker()
  scrollToBottom()

  const controller = new AbortController()
  activeController = controller
  try {
    const data = await generateImages(
      key.key,
      {
        prompt: turn.prompt,
        model: turn.model,
        provider: turn.provider,
        n: turn.n,
        size: turn.size,
        aspectRatio: turn.aspectRatio,
        imageSize: turn.imageSize,
        quality: turn.quality,
        referenceImages: turn.referenceImages
      },
      controller.signal
    )
    releaseResults(turn)
    turn.results = toResults(turn.id, data)
    turn.finishedAt = Date.now()
    turn.status = 'success'
    setAutoReferencesFromResults(turn.results)
    void saveTurnToHistory(turn)
  } catch (error) {
    if (controller.signal.aborted) return
    turn.status = 'error'
    turn.error = error instanceof Error ? error.message : String(error)
  } finally {
    turn.finishedAt = turn.finishedAt ?? Date.now()
    if (activeController === controller) activeController = null
    scrollToBottom()
  }
}

async function onSubmit() {
  if (isGenerating.value) return
  const trimmedPrompt = prompt.value.trim()
  if (!trimmedPrompt) {
    appStore.showError(imageText('promptRequired'))
    return
  }
  if (!selectedKey.value) {
    appStore.showError(imageText('keyMissing'))
    settingsOpen.value = true
    return
  }
  const selectedModel = model.value.trim()
  if (!selectedModel) {
    appStore.showError(imageText('modelRequired'))
    settingsOpen.value = true
    return
  }
  if (sizeValidationError.value) {
    appStore.showError(sizeValidationError.value)
    settingsOpen.value = true
    return
  }

  const isEdit = referenceImages.value.length > 0
  const turn: Turn = {
    id: `turn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    prompt: trimmedPrompt,
    model: selectedModel,
    provider: selectedImageProvider.value,
    size: size.value,
    aspectRatio: geminiAspectRatio.value,
    imageSize: geminiImageSize.value,
    quality: quality.value,
    n: count.value,
    mode: isEdit ? 'edit' : 'generate',
    referenceImages: referenceImages.value.map((ref) => ({
      file: ref.file,
      url: ref.url
    })),
    referencePreviews: referenceImages.value.map((ref) => ref.preview),
    status: 'running',
    startedAt: Date.now(),
    results: []
  }
  turns.value.push(turn)
  const reactiveTurn = turns.value[turns.value.length - 1]
  // 提交后清空输入框（参考图沿用到本轮，clear composer 引用而不回收 URL）
  prompt.value = ''
  referenceImages.value = []
  await runTurn(reactiveTurn)
}

async function retryTurn(turn: Turn) {
  if (isGenerating.value) return
  await runTurn(turn)
}

function releaseResults(turn: Turn) {
  for (const result of turn.results) {
    if (result.src.startsWith('blob:')) URL.revokeObjectURL(result.src)
  }
  turn.results = []
}

function removeTurn(turnId: string) {
  const index = turns.value.findIndex((turn) => turn.id === turnId)
  if (index === -1) return
  const [removed] = turns.value.splice(index, 1)
  if (lightbox.value?.turnId === turnId) closeLightbox()
  releaseResults(removed)
  // 参考图预览 URL 可能仍被 composer 或其他 turn 复用，确认无引用后才回收
  const inUse = new Set(referenceImages.value.map((ref) => ref.preview))
  for (const turn of turns.value) {
    for (const preview of turn.referencePreviews) inUse.add(preview)
  }
  for (const preview of removed.referencePreviews) {
    if (!inUse.has(preview)) revokePreviewURL(preview)
  }
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  link.click()
  window.setTimeout(() => URL.revokeObjectURL(url), 0)
}

async function downloadResult(turn: Turn, result: GeneratedResult, index: number) {
  const filename = `${turn.model}-${turn.id}-${index + 1}.png`
  if (result.blob) {
    downloadBlob(result.blob, filename)
    return
  }
  if (!result.remoteUrl) return
  try {
    const response = await fetch(result.remoteUrl)
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    downloadBlob(await response.blob(), filename)
  } catch {
    window.open(result.remoteUrl, '_blank', 'noopener')
  }
}

// ---- Lightbox ----
const lightbox = ref<{ turnId: string; index: number } | null>(null)

const lightboxTurn = computed(
  () => turns.value.find((turn) => turn.id === lightbox.value?.turnId) ?? null
)
const lightboxResults = computed(() => lightboxTurn.value?.results ?? [])
const lightboxResult = computed(() =>
  lightbox.value ? (lightboxResults.value[lightbox.value.index] ?? null) : null
)

function openLightbox(turn: Turn, index: number) {
  lightbox.value = { turnId: turn.id, index }
}

function closeLightbox() {
  lightbox.value = null
}

function stepLightbox(step: number) {
  if (!lightbox.value || lightboxResults.value.length === 0) return
  const total = lightboxResults.value.length
  lightbox.value = {
    ...lightbox.value,
    index: (lightbox.value.index + step + total) % total
  }
}

function onKeydown(event: KeyboardEvent) {
  if (lightbox.value) {
    if (event.key === 'Escape') closeLightbox()
    else if (event.key === 'ArrowLeft') stepLightbox(-1)
    else if (event.key === 'ArrowRight') stepLightbox(1)
    return
  }
  if (event.key === 'Escape' && settingsOpen.value) settingsOpen.value = false
}

function onDocumentClick(event: MouseEvent) {
  if (!settingsOpen.value) return
  if (settingsWrap.value && !settingsWrap.value.contains(event.target as Node)) {
    settingsOpen.value = false
  }
}

// ---- Lifecycle ----
onMounted(() => {
  loadPrefs()
  void loadKeys()
  void loadHistoryRecords()
  window.addEventListener('keydown', onKeydown)
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('paste', onDocumentPaste)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKeydown)
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('paste', onDocumentPaste)
  activeController?.abort()
  modelListController?.abort()
  if (tickTimer != null) clearInterval(tickTimer)
  for (const turn of turns.value) {
    releaseResults(turn)
    for (const preview of turn.referencePreviews) revokePreviewURL(preview)
  }
  for (const ref of referenceImages.value) revokePreviewURL(ref.preview)
})
</script>
