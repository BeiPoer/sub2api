<template>
  <AppLayout>
    <div class="w-full xl:h-[calc(100vh-8rem)] xl:min-h-0 xl:overflow-hidden">
      <div class="grid grid-cols-1 gap-3 xl:h-full xl:min-h-0 xl:grid-cols-[minmax(300px,360px)_minmax(0,1fr)_minmax(240px,280px)]">
        <section class="card space-y-3 p-3 xl:h-full xl:min-h-0 xl:overflow-y-auto">
          <div class="space-y-1.5">
            <label class="input-label">{{ t('imageGeneration.form.apiKey') }}</label>
            <Select
              v-model="selectedKeyId"
              :options="keyOptions"
              :disabled="loadingKeys || submitting || eligibleKeys.length === 0"
              searchable
              :placeholder="loadingKeys ? t('common.loading') + '...' : t('imageGeneration.form.apiKeyPlaceholder')"
            >
              <template #selected="{ option }">
                <span v-if="option">
                  {{ String(option.label) }}
                </span>
                <span v-else class="text-gray-400">
                  {{ t('imageGeneration.form.apiKeyPlaceholder') }}
                </span>
              </template>
            </Select>
            <p
              v-if="eligibleKeys.length === 0 && !loadingKeys"
              class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
            >
              {{ t('imageGeneration.noEligibleKeys') }}
            </p>
          </div>

          <div class="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div class="space-y-1.5">
              <label class="input-label">{{ t('imageGeneration.form.mode') }}</label>
              <Select
                v-model="mode"
                :options="modeOptions"
                :disabled="submitting"
              />
            </div>

            <div class="space-y-1.5">
              <label class="input-label">{{ t('imageGeneration.form.responseModel') }}</label>
              <Select
                v-model="responseModel"
                :options="responseModelOptions"
                :disabled="submitting || loadingModels || responseModelOptions.length === 0"
                searchable
                :placeholder="modelSelectPlaceholder"
              />
            </div>

            <div class="space-y-1.5">
              <label class="input-label">{{ t('imageGeneration.form.imageModel') }}</label>
              <Select
                v-model="model"
                :options="imageModelOptions"
                :disabled="submitting || loadingModels || imageModelOptions.length === 0"
                searchable
                :placeholder="modelSelectPlaceholder"
              />
            </div>
          </div>

          <p
            v-if="modelLoadMessage"
            class="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300"
          >
            {{ modelLoadMessage }}
          </p>

          <TextArea
            v-model="prompt"
            :label="t('imageGeneration.form.prompt')"
            :placeholder="t(promptPlaceholderKey)"
            :hint="t(promptHintKey)"
            :disabled="submitting"
            rows="3"
          />

          <div
            v-if="mode !== 'generate'"
            class="space-y-4 rounded-2xl border border-gray-200 bg-gray-50 p-4 dark:border-dark-700 dark:bg-dark-900/40"
          >
            <div class="space-y-2">
              <div class="flex items-center justify-between gap-3">
                <div>
                  <div class="text-sm font-medium text-gray-900 dark:text-white">
                    {{ t(sourceImagesLabelKey) }}
                  </div>
                  <p class="text-xs text-gray-500 dark:text-gray-400">
                    {{ t(sourceImagesHintKey) }}
                  </p>
                </div>
                <label class="btn btn-secondary btn-sm cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    :multiple="mode === 'edit'"
                    class="hidden"
                    :disabled="submitting"
                    @change="handleSourceImagesChange"
                  />
                  <Icon name="plus" size="sm" class="mr-1.5" />
                  {{ t('imageGeneration.form.addImages') }}
                </label>
              </div>

              <div
                v-if="sourceImagePreviews.length > 0"
                class="grid grid-cols-2 gap-3 sm:grid-cols-3"
              >
                <div
                  v-for="preview in sourceImagePreviews"
                  :key="preview.id"
                  class="group relative overflow-hidden rounded-2xl border border-gray-200 bg-white dark:border-dark-600 dark:bg-dark-800"
                >
                  <img
                    :src="preview.url"
                    :alt="preview.file.name"
                    class="h-20 w-full cursor-pointer object-cover"
                    @click="openPreview(preview.url, preview.file.name)"
                  />
                  <div class="flex items-center justify-between gap-2 border-t border-gray-100 px-3 py-2 text-xs dark:border-dark-600">
                    <span class="truncate text-gray-600 dark:text-gray-300">{{ preview.file.name }}</span>
                    <button
                      type="button"
                      class="text-red-500 transition hover:text-red-600"
                      :title="t('common.remove')"
                      :disabled="submitting"
                      @click="removeSourceImage(preview.id)"
                    >
                      <Icon name="trash" size="sm" />
                    </button>
                  </div>
                </div>
              </div>

              <div
                v-else
                class="rounded-2xl border border-dashed border-gray-300 px-4 py-6 text-center text-sm text-gray-500 dark:border-dark-600 dark:text-gray-400"
              >
                {{ t('imageGeneration.form.noSourceImages') }}
              </div>
            </div>

            <Teleport to="body" :disabled="!maskEditorExpanded">
              <div
                v-if="mode === 'mask' && primarySourceImage"
                ref="maskEditorPanelRef"
                :class="maskEditorPanelClass"
              >
                <div class="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div class="text-sm font-medium text-gray-900 dark:text-white">
                      {{ t('imageGeneration.form.maskEditor') }}
                    </div>
                    <p class="text-xs text-gray-500 dark:text-gray-400">
                      {{ t('imageGeneration.form.maskEditorHint') }}
                    </p>
                  </div>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    @click="toggleMaskEditorFullscreen"
                  >
                    <Icon name="eye" size="sm" class="mr-1.5" />
                    {{ maskEditorExpanded ? t('imageGeneration.form.exitMaskEditorFullscreen') : t('imageGeneration.form.expandMaskEditor') }}
                  </button>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    v-for="tool in maskToolOptions"
                    :key="tool.value"
                    type="button"
                    class="btn btn-sm"
                    :class="maskTool === tool.value ? 'btn-primary' : 'btn-secondary'"
                    @click="setMaskTool(tool.value)"
                  >
                    {{ tool.label }}
                  </button>
                  <div class="flex min-w-[180px] items-center gap-2 rounded-xl border border-gray-200 bg-white px-3 py-1.5 text-xs text-gray-600 dark:border-dark-600 dark:bg-dark-800 dark:text-gray-300">
                    <span class="whitespace-nowrap">{{ t('imageGeneration.form.brushSize') }}</span>
                    <input
                      v-model.number="maskBrushSize"
                      type="range"
                      min="4"
                      max="120"
                      step="1"
                      class="min-w-0 flex-1 accent-primary-600"
                    />
                    <span class="w-8 text-right">{{ maskBrushSize }}</span>
                  </div>
                </div>

                <div class="flex flex-wrap items-center gap-2">
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    :disabled="maskUndoStackSize === 0"
                    @click="undoMaskDrawing"
                  >
                    <Icon name="refresh" size="sm" class="mr-1.5" />
                    {{ t('imageGeneration.form.undoMask') }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm text-red-600 dark:text-red-400"
                    :disabled="!maskHasDrawing"
                    @click="clearMaskDrawing"
                  >
                    <Icon name="trash" size="sm" class="mr-1.5" />
                    {{ t('imageGeneration.form.clearMask') }}
                  </button>
                  <button
                    type="button"
                    class="btn btn-secondary btn-sm"
                    :disabled="!maskHasDrawing"
                    @click="previewMask"
                  >
                    <Icon name="eye" size="sm" class="mr-1.5" />
                    {{ t('imageGeneration.form.previewMask') }}
                  </button>
                </div>

                <div :class="maskCanvasFrameClass">
                  <div class="relative min-w-full">
                    <canvas
                      ref="maskBaseCanvasRef"
                      :width="maskCanvasWidth"
                      :height="maskCanvasHeight"
                      class="block h-auto w-full"
                    />
                    <canvas
                      ref="maskDrawingCanvasRef"
                      :width="maskCanvasWidth"
                      :height="maskCanvasHeight"
                      class="absolute inset-0 h-full w-full touch-none cursor-crosshair"
                      @pointerdown="handleMaskPointerDown"
                      @pointermove="handleMaskPointerMove"
                      @pointerup="handleMaskPointerUp"
                      @pointercancel="handleMaskPointerUp"
                      @pointerleave="handleMaskPointerLeave"
                    />
                  </div>
                </div>
              </div>
            </Teleport>

            <div
              v-if="mode === 'mask' && !primarySourceImage"
              class="rounded-2xl border border-dashed border-gray-300 px-4 py-4 text-center text-sm text-gray-500 dark:border-dark-600 dark:text-gray-400"
            >
              {{ t('imageGeneration.form.maskEditorNeedsSource') }}
            </div>
          </div>

          <div class="grid grid-cols-1 gap-3">
            <div class="space-y-1.5">
              <label class="input-label">{{ t('imageGeneration.form.size') }}</label>
              <Select
                v-model="size"
                :options="sizeOptions"
                :disabled="submitting"
                searchable
              />
            </div>

            <div
              v-if="isCustomSizeSelected"
              class="grid grid-cols-1 gap-3 rounded-2xl border border-gray-200 bg-white p-3 dark:border-dark-700 dark:bg-dark-900/30 sm:grid-cols-2"
            >
              <div class="flex items-center gap-1 sm:col-span-2">
                <label class="input-label mb-0">{{ t('imageGeneration.form.customSize') }}</label>
                <HelpTooltip width-class="w-96">
                  <template #trigger>
                    <Icon
                      name="questionCircle"
                      size="sm"
                      class="cursor-help text-gray-400 transition-colors hover:text-primary-500 dark:text-gray-500 dark:hover:text-primary-400"
                    />
                  </template>
                  <div class="space-y-1.5">
                    <div class="font-semibold">{{ t('imageGeneration.form.customSizeHelpTitle') }}</div>
                    <ul class="list-disc space-y-1 pl-4">
                      <li>{{ t('imageGeneration.form.customSizeHelpMaxEdge') }}</li>
                      <li>{{ t('imageGeneration.form.customSizeHelpMultiple') }}</li>
                      <li>{{ t('imageGeneration.form.customSizeHelpRatio') }}</li>
                      <li>{{ t('imageGeneration.form.customSizeHelpPixels') }}</li>
                    </ul>
                  </div>
                </HelpTooltip>
              </div>

              <div class="space-y-1.5">
                <label class="input-label">{{ t('imageGeneration.form.customSizeWidth') }}</label>
                <input
                  v-model="customSizeWidth"
                  type="number"
                  min="16"
                  max="3840"
                  step="16"
                  class="input w-full transition-all duration-200"
                  :placeholder="t('imageGeneration.form.customSizeWidthPlaceholder')"
                  :disabled="submitting"
                />
              </div>

              <div class="space-y-1.5">
                <label class="input-label">{{ t('imageGeneration.form.customSizeHeight') }}</label>
                <input
                  v-model="customSizeHeight"
                  type="number"
                  min="16"
                  max="3840"
                  step="16"
                  class="input w-full transition-all duration-200"
                  :placeholder="t('imageGeneration.form.customSizeHeightPlaceholder')"
                  :disabled="submitting"
                />
              </div>
            </div>

          </div>

          <div class="rounded-2xl border border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-900/30">
            <button
              type="button"
              class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left"
              @click="advancedOpen = !advancedOpen"
            >
              <div>
                <div class="text-sm font-medium text-gray-900 dark:text-white">
                  {{ t('imageGeneration.form.advanced') }}
                </div>
                <p class="text-xs text-gray-500 dark:text-gray-400">
                  {{ t('imageGeneration.form.advancedHint') }}
                </p>
              </div>
              <Icon
                name="chevronDown"
                size="sm"
                class="text-gray-400 transition-transform"
                :class="advancedOpen ? 'rotate-180' : ''"
              />
            </button>

            <div
              v-if="advancedOpen"
              class="grid grid-cols-1 gap-3 border-t border-gray-100 px-4 py-3 sm:grid-cols-2 dark:border-dark-700"
            >
              <div class="space-y-1.5">
                <label class="input-label">{{ t('imageGeneration.form.quality') }}</label>
                <Select
                  v-model="quality"
                  :options="qualityOptions"
                  :disabled="submitting"
                />
              </div>

              <div class="space-y-1.5">
                <label class="input-label">{{ t('imageGeneration.form.background') }}</label>
                <Select
                  v-model="background"
                  :options="backgroundOptions"
                  :disabled="submitting"
                />
              </div>

              <div class="space-y-1.5">
                <label class="input-label">{{ t('imageGeneration.form.outputFormat') }}</label>
                <Select
                  v-model="outputFormat"
                  :options="outputFormatOptions"
                  :disabled="submitting"
                />
              </div>

              <div class="space-y-1.5">
                <div class="flex items-center gap-1">
                  <label class="input-label mb-0">{{ t('imageGeneration.form.outputCompression') }}</label>
                  <HelpTooltip
                    :content="t('imageGeneration.form.outputCompressionHelp')"
                    width-class="w-80"
                  >
                    <template #trigger>
                      <Icon
                        name="questionCircle"
                        size="sm"
                        class="cursor-help text-gray-400 transition-colors hover:text-primary-500 dark:text-gray-500 dark:hover:text-primary-400"
                      />
                    </template>
                  </HelpTooltip>
                </div>
                <input
                  v-model="outputCompression"
                  type="number"
                  min="0"
                  max="100"
                  class="input w-full transition-all duration-200"
                  :placeholder="t('imageGeneration.form.outputCompressionPlaceholder')"
                  :disabled="submitting"
                />
              </div>

            </div>
          </div>

          <div class="flex flex-wrap items-center justify-end gap-3">
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="submitting || !hasDirtyResult"
              @click="clearCachedResult"
            >
              <Icon name="trash" size="sm" class="mr-1.5" />
              {{ t('imageGeneration.actions.clearCache') }}
            </button>
            <button
              type="button"
              class="btn btn-secondary"
              :disabled="submitting"
              @click="resetForm"
            >
              <Icon name="refresh" size="sm" class="mr-1.5" />
              {{ t('imageGeneration.actions.resetForm') }}
            </button>
            <button
              type="button"
              :class="submitting ? 'btn btn-secondary' : 'btn btn-primary'"
              :disabled="submitDisabled"
              @click="submitting ? cancelGeneration() : submitGeneration()"
            >
              <Icon
                :name="submitting ? 'x' : 'sparkles'"
                size="sm"
                class="mr-1.5"
              />
              {{ submitting ? t('imageGeneration.actions.cancel') : t('imageGeneration.actions.generate') }}
            </button>
          </div>
        </section>

        <section class="card min-h-[360px] space-y-3 p-3 xl:h-full xl:min-h-0 xl:overflow-y-auto">
          <div class="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t('imageGeneration.result.title') }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ resultSummaryText }}
              </p>
            </div>

            <div
              v-if="!submitting && resultImages.length > 0"
              class="flex flex-wrap items-center gap-2"
            >
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                @click="copyAllImageLinks"
              >
                <Icon name="link" size="sm" class="mr-1.5" />
                {{ t('imageGeneration.result.copyAll') }}
              </button>
              <button
                type="button"
                class="btn btn-secondary btn-sm"
                @click="downloadAllImages"
              >
                <Icon name="link" size="sm" class="mr-1.5" />
                {{ t('imageGeneration.result.downloadAll') }}
              </button>
            </div>
          </div>

          <div
            v-if="submitting && resultImages.length === 0"
            class="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-primary-200 bg-primary-50/60 px-6 py-8 text-center dark:border-primary-800 dark:bg-primary-900/10"
          >
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-primary-100 text-primary-600 dark:bg-primary-900/30 dark:text-primary-300">
              <Icon name="refresh" size="lg" class="animate-spin" />
            </div>
            <div>
              <div class="text-base font-medium text-gray-900 dark:text-white">
                {{ t('imageGeneration.result.generating') }}
              </div>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ t('imageGeneration.result.generatingHint') }}
              </p>
            </div>
          </div>

          <div
            v-else-if="submitError"
            class="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-red-200 bg-red-50 px-6 py-8 text-center dark:border-red-500/20 dark:bg-red-500/10"
          >
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-red-100 text-red-500 dark:bg-red-500/20 dark:text-red-300">
              <Icon name="x" size="lg" />
            </div>
            <div class="space-y-1">
              <div class="text-base font-medium text-red-700 dark:text-red-300">
                {{ t('imageGeneration.result.failed') }}
              </div>
              <p class="max-w-xl text-sm text-red-600/90 dark:text-red-200">
                {{ submitError }}
              </p>
            </div>
          </div>

          <div
            v-else-if="resultImages.length === 0"
            class="flex min-h-[260px] flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-6 py-8 text-center dark:border-dark-600 dark:bg-dark-900/30"
          >
            <div class="flex h-14 w-14 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-dark-800 dark:text-gray-300">
              <Icon name="sparkles" size="lg" />
            </div>
            <div>
              <div class="text-base font-medium text-gray-900 dark:text-white">
                {{ t('imageGeneration.result.emptyTitle') }}
              </div>
              <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                {{ t('imageGeneration.result.emptyDescription') }}
              </p>
            </div>
          </div>

          <div v-else class="space-y-4">
            <div
              v-if="submitting"
              class="flex items-center gap-2 rounded-2xl border border-primary-200 bg-primary-50/70 px-4 py-3 text-sm text-primary-700 dark:border-primary-800 dark:bg-primary-900/20 dark:text-primary-300"
            >
              <Icon name="refresh" size="sm" class="animate-spin" />
              <span>{{ t('imageGeneration.result.streamingSummary', { count: resultImages.length }) }}</span>
            </div>

            <div
              class="grid grid-cols-1 gap-4 lg:grid-cols-2"
            >
              <article
                v-for="(image, index) in resultImages"
                :key="`${image.url}-${index}`"
                class="overflow-hidden rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-800"
              >
                <button
                  type="button"
                  class="block w-full bg-gray-50 dark:bg-dark-900/20"
                  @click="openPreview(image.url, image.fileName)"
                >
                  <img
                    :src="image.url"
                    :alt="`generated-image-${index + 1}`"
                    class="max-h-[420px] w-full object-contain"
                  />
                </button>

                <div class="space-y-3 border-t border-gray-100 p-4 dark:border-dark-700">
                  <div class="flex items-center justify-between gap-3">
                    <div class="min-w-0">
                      <div class="truncate text-sm font-medium text-gray-900 dark:text-white">
                        {{ image.fileName }}
                      </div>
                      <div class="text-xs text-gray-500 dark:text-gray-400">
                        {{ image.mimeType }}
                      </div>
                    </div>
                    <span class="rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-dark-700 dark:text-gray-300">
                      #{{ index + 1 }}
                    </span>
                  </div>

                  <div
                    v-if="image.isPartial"
                    class="rounded-xl bg-primary-50 px-3 py-2 text-xs text-primary-700 dark:bg-primary-900/20 dark:text-primary-300"
                  >
                    {{ t('imageGeneration.result.partialBadge') }}
                  </div>

                  <p
                    v-if="image.revisedPrompt"
                    class="rounded-xl bg-gray-50 px-3 py-2 text-xs leading-5 text-gray-600 dark:bg-dark-900/40 dark:text-gray-300"
                  >
                    {{ image.revisedPrompt }}
                  </p>

                  <div class="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      :disabled="submitting || image.isPartial"
                      @click="downloadImage(image, index)"
                    >
                      <Icon name="link" size="sm" class="mr-1.5" />
                      {{ t('imageGeneration.result.download') }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      :disabled="submitting || image.isPartial"
                      @click="copyImageLink(image)"
                    >
                      <Icon name="link" size="sm" class="mr-1.5" />
                      {{ t('imageGeneration.result.copyLink') }}
                    </button>
                    <button
                      type="button"
                      class="btn btn-secondary btn-sm"
                      @click="openPreview(image.url, image.fileName)"
                    >
                      <Icon name="eye" size="sm" class="mr-1.5" />
                      {{ t('imageGeneration.result.preview') }}
                    </button>
                  </div>
                </div>
              </article>
            </div>
          </div>
        </section>

        <section class="card space-y-3 p-3 xl:h-full xl:min-h-0 xl:overflow-y-auto">
          <div class="flex items-start justify-between gap-3">
            <div>
              <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                {{ t('imageGeneration.history.title') }}
              </h2>
              <p class="text-sm text-gray-500 dark:text-gray-400">
                {{ t('imageGeneration.history.summary', { count: imageHistory.length, max: HISTORY_LIMIT }) }}
              </p>
            </div>
            <span class="rounded-full bg-gray-100 px-2.5 py-1 text-xs text-gray-600 dark:bg-dark-800 dark:text-gray-300">
              {{ imageHistory.length }}/{{ HISTORY_LIMIT }}
            </span>
          </div>

          <div
            v-if="imageHistory.length === 0"
            class="flex min-h-[180px] flex-col items-center justify-center gap-3 rounded-2xl border border-dashed border-gray-300 bg-gray-50 px-4 py-6 text-center dark:border-dark-600 dark:bg-dark-900/30"
          >
            <div class="flex h-12 w-12 items-center justify-center rounded-full bg-gray-100 text-gray-500 dark:bg-dark-800 dark:text-gray-300">
              <Icon name="clock" size="lg" />
            </div>
            <div>
              <div class="text-sm font-medium text-gray-900 dark:text-white">
                {{ t('imageGeneration.history.emptyTitle') }}
              </div>
              <p class="mt-1 text-xs text-gray-500 dark:text-gray-400">
                {{ t('imageGeneration.history.emptyDescription') }}
              </p>
            </div>
          </div>

          <div
            v-else
            class="space-y-3 xl:max-h-[calc(100vh-12rem)] xl:overflow-y-auto xl:pr-1"
          >
            <button
              v-for="entry in imageHistory"
              :key="entry.id"
              type="button"
              class="w-full rounded-2xl border p-3 text-left transition hover:border-primary-300 hover:bg-primary-50/50 dark:hover:border-primary-700 dark:hover:bg-primary-900/10"
              :class="activeHistoryId === entry.id ? 'border-primary-300 bg-primary-50/70 dark:border-primary-700 dark:bg-primary-900/20' : 'border-gray-200 bg-white dark:border-dark-700 dark:bg-dark-900/30'"
              @click="restoreHistoryEntry(entry)"
            >
              <div class="flex items-start justify-between gap-3">
                <div class="min-w-0">
                  <div class="truncate text-sm font-medium text-gray-900 dark:text-white">
                    {{ formatHistoryTime(entry.savedAt) }}
                  </div>
                  <div class="mt-1 truncate text-xs text-gray-500 dark:text-gray-400">
                    {{ formatHistoryMeta(entry) }}
                  </div>
                </div>
                <span class="shrink-0 rounded-full bg-gray-100 px-2 py-1 text-xs text-gray-600 dark:bg-dark-800 dark:text-gray-300">
                  {{ t('imageGeneration.history.imageCount', { count: entry.results.length }) }}
                </span>
              </div>

              <p class="mt-2 truncate text-xs leading-5 text-gray-600 dark:text-gray-300">
                {{ entry.form.prompt || t('imageGeneration.history.emptyPrompt') }}
              </p>

              <div class="mt-3 grid grid-cols-4 gap-2">
                <div
                  v-for="(image, index) in entry.results.slice(0, 4)"
                  :key="`${entry.id}-${image.url}-${index}`"
                  class="relative overflow-hidden rounded-xl border border-gray-100 bg-gray-50 dark:border-dark-700 dark:bg-dark-800"
                >
                  <img
                    :src="image.url"
                    :alt="`history-image-${index + 1}`"
                    class="h-12 w-full object-cover"
                  />
                  <div
                    v-if="index === 3 && entry.results.length > 4"
                    class="absolute inset-0 flex items-center justify-center bg-black/50 text-xs font-medium text-white"
                  >
                    +{{ entry.results.length - 4 }}
                  </div>
                </div>
              </div>
            </button>
          </div>
        </section>
      </div>

      <Teleport to="body">
        <Transition name="fade">
          <div
            v-if="previewImageUrl"
            class="fixed inset-0 z-[100] flex items-center justify-center overflow-hidden bg-black/80 p-4"
            @click.self="closePreview"
            @wheel.prevent="handlePreviewWheel"
          >
            <button
              type="button"
              class="absolute right-4 top-4 rounded-full bg-black/50 p-2 text-white transition-colors hover:bg-black/70"
              @click="closePreview"
            >
              <Icon name="x" size="lg" />
            </button>
            <div
              v-if="previewImageTitle"
              class="absolute left-4 top-4 max-w-[calc(100vw-6rem)] truncate rounded-full bg-black/50 px-3 py-1 text-sm text-white"
            >
              {{ previewImageTitle }}
            </div>
            <img
              ref="previewImageRef"
              :src="previewImageUrl"
              :alt="previewImageTitle || 'preview'"
              class="max-h-[90vh] max-w-[90vw] rounded-lg object-contain shadow-2xl will-change-transform"
              :style="previewImageStyle"
              @pointerdown="handlePreviewPointerDown"
              @pointermove="handlePreviewPointerMove"
              @pointerup="finishPreviewDrag"
              @pointercancel="finishPreviewDrag"
              @lostpointercapture="finishPreviewDrag"
              @dragstart.prevent
            />
          </div>
        </Transition>
      </Teleport>

      <ConfirmDialog
        :show="clearHistoryConfirmOpen"
        :title="t('imageGeneration.history.clearConfirmTitle')"
        :message="t('imageGeneration.history.clearConfirmMessage')"
        :confirm-text="t('imageGeneration.history.clearConfirmButton')"
        danger
        @confirm="confirmClearCachedResult"
        @cancel="clearHistoryConfirmOpen = false"
      />
    </div>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, watch } from 'vue'
import type { CSSProperties } from 'vue'
import { useI18n } from 'vue-i18n'
import { keysAPI } from '@/api/keys'
import type { ApiKey } from '@/types'
import AppLayout from '@/components/layout/AppLayout.vue'
import ConfirmDialog from '@/components/common/ConfirmDialog.vue'
import HelpTooltip from '@/components/common/HelpTooltip.vue'
import Select from '@/components/common/Select.vue'
import TextArea from '@/components/common/TextArea.vue'
import { Icon } from '@/components/icons'
import { useAppStore } from '@/stores/app'
import { extractApiErrorMessage } from '@/utils/apiError'

type ImageMode = 'generate' | 'edit' | 'mask'
type MaskTool = 'brush' | 'circle' | 'rectangle' | 'eraser'

interface CanvasPoint {
  x: number
  y: number
}

interface CachedImageGenerationAdvancedSettings {
  quality: string
  background: string
  outputFormat: string
  outputCompression: string
  advancedOpen: boolean
}

interface LocalImagePreview {
  id: string
  file: File
  url: string
}

interface ResultImage {
  url: string
  mimeType: string
  fileName: string
  revisedPrompt?: string
  isPartial?: boolean
}

interface CachedImageGenerationForm {
  mode: ImageMode
  prompt: string
  responseModel: string
  model: string
  size: string
  customSizeWidth: string
  customSizeHeight: string
  n: string
  quality: string
  background: string
  outputFormat: string
  outputCompression: string
  advancedOpen: boolean
}

interface CachedImageGenerationResult {
  version: 1
  savedAt: string
  selectedKeyId: number | null
  form: CachedImageGenerationForm
  results: ResultImage[]
}

interface ImageGenerationHistoryEntry extends CachedImageGenerationResult {
  id: string
}

interface ImageGenerationStreamError {
  message?: string
  code?: string
  type?: string
}

interface ImageGenerationStreamImageItem {
  id?: string
  type?: string
  result?: string
  b64_json?: string
  url?: string
  revised_prompt?: string
  revisedPrompt?: string
  output_format?: string
}

interface ImageGenerationStreamResponse {
  output?: ImageGenerationStreamImageItem[]
  error?: ImageGenerationStreamError
}

interface ImageGenerationStreamPayload {
  type?: string
  result?: string
  url?: string
  b64_json?: string
  partial_image_b64?: string
  partial_image?: string
  revised_prompt?: string
  revisedPrompt?: string
  partial_image_index?: number
  output_format?: string
  error?: ImageGenerationStreamError
  response?: ImageGenerationStreamResponse
  item?: ImageGenerationStreamImageItem
}

interface StreamImageCandidate {
  key: string
  index?: number
  url?: string
  b64?: string
  revisedPrompt?: string
  outputFormat?: string
}

interface OpenAIModelItem {
  id?: string
  display_name?: string
  displayName?: string
  type?: string
  object?: string
}

const LEGACY_LOCAL_CACHE_KEY = 'sub2api:last-image-generation-result'
const HISTORY_CACHE_KEY = 'sub2api:image-generation-history'
const HISTORY_DB_NAME = 'sub2api-image-generation'
const HISTORY_DB_VERSION = 1
const HISTORY_DB_STORE = 'history'
const ADVANCED_SETTINGS_CACHE_KEY = 'sub2api:image-generation-advanced-settings'
const SELECTED_KEY_CACHE_KEY = 'sub2api:image-generation-selected-key'
const HISTORY_LIMIT = 10
const FIXED_PARTIAL_IMAGES = 0
const DEFAULT_RESPONSE_MODEL = 'gpt-5.5'
const DEFAULT_MODEL = 'gpt-image-2'
const DEFAULT_SIZE = '1024x1024'
const DEFAULT_COUNT = '1'
const CUSTOM_SIZE_VALUE = 'custom'
const DEFAULT_CUSTOM_SIZE_WIDTH = '1024'
const DEFAULT_CUSTOM_SIZE_HEIGHT = '1024'
const CUSTOM_SIZE_MAX_EDGE = 3840
const CUSTOM_SIZE_MULTIPLE = 16
const CUSTOM_SIZE_MAX_RATIO = 3
const CUSTOM_SIZE_MIN_PIXELS = 655_360
const CUSTOM_SIZE_MAX_PIXELS = 8_294_400
const DEFAULT_OUTPUT_COMPRESSION = 100
const DEFAULT_INPUT_FIDELITY = 'low'
const DEFAULT_MASK_CANVAS_WIDTH = 1024
const DEFAULT_MASK_CANVAS_HEIGHT = 1024
const MAX_UNDO_STACK_SIZE = 20
const MASK_SCROLL_LOCK_CLASS = 'image-generation-mask-editor-open'
const PREVIEW_MIN_ZOOM = 0.25
const PREVIEW_MAX_ZOOM = 8
const PREVIEW_WHEEL_ZOOM_SENSITIVITY = 0.0006
const PREVIEW_MAX_WHEEL_DELTA = 180
const SUPPORTED_IMAGE_TYPES = new Set(['image/png', 'image/jpeg', 'image/webp'])
const INPUT_FIDELITY_UNSUPPORTED_IMAGE_MODELS = new Set(['gpt-image-2', 'gpt-image-1-mini'])
const SIZE_PRESET_VALUES = new Set([
  '1024x1024',
  '2048x2048',
  '2016x1344',
  '1344x2016',
  '2048x1536',
  '1536x2048',
  '2048x1152',
  '1152x2048',
  '2880x2880',
  '3504x2336',
  '2336x3504',
  '3264x2448',
  '2448x3264',
  '3840x2160',
  '2160x3840',
])

const { t, locale } = useI18n()
const appStore = useAppStore()

const loadingKeys = ref(false)
const loadingModels = ref(false)
const submitting = ref(false)
const submitError = ref('')
const modelLoadError = ref('')
const eligibleKeys = ref<ApiKey[]>([])
const responseModelOptions = ref<Array<{ value: string; label: string }>>([])
const imageModelOptions = ref<Array<{ value: string; label: string }>>([])
const resultImages = ref<ResultImage[]>([])
const previewImageUrl = ref('')
const previewImageTitle = ref('')
const previewImageRef = ref<HTMLImageElement | null>(null)
const previewImageZoom = ref(1)
const previewImageTransformOrigin = ref('50% 50%')
const previewImageOffset = ref({ x: 0, y: 0 })
const previewDragState = ref<{
  pointerId: number
  startClientX: number
  startClientY: number
  startOffsetX: number
  startOffsetY: number
} | null>(null)
const selectedKeyId = ref<number | null>(null)
const mode = ref<ImageMode>('generate')
const prompt = ref('')
const responseModel = ref(DEFAULT_RESPONSE_MODEL)
const model = ref(DEFAULT_MODEL)
const size = ref(DEFAULT_SIZE)
const customSizeWidth = ref<string | number>(DEFAULT_CUSTOM_SIZE_WIDTH)
const customSizeHeight = ref<string | number>(DEFAULT_CUSTOM_SIZE_HEIGHT)
const n = ref<string | number>(DEFAULT_COUNT)
const quality = ref('')
const background = ref('')
const outputFormat = ref('')
const outputCompression = ref<string | number>('')
const advancedOpen = ref(false)
const sourceImagePreviews = ref<LocalImagePreview[]>([])
const restoredFromCache = ref(false)
const lastSavedAt = ref('')
const imageHistory = ref<ImageGenerationHistoryEntry[]>([])
const activeHistoryId = ref('')
const clearHistoryConfirmOpen = ref(false)
const maskBaseCanvasRef = ref<HTMLCanvasElement | null>(null)
const maskDrawingCanvasRef = ref<HTMLCanvasElement | null>(null)
const maskEditorPanelRef = ref<HTMLElement | null>(null)
const maskTool = ref<MaskTool>('brush')
const maskBrushSize = ref(36)
const maskCanvasWidth = ref(DEFAULT_MASK_CANVAS_WIDTH)
const maskCanvasHeight = ref(DEFAULT_MASK_CANVAS_HEIGHT)
const maskHasDrawing = ref(false)
const maskEditorExpanded = ref(false)
const maskUndoStackSize = ref(0)

let abortController: AbortController | null = null
let modelLoadRequestId = 0
let suppressRestoreWatcher = false
let maskSourceImageElement: HTMLImageElement | null = null
let maskPointerActive = false
let maskPointerId: number | null = null
let maskLastPoint: CanvasPoint | null = null
let maskShapeStartPoint: CanvasPoint | null = null
let maskShapeSnapshot: ImageData | null = null
let maskUndoStack: ImageData[] = []
let previousBodyOverflow = ''
let maskPreviewObjectUrl: string | null = null

const modeOptions = computed(() => [
  { value: 'generate', label: t('imageGeneration.form.modeGenerate') },
  { value: 'edit', label: t('imageGeneration.form.modeEdit') },
  { value: 'mask', label: t('imageGeneration.form.modeMask') },
])

const maskToolOptions = computed<Array<{ value: MaskTool; label: string }>>(() => [
  { value: 'brush', label: t('imageGeneration.form.maskToolBrush') },
  { value: 'circle', label: t('imageGeneration.form.maskToolCircle') },
  { value: 'rectangle', label: t('imageGeneration.form.maskToolRectangle') },
  { value: 'eraser', label: t('imageGeneration.form.maskToolEraser') },
])

const sizeOptions = computed(() => [
  { value: '1024x1024', label: `1k - 1:1 (1024x1024) - ${t('imageGeneration.form.sizeSquare')}` },
  { value: '2048x2048', label: `2k - 1:1 (2048x2048) - ${t('imageGeneration.form.sizeSquare')}` },
  { value: '2016x1344', label: `2k - 3:2 (2016x1344) - ${t('imageGeneration.form.sizeLandscapeLabel')}` },
  { value: '1344x2016', label: `2k - 2:3 (1344x2016) - ${t('imageGeneration.form.sizePortraitLabel')}` },
  { value: '2048x1536', label: `2k - 4:3 (2048x1536) - ${t('imageGeneration.form.sizeLandscapeLabel')}` },
  { value: '1536x2048', label: `2k - 3:4 (1536x2048) - ${t('imageGeneration.form.sizePortraitLabel')}` },
  { value: '2048x1152', label: `2k - 16:9 (2048x1152) - ${t('imageGeneration.form.sizeLandscapeLabel')}` },
  { value: '1152x2048', label: `2k - 9:16 (1152x2048) - ${t('imageGeneration.form.sizePortraitLabel')}` },
  { value: '2880x2880', label: `4k - 1:1 (2880x2880) - ${t('imageGeneration.form.sizeSquare')}` },
  { value: '3504x2336', label: `4k - 3:2 (3504x2336) - ${t('imageGeneration.form.sizeLandscapeLabel')}` },
  { value: '2336x3504', label: `4k - 2:3 (2336x3504) - ${t('imageGeneration.form.sizePortraitLabel')}` },
  { value: '3264x2448', label: `4k - 4:3 (3264x2448) - ${t('imageGeneration.form.sizeLandscapeLabel')}` },
  { value: '2448x3264', label: `4k - 3:4 (2448x3264) - ${t('imageGeneration.form.sizePortraitLabel')}` },
  { value: '3840x2160', label: `4k - 16:9 (3840x2160) - ${t('imageGeneration.form.sizeLandscapeLabel')}` },
  { value: '2160x3840', label: `4k - 9:16 (2160x3840) - ${t('imageGeneration.form.sizePortraitLabel')}` },
  { value: CUSTOM_SIZE_VALUE, label: t('imageGeneration.form.sizeCustom') },
])

const qualityOptions = computed(() => [
  { value: '', label: t('imageGeneration.form.defaultAutoOption') },
  { value: 'low', label: t('imageGeneration.form.qualityLow') },
  { value: 'medium', label: t('imageGeneration.form.qualityMedium') },
  { value: 'high', label: t('imageGeneration.form.qualityHigh') },
])

const backgroundOptions = computed(() => [
  { value: '', label: t('imageGeneration.form.defaultOption') },
  { value: 'transparent', label: t('imageGeneration.form.backgroundTransparent') },
  { value: 'opaque', label: t('imageGeneration.form.backgroundOpaque') },
  { value: 'auto', label: t('imageGeneration.form.optionAuto') },
])

const outputFormatOptions = computed(() => [
  { value: '', label: t('imageGeneration.form.defaultOption') },
  { value: 'png', label: 'png' },
  { value: 'jpeg', label: 'jpeg' },
  { value: 'webp', label: 'webp' },
])

const keyOptions = computed(() =>
  eligibleKeys.value.map((key) => ({
    value: key.id,
    label: key.group
      ? `${key.name} · ${key.group.name}`
      : key.name,
  })),
)

const selectedKey = computed(() =>
  eligibleKeys.value.find((key) => key.id === selectedKeyId.value) ?? null,
)

const primarySourceImage = computed(() => sourceImagePreviews.value[0] ?? null)
const isCustomSizeSelected = computed(() => size.value === CUSTOM_SIZE_VALUE)

const modelSelectPlaceholder = computed(() =>
  loadingModels.value
    ? `${t('common.loading')}...`
    : t('imageGeneration.form.modelSelectPlaceholder'),
)

const modelLoadMessage = computed(() => {
  if (!selectedKey.value || loadingModels.value) return ''
  if (modelLoadError.value) return modelLoadError.value
  if (responseModelOptions.value.length === 0) return t('imageGeneration.errors.noResponseModels')
  if (imageModelOptions.value.length === 0) return t('imageGeneration.errors.noImageModels')
  return ''
})

const sourceImagesHintKey = computed(() =>
  mode.value === 'mask'
    ? 'imageGeneration.form.maskSourceImagesHint'
    : 'imageGeneration.form.sourceImagesHint',
)

const sourceImagesLabelKey = computed(() =>
  mode.value === 'mask'
    ? 'imageGeneration.form.sourceImagesSingle'
    : 'imageGeneration.form.sourceImages',
)

const submitDisabled = computed(() => {
  if (!selectedKey.value || loadingKeys.value) return true
  if (submitting.value) return false
  if (loadingModels.value || modelLoadMessage.value) return true
  if (!responseModel.value || !model.value) return true
  if (!prompt.value.trim()) return true
  return mode.value !== 'generate' && sourceImagePreviews.value.length === 0
})

const promptPlaceholderKey = computed(() => {
  if (mode.value === 'generate') return 'imageGeneration.form.promptPlaceholder'
  if (mode.value === 'mask') return 'imageGeneration.form.maskPromptPlaceholder'
  return 'imageGeneration.form.editPromptPlaceholder'
})

const promptHintKey = computed(() => {
  if (mode.value === 'generate') return 'imageGeneration.form.promptHint'
  if (mode.value === 'mask') return 'imageGeneration.form.maskPromptHint'
  return 'imageGeneration.form.editPromptHint'
})

const maskEditorPanelClass = computed(() => [
  'space-y-3 rounded-2xl border border-gray-200 bg-white p-4 dark:border-dark-700 dark:bg-dark-900/95',
  maskEditorExpanded.value
    ? 'fixed inset-3 z-[90] flex min-h-0 flex-col overflow-hidden shadow-2xl sm:inset-6'
    : '',
])

const maskCanvasFrameClass = computed(() => [
  'mx-auto w-full max-w-full rounded-2xl border border-gray-200 bg-white shadow-sm dark:border-dark-600 dark:bg-dark-900',
  maskEditorExpanded.value
    ? 'min-h-0 flex-1 overflow-auto'
    : 'overflow-hidden',
])

const hasDirtyResult = computed(() =>
  resultImages.value.length > 0 || imageHistory.value.length > 0 || restoredFromCache.value,
)

const resultSummaryText = computed(() => {
  if (submitting.value) {
    return resultImages.value.length > 0
      ? t('imageGeneration.result.streamingSummary', { count: resultImages.value.length })
      : t('imageGeneration.result.pendingSummary')
  }
  if (resultImages.value.length === 0) {
    return t('imageGeneration.result.emptySummary')
  }
  return restoredFromCache.value
    ? t('imageGeneration.result.cachedSummary', { count: resultImages.value.length })
    : t('imageGeneration.result.readySummary', { count: resultImages.value.length })
})

const previewImageStyle = computed<CSSProperties>(() => ({
  cursor: previewImageZoom.value > 1 ? (previewDragState.value ? 'grabbing' : 'grab') : 'default',
  transform: `translate3d(${previewImageOffset.value.x}px, ${previewImageOffset.value.y}px, 0) scale(${previewImageZoom.value})`,
  transformOrigin: previewImageTransformOrigin.value,
  userSelect: 'none',
}))

watch(mode, (value) => {
  submitError.value = ''
  if (value === 'generate') {
    clearLocalPreviews(sourceImagePreviews.value)
    sourceImagePreviews.value = []
    resetMaskEditor()
    exitMaskEditorFullscreen()
    return
  }
  if (value === 'edit') {
    resetMaskEditor()
    exitMaskEditorFullscreen()
    return
  }
  if (sourceImagePreviews.value.length > 1) {
    keepFirstSourceImageOnly(true)
  }
  if (primarySourceImage.value) {
    void loadMaskSourceImage(primarySourceImage.value)
  }
})

watch(primarySourceImage, async (preview) => {
  resetMaskEditor()
  if (mode.value !== 'mask' || !preview) return
  await loadMaskSourceImage(preview)
}, { flush: 'post' })

watch(maskEditorExpanded, (expanded) => {
  if (expanded) {
    previousBodyOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    document.body.classList.add(MASK_SCROLL_LOCK_CLASS)
    nextTick(() => renderMaskEditor())
    return
  }
  unlockMaskEditorScroll()
  nextTick(() => renderMaskEditor())
})

watch([selectedKeyId, mode, prompt, responseModel, model, size, customSizeWidth, customSizeHeight, n, quality, background, outputFormat, outputCompression, advancedOpen], () => {
  if (suppressRestoreWatcher || !restoredFromCache.value || submitting.value) {
    return
  }
  restoredFromCache.value = false
  activeHistoryId.value = ''
})

watch(selectedKeyId, (value) => {
  persistSelectedKeyId(value)
  void loadModelsForSelectedKey()
})

watch([quality, background, outputFormat, outputCompression, advancedOpen], () => {
  persistAdvancedSettings()
})

onMounted(async () => {
  restoreAdvancedSettings()
  await restoreCachedResult()
  window.addEventListener('keydown', handleGlobalKeydown)
  await loadEligibleKeys()
})

onBeforeUnmount(() => {
  modelLoadRequestId += 1
  cancelGeneration()
  window.removeEventListener('keydown', handleGlobalKeydown)
  clearLocalPreviews(sourceImagePreviews.value)
  closePreview()
  resetMaskEditor()
  exitMaskEditorFullscreen()
})

async function loadEligibleKeys() {
  loadingKeys.value = true
  try {
    const activeKeys: ApiKey[] = []
    let page = 1
    let total = 0
    do {
      const response = await keysAPI.list(page, 100, { status: 'active' })
      activeKeys.push(...response.items)
      total = response.total
      page += 1
    } while (activeKeys.length < total)

    eligibleKeys.value = activeKeys.filter((key) =>
      key.status === 'active' &&
      key.group?.platform === 'openai' &&
      key.group?.status === 'active' &&
      key.group?.subscription_type === 'standard',
    )

    if (selectedKeyId.value !== null && eligibleKeys.value.some((key) => key.id === selectedKeyId.value)) {
      persistSelectedKeyId(selectedKeyId.value)
      await loadModelsForSelectedKey()
      return
    }

    const cachedKeyId = readCachedSelectedKeyId()
    const cachedKeyAvailable = cachedKeyId !== null && eligibleKeys.value.some((key) => key.id === cachedKeyId)
    const nextKeyId = cachedKeyAvailable
      ? cachedKeyId
      : eligibleKeys.value[0]?.id ?? null
    if (selectedKeyId.value === nextKeyId) {
      persistSelectedKeyId(nextKeyId)
      await loadModelsForSelectedKey()
    } else {
      selectedKeyId.value = nextKeyId
    }
    if (!nextKeyId) {
      clearModelOptions()
    }
  } catch (error: unknown) {
    clearModelOptions()
    appStore.showError(extractApiErrorMessage(error, t('imageGeneration.errors.loadKeysFailed')))
  } finally {
    loadingKeys.value = false
  }
}

function readCachedSelectedKeyId(): number | null {
  const raw = localStorage.getItem(SELECTED_KEY_CACHE_KEY)
  if (!raw) return null
  const value = Number(raw)
  if (!Number.isSafeInteger(value)) {
    localStorage.removeItem(SELECTED_KEY_CACHE_KEY)
    return null
  }
  return value
}

function persistSelectedKeyId(value: number | null) {
  if (typeof value === 'number' && eligibleKeys.value.some((key) => key.id === value)) {
    localStorage.setItem(SELECTED_KEY_CACHE_KEY, String(value))
    return
  }
  if (value === null) {
    localStorage.removeItem(SELECTED_KEY_CACHE_KEY)
  }
}

async function loadModelsForSelectedKey() {
  const requestId = ++modelLoadRequestId
  const key = selectedKey.value
  modelLoadError.value = ''
  clearModelOptions()

  if (!key) {
    loadingModels.value = false
    return
  }

  loadingModels.value = true
  try {
    const response = await fetch('/v1/models', {
      headers: {
        Authorization: `Bearer ${key.key}`,
      },
    })
    const responseText = await response.text()
    if (!response.ok) {
      throw new Error(extractImagesErrorMessage(responseText, response.status))
    }

    let payload: unknown
    try {
      payload = responseText.trim() ? JSON.parse(responseText) : {}
    } catch {
      throw new Error(t('imageGeneration.errors.modelsLoadFailed'))
    }

    const allModels = normalizeOpenAIModelOptions(payload)
    const nextResponseModelOptions = allModels.filter((option) => !isImageGenerationModelId(option.value))
    const nextImageModelOptions = allModels.filter((option) => isImageGenerationModelId(option.value))
    if (requestId !== modelLoadRequestId) return

    responseModelOptions.value = nextResponseModelOptions
    imageModelOptions.value = nextImageModelOptions
    responseModel.value = choosePreferredModelValue(nextResponseModelOptions, responseModel.value, DEFAULT_RESPONSE_MODEL)
    model.value = choosePreferredModelValue(nextImageModelOptions, model.value, DEFAULT_MODEL)
  } catch (error: unknown) {
    if (requestId !== modelLoadRequestId) return
    clearModelOptions()
    modelLoadError.value = extractApiErrorMessage(error, t('imageGeneration.errors.modelsLoadFailed'))
  } finally {
    if (requestId === modelLoadRequestId) {
      loadingModels.value = false
    }
  }
}

function clearModelOptions() {
  responseModelOptions.value = []
  imageModelOptions.value = []
  responseModel.value = ''
  model.value = ''
}

function normalizeOpenAIModelOptions(payload: unknown): Array<{ value: string; label: string }> {
  let data: unknown[] = []
  if (isRecord(payload) && Array.isArray(payload.data)) {
    data = payload.data
  } else if (Array.isArray(payload)) {
    data = payload
  }
  const seenModelIds = new Set<string>()
  const options: Array<{ value: string; label: string }> = []

  for (const item of data) {
    const modelItem = normalizeOpenAIModelItem(item)
    if (!modelItem || seenModelIds.has(modelItem.id)) {
      continue
    }
    seenModelIds.add(modelItem.id)
    options.push({
      value: modelItem.id,
      label: modelItem.displayName && modelItem.displayName !== modelItem.id
        ? `${modelItem.displayName} (${modelItem.id})`
        : modelItem.id,
    })
  }

  return options
}

function normalizeOpenAIModelItem(value: unknown): { id: string; displayName: string } | null {
  if (typeof value === 'string') {
    const id = value.trim()
    return id ? { id, displayName: id } : null
  }
  if (!isRecord(value)) return null
  const item = value as OpenAIModelItem
  const id = trimmedStringValue(item.id)
  if (!id) return null
  return {
    id,
    displayName: trimmedStringValue(item.display_name) || trimmedStringValue(item.displayName) || id,
  }
}

function isImageGenerationModelId(value: string): boolean {
  const modelId = value.trim().toLowerCase()
  return modelId.startsWith('gpt-image-') || modelId.startsWith('chatgpt-image')
}

function choosePreferredModelValue(
  options: Array<{ value: string; label: string }>,
  currentValue: string,
  preferredValue: string,
): string {
  const optionValues = new Set(options.map((option) => option.value))
  if (currentValue && optionValues.has(currentValue)) return currentValue
  if (optionValues.has(preferredValue)) return preferredValue
  return options[0]?.value ?? ''
}

function hasModelOption(options: Array<{ value: string; label: string }>, value: string): boolean {
  return options.some((option) => option.value === value)
}

function handleSourceImagesChange(event: Event) {
  const input = event.target as HTMLInputElement
  const selectedFiles = Array.from(input.files ?? [])
  const files = selectedFiles.filter(isSupportedImageFile)
  if (selectedFiles.length !== files.length) {
    appStore.showWarning(t('imageGeneration.errors.unsupportedImageFormat'))
  }
  if (files.length === 0) {
    input.value = ''
    return
  }

  const nextItems = files.map(createLocalImagePreview)
  if (mode.value === 'mask') {
    clearLocalPreviews(sourceImagePreviews.value)
    sourceImagePreviews.value = nextItems.slice(0, 1)
    clearLocalPreviews(nextItems.slice(1))
    if (files.length > 1) {
      appStore.showInfo(t('imageGeneration.messages.maskSingleSourceOnly'))
    }
  } else {
    sourceImagePreviews.value = [...sourceImagePreviews.value, ...nextItems]
  }
  input.value = ''
}

function createLocalImagePreview(file: File): LocalImagePreview {
  return {
    id: `${file.name}-${file.size}-${file.lastModified}-${Math.random().toString(36).slice(2, 8)}`,
    file,
    url: URL.createObjectURL(file),
  }
}

function removeSourceImage(id: string) {
  const target = sourceImagePreviews.value.find((item) => item.id === id)
  if (!target) return
  URL.revokeObjectURL(target.url)
  sourceImagePreviews.value = sourceImagePreviews.value.filter((item) => item.id !== id)
}

function clearLocalPreviews(previews: LocalImagePreview[]) {
  for (const preview of previews) {
    URL.revokeObjectURL(preview.url)
  }
}

function keepFirstSourceImageOnly(showMessage = false) {
  const firstSourceImage = sourceImagePreviews.value[0]
  if (!firstSourceImage) return
  clearLocalPreviews(sourceImagePreviews.value.slice(1))
  sourceImagePreviews.value = [firstSourceImage]
  if (showMessage) {
    appStore.showInfo(t('imageGeneration.messages.maskSingleSourceOnly'))
  }
}

function resetForm() {
  const cachedAdvancedSettings = readAdvancedSettings()
  mode.value = 'generate'
  prompt.value = ''
  responseModel.value = choosePreferredModelValue(responseModelOptions.value, '', DEFAULT_RESPONSE_MODEL)
  model.value = choosePreferredModelValue(imageModelOptions.value, '', DEFAULT_MODEL)
  size.value = DEFAULT_SIZE
  customSizeWidth.value = DEFAULT_CUSTOM_SIZE_WIDTH
  customSizeHeight.value = DEFAULT_CUSTOM_SIZE_HEIGHT
  n.value = DEFAULT_COUNT
  applyAdvancedSettings(cachedAdvancedSettings ?? createDefaultAdvancedSettings())
  submitError.value = ''
  clearLocalPreviews(sourceImagePreviews.value)
  sourceImagePreviews.value = []
  resetMaskEditor()
  exitMaskEditorFullscreen()
}

async function submitGeneration() {
  const validationError = validateGenerationForm()
  if (validationError) {
    appStore.showWarning(validationError)
    return
  }
  if (!selectedKey.value) {
    appStore.showWarning(t('imageGeneration.errors.keyRequired'))
    return
  }

  submitError.value = ''
  resultImages.value = []
  restoredFromCache.value = false
  activeHistoryId.value = ''
  lastSavedAt.value = ''
  submitting.value = true
  abortController = new AbortController()

  try {
    const request = await buildRequestInit(selectedKey.value.key)
    const response = await fetch('/v1/responses', {
      ...request,
      signal: abortController.signal,
    })

    if (!response.ok) {
      const responseText = await response.text()
      throw new Error(extractImagesErrorMessage(responseText, response.status))
    }

    if (!isEventStreamResponse(response)) {
      throw new Error(t('imageGeneration.errors.streamResponseRequired'))
    }

    const images = await consumeImageGenerationStream(response)
    if (images.length === 0) {
      throw new Error(t('imageGeneration.errors.noImagesReturned'))
    }

    resultImages.value = images
    restoredFromCache.value = false
    lastSavedAt.value = new Date().toISOString()
    activeHistoryId.value = ''
    const historyPersisted = await persistCachedResult()
    appStore.showSuccess(t('imageGeneration.messages.generateSuccess', { count: images.length }))
    if (historyPersisted) {
      appStore.showWarning(t('imageGeneration.messages.saveGeneratedImagesSoon'), 8000)
    } else {
      appStore.showWarning(t('imageGeneration.messages.historySaveSkipped'), 8000)
    }
  } catch (error: unknown) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      resultImages.value = []
      restoredFromCache.value = false
      activeHistoryId.value = ''
      lastSavedAt.value = ''
      appStore.showInfo(t('imageGeneration.messages.cancelled'))
      return
    }
    const message = extractApiErrorMessage(error, t('imageGeneration.errors.generateFailed'))
    submitError.value = message
    appStore.showError(message)
  } finally {
    submitting.value = false
    abortController = null
  }
}

function cancelGeneration() {
  if (abortController) {
    abortController.abort()
    abortController = null
  }
  submitting.value = false
}

function validateGenerationForm(): string {
  if (!selectedKey.value) return t('imageGeneration.errors.keyRequired')
  if (loadingModels.value) return t('imageGeneration.errors.modelsLoading')
  if (modelLoadError.value) return modelLoadError.value
  if (responseModelOptions.value.length === 0) return t('imageGeneration.errors.noResponseModels')
  if (imageModelOptions.value.length === 0) return t('imageGeneration.errors.noImageModels')
  if (!hasModelOption(responseModelOptions.value, responseModel.value)) return t('imageGeneration.errors.responseModelRequired')
  if (!hasModelOption(imageModelOptions.value, model.value)) return t('imageGeneration.errors.imageModelRequired')
  if (!trimmedStringValue(prompt.value)) return t('imageGeneration.errors.promptRequired')
  if (mode.value !== 'generate' && sourceImagePreviews.value.length === 0) {
    return t(mode.value === 'mask'
      ? 'imageGeneration.errors.maskSourceImageRequired'
      : 'imageGeneration.errors.sourceImagesRequired')
  }
  if (mode.value === 'mask' && !maskHasDrawing.value) {
    return t('imageGeneration.errors.maskDrawingRequired')
  }
  if (isGptImage2TransparentBackground()) {
    return t('imageGeneration.errors.gptImage2TransparentUnsupported')
  }
  if (sourceImagePreviews.value.some((preview) => !isSupportedImageFile(preview.file))) {
    return t('imageGeneration.errors.unsupportedImageFormat')
  }
  const customSizeError = validateCustomSize()
  if (customSizeError) {
    return customSizeError
  }

  const compressionValue = trimmedStringValue(outputCompression.value)
  if (compressionValue) {
    const compression = parseIntegerString(compressionValue)
    if (compression === null || compression < 0 || compression > 100) {
      return t('imageGeneration.errors.outputCompressionRange')
    }
  }

  return ''
}

function validateCustomSize(): string {
  if (!isCustomSizeSelected.value) return ''
  const dimensions = readCustomSizeDimensions()
  if (!dimensions) {
    return t('imageGeneration.errors.customSizeRequired')
  }
  const { width, height } = dimensions
  const longEdge = Math.max(width, height)
  const shortEdge = Math.min(width, height)
  const pixels = width * height

  if (longEdge > CUSTOM_SIZE_MAX_EDGE) {
    return t('imageGeneration.errors.customSizeMaxEdge', { max: CUSTOM_SIZE_MAX_EDGE })
  }
  if (width % CUSTOM_SIZE_MULTIPLE !== 0 || height % CUSTOM_SIZE_MULTIPLE !== 0) {
    return t('imageGeneration.errors.customSizeMultiple', { multiple: CUSTOM_SIZE_MULTIPLE })
  }
  if (longEdge / shortEdge > CUSTOM_SIZE_MAX_RATIO) {
    return t('imageGeneration.errors.customSizeRatio', { ratio: CUSTOM_SIZE_MAX_RATIO })
  }
  if (pixels < CUSTOM_SIZE_MIN_PIXELS || pixels > CUSTOM_SIZE_MAX_PIXELS) {
    return t('imageGeneration.errors.customSizePixels', {
      min: CUSTOM_SIZE_MIN_PIXELS.toLocaleString(),
      max: CUSTOM_SIZE_MAX_PIXELS.toLocaleString(),
    })
  }
  return ''
}

async function buildRequestInit(apiKey: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
  }

  return {
    method: 'POST',
    headers,
    body: JSON.stringify(await buildResponsesPayload()),
  }
}

async function buildResponsesPayload() {
  const outputFormatValue = resolveOutputFormatValue()
  const tool: Record<string, unknown> = {
    type: 'image_generation',
    model: trimmedStringValue(model.value) || DEFAULT_MODEL,
    action: mode.value === 'mask' ? 'edit' : 'generate',
    size: resolveSizeValue(),
    quality: quality.value || 'auto',
    output_format: outputFormatValue,
    moderation: 'low',
    partial_images: FIXED_PARTIAL_IMAGES,
  }

  if (!isGptImage2TransparentBackground()) {
    tool.background = background.value || 'auto'
  }

  if (outputFormatValue === 'jpeg' || outputFormatValue === 'webp') {
    tool.output_compression = normalizeOutputCompression(outputCompression.value) ?? DEFAULT_OUTPUT_COMPRESSION
  }

  if (mode.value !== 'generate' && !isInputFidelityUnsupportedImageModel()) {
    tool.input_fidelity = DEFAULT_INPUT_FIDELITY
  }

  const content: Array<Record<string, string>> = [
    { type: 'input_text', text: trimmedStringValue(prompt.value) },
  ]

  const imagesToSubmit = mode.value === 'mask'
    ? sourceImagePreviews.value.slice(0, 1)
    : mode.value === 'edit'
      ? sourceImagePreviews.value
      : []

  for (const item of imagesToSubmit) {
    content.push({
      type: 'input_image',
      image_url: await fileToDataUrl(item.file),
      detail: 'auto',
    })
  }

  if (mode.value === 'mask') {
    const maskBlob = await exportMaskBlob()
    tool.input_image_mask = { image_url: await blobToDataUrl(maskBlob) }
  }

  return {
    model: trimmedStringValue(responseModel.value) || DEFAULT_RESPONSE_MODEL,
    input: [
      {
        role: 'user',
        content,
      },
    ],
    tools: [tool],
    tool_choice: { type: 'image_generation' },
    store: false,
    stream: true,
  }
}

function isEventStreamResponse(response: Response): boolean {
  const contentType = response.headers.get('content-type') || ''
  return contentType.toLowerCase().includes('text/event-stream')
}

function isSupportedImageFile(file: File): boolean {
  return SUPPORTED_IMAGE_TYPES.has(file.type)
}

function resolveOutputFormatValue(): string {
  return trimmedStringValue(outputFormat.value) || 'png'
}

function isGptImage2TransparentBackground(): boolean {
  return trimmedStringValue(model.value).toLowerCase() === 'gpt-image-2' &&
    trimmedStringValue(background.value).toLowerCase() === 'transparent'
}

function isInputFidelityUnsupportedImageModel(): boolean {
  return INPUT_FIDELITY_UNSUPPORTED_IMAGE_MODELS.has(trimmedStringValue(model.value).toLowerCase())
}

function resolveSizeValue(): string {
  if (!isCustomSizeSelected.value) {
    return trimmedStringValue(size.value) || DEFAULT_SIZE
  }
  const dimensions = readCustomSizeDimensions()
  if (!dimensions) {
    return DEFAULT_SIZE
  }
  return `${dimensions.width}x${dimensions.height}`
}

function readCustomSizeDimensions(): { width: number; height: number } | null {
  const width = parseIntegerString(customSizeWidth.value)
  const height = parseIntegerString(customSizeHeight.value)
  if (width === null || height === null || width <= 0 || height <= 0) {
    return null
  }
  return { width, height }
}

function parseSizeValue(value: string): { width: string; height: string } | null {
  const match = /^(\d+)x(\d+)$/i.exec(value.trim())
  if (!match) return null
  return {
    width: match[1],
    height: match[2],
  }
}

function fileToDataUrl(file: File): Promise<string> {
  if (!isSupportedImageFile(file)) {
    return Promise.reject(new Error(t('imageGeneration.errors.unsupportedImageFormat')))
  }
  return blobToDataUrl(file)
}

function blobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : ''
      if (result) {
        resolve(result)
      } else {
        reject(new Error(t('imageGeneration.errors.generateFailed')))
      }
    }
    reader.onerror = () => reject(new Error(t('imageGeneration.errors.generateFailed')))
    reader.readAsDataURL(blob)
  })
}

async function consumeImageGenerationStream(response: Response): Promise<ResultImage[]> {
  const reader = response.body?.getReader()
  if (!reader) {
    throw new Error(t('imageGeneration.errors.generateFailed'))
  }

  const decoder = new TextDecoder()
  const completedImages: ResultImage[] = []
  const completedImageKeys = new Set<string>()
  let completedCount = 0
  let buffer = ''
  let currentEvent = ''
  let currentDataLines: string[] = []

  const dispatchEvent = () => {
    if (!currentEvent && currentDataLines.length === 0) {
      return
    }

    const eventName = currentEvent.trim()
    const rawData = currentDataLines.join('\n').trim()
    currentEvent = ''
    currentDataLines = []

    if (!rawData || rawData === '[DONE]') {
      return
    }

    let payload: ImageGenerationStreamPayload
    try {
      payload = JSON.parse(rawData) as ImageGenerationStreamPayload
    } catch {
      throw new Error(t('imageGeneration.errors.generateFailed'))
    }

    const payloadType = trimmedStringValue(payload.type)
    const resolvedEvent = eventName || payloadType
    if (resolvedEvent === 'error' || payloadType === 'error' || payloadType === 'response.failed') {
      throw new Error(extractStreamErrorMessage(payload))
    }

    const partialCandidate = extractPartialImageCandidate(payload, resolvedEvent)
    if (partialCandidate) {
      const partialIndex = Number.isInteger(partialCandidate?.index)
        ? Number(partialCandidate?.index)
        : resultImages.value.length
      const partialImage = createStreamResultImage(partialCandidate, partialIndex, true)
      if (partialImage) {
        upsertStreamResultImage(partialImage, partialIndex)
      }
      if (resolvedEvent.includes('partial_image') || payloadType.includes('partial_image')) {
        return
      }
    }

    for (const candidate of extractFinalImageCandidates(payload, resolvedEvent)) {
      if (completedImageKeys.has(candidate.key)) {
        continue
      }
      const completedImage = createStreamResultImage(candidate, completedCount, false)
      if (!completedImage) return
      completedImageKeys.add(candidate.key)
      upsertStreamResultImage(completedImage, completedCount)
      completedImages.push(completedImage)
      completedCount += 1
    }
  }

  while (true) {
    const { done, value } = await reader.read()
    if (done) break

    buffer += decoder.decode(value, { stream: true })
    const lines = buffer.split('\n')
    buffer = lines.pop() || ''

    for (const rawLine of lines) {
      const line = rawLine.replace(/\r$/, '')
      if (!line) {
        dispatchEvent()
        continue
      }
      if (line.startsWith(':')) {
        continue
      }
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim()
        continue
      }
      if (line.startsWith('data:')) {
        currentDataLines.push(line.slice(5).trimStart())
      }
    }
  }

  buffer += decoder.decode()
  if (buffer.trim()) {
    const trailingLines = buffer.split('\n')
    for (const rawLine of trailingLines) {
      const line = rawLine.replace(/\r$/, '')
      if (!line) {
        dispatchEvent()
        continue
      }
      if (line.startsWith(':')) {
        continue
      }
      if (line.startsWith('event:')) {
        currentEvent = line.slice(6).trim()
        continue
      }
      if (line.startsWith('data:')) {
        currentDataLines.push(line.slice(5).trimStart())
      }
    }
  }
  dispatchEvent()

  if (completedImages.length === 0) {
    throw new Error(t('imageGeneration.errors.noImagesReturned'))
  }

  resultImages.value = [...completedImages]
  return completedImages
}

function extractStreamErrorMessage(payload: ImageGenerationStreamPayload): string {
  return trimmedStringValue(payload.response?.error?.message) ||
    trimmedStringValue(payload.error?.message) ||
    trimmedStringValue(payload.response?.error?.code) ||
    trimmedStringValue(payload.error?.code) ||
    t('imageGeneration.errors.generateFailed')
}

function extractPartialImageCandidate(
  payload: ImageGenerationStreamPayload,
  resolvedEvent: string,
): StreamImageCandidate | null {
  let candidate: StreamImageCandidate | null = null
  walkStreamValue(payload, (value) => {
    if (candidate || !isRecord(value)) return
    const type = trimmedStringValue(value.type)
    const hasPartialIndex = Object.prototype.hasOwnProperty.call(value, 'partial_image_index')
    const looksPartial = type.includes('partial_image') || resolvedEvent.includes('partial_image') || hasPartialIndex
    if (!looksPartial) return

    const b64 = trimmedStringValue(value.b64_json) ||
      trimmedStringValue(value.partial_image_b64) ||
      trimmedStringValue(value.partial_image) ||
      trimmedStringValue(value.result)
    const url = trimmedStringValue(value.url)
    if (!b64 && !url) return

    const index = typeof value.partial_image_index === 'number' && Number.isInteger(value.partial_image_index)
      ? value.partial_image_index
      : undefined
    candidate = {
      key: streamImageCandidateKey(url, b64, `partial-${index ?? 0}`),
      index,
      url,
      b64,
      revisedPrompt: streamRevisedPromptValue(value),
      outputFormat: trimmedStringValue(value.output_format),
    }
  })
  return candidate
}

function extractFinalImageCandidates(
  payload: ImageGenerationStreamPayload,
  resolvedEvent: string,
): StreamImageCandidate[] {
  const candidates: StreamImageCandidate[] = []
  walkStreamValue(payload, (value) => {
    const candidate = streamValueToFinalCandidate(value, resolvedEvent, candidates.length)
    if (candidate) candidates.push(candidate)
  })
  return candidates
}

function streamValueToFinalCandidate(
  value: unknown,
  resolvedEvent: string,
  index: number,
): StreamImageCandidate | null {
  if (!isRecord(value)) return null

  const type = trimmedStringValue(value.type)
  const effectiveType = type || resolvedEvent
  const isToolResult = effectiveType === 'image_generation_call'
  const isLegacyCompleted = effectiveType === 'image_generation.completed' || effectiveType === 'image_edit.completed'
  if (!isToolResult && !isLegacyCompleted) return null

  const b64 = isToolResult
    ? trimmedStringValue(value.result) || trimmedStringValue(value.b64_json)
    : trimmedStringValue(value.b64_json) || trimmedStringValue(value.result)
  const url = trimmedStringValue(value.url)
  if (!b64 && !url) return null

  return {
    key: streamImageCandidateKey(url, b64, trimmedStringValue(value.id) || `${effectiveType}-${index}`),
    url,
    b64,
    revisedPrompt: streamRevisedPromptValue(value),
    outputFormat: trimmedStringValue(value.output_format),
  }
}

function streamRevisedPromptValue(value: Record<string, unknown>): string {
  return trimmedStringValue(value.revised_prompt) || trimmedStringValue(value.revisedPrompt)
}

function walkStreamValue(value: unknown, visitor: (value: unknown) => void) {
  visitor(value)
  if (!value || typeof value !== 'object') return
  if (Array.isArray(value)) {
    for (const item of value) {
      walkStreamValue(item, visitor)
    }
    return
  }
  for (const item of Object.values(value)) {
    walkStreamValue(item, visitor)
  }
}

function streamImageCandidateKey(url: string, b64: string, fallback: string): string {
  if (url) return `url:${url}`
  if (b64) return `b64:${b64.slice(0, 96)}`
  return `fallback:${fallback}`
}

function createStreamResultImage(
  candidate: StreamImageCandidate | null,
  index: number,
  isPartial: boolean,
): ResultImage | null {
  if (!candidate) return null
  const outputFormat = trimmedStringValue(candidate.outputFormat) || resolveOutputFormatValue()
  const mimeType = resolveMimeType(outputFormat)
  const url = normalizeStreamImageUrl(candidate, mimeType)
  if (!url) return null

  return {
    url,
    mimeType: detectMimeTypeFromUrl(url, mimeType),
    fileName: buildImageFileName(index, url, mimeType),
    revisedPrompt: trimmedStringValue(candidate.revisedPrompt) || undefined,
    isPartial,
  }
}

function normalizeStreamImageUrl(candidate: StreamImageCandidate, mimeType: string): string {
  const directUrl = trimmedStringValue(candidate.url)
  if (directUrl) {
    return directUrl
  }
  const b64 = trimmedStringValue(candidate.b64)
  if (!b64) {
    return ''
  }
  return `data:${mimeType};base64,${b64}`
}

function upsertStreamResultImage(image: ResultImage, targetIndex: number) {
  const nextImages = [...resultImages.value]
  if (targetIndex >= 0 && targetIndex < nextImages.length) {
    nextImages[targetIndex] = image
  } else {
    nextImages.push(image)
  }
  resultImages.value = nextImages
}

function normalizeNonNegativeInt(value: unknown): number | null {
  if (!trimmedStringValue(value)) return null
  const parsed = parseIntegerString(value)
  if (parsed === null || parsed < 0) {
    return null
  }
  return parsed
}

function normalizeOutputCompression(value: unknown): number | null {
  const parsed = normalizeNonNegativeInt(value)
  if (parsed === null || parsed > 100) {
    return null
  }
  return parsed
}

function parseIntegerString(value: unknown): number | null {
  const normalized = trimmedStringValue(value)
  if (!/^-?\d+$/.test(normalized)) return null
  const parsed = Number.parseInt(normalized, 10)
  return Number.isSafeInteger(parsed) ? parsed : null
}

async function loadMaskSourceImage(preview: LocalImagePreview) {
  try {
    const image = await loadImageElement(preview.url)
    if (primarySourceImage.value?.id !== preview.id || mode.value !== 'mask') return
    maskSourceImageElement = image
    maskCanvasWidth.value = image.naturalWidth || DEFAULT_MASK_CANVAS_WIDTH
    maskCanvasHeight.value = image.naturalHeight || DEFAULT_MASK_CANVAS_HEIGHT
    await nextTick()
    renderMaskEditor()
  } catch {
    appStore.showError(t('imageGeneration.errors.maskSourceLoadFailed'))
  }
}

function loadImageElement(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image()
    image.onload = () => resolve(image)
    image.onerror = () => reject(new Error('Failed to load image'))
    image.src = url
  })
}

function renderMaskEditor() {
  renderMaskBaseCanvas()
  renderMaskDrawingCanvas()
}

function renderMaskBaseCanvas() {
  const canvas = maskBaseCanvasRef.value
  const image = maskSourceImageElement
  if (!canvas || !image) return

  const context = canvas.getContext('2d')
  if (!context) return
  context.clearRect(0, 0, canvas.width, canvas.height)
  context.drawImage(image, 0, 0, canvas.width, canvas.height)
}

function renderMaskDrawingCanvas() {
  const canvas = maskDrawingCanvasRef.value
  if (!canvas) return

  const context = canvas.getContext('2d')
  if (!context) return
  if (!maskHasDrawing.value) {
    context.clearRect(0, 0, canvas.width, canvas.height)
  }
}

function handleMaskPointerDown(event: PointerEvent) {
  const canvas = maskDrawingCanvasRef.value
  if (!canvas) return

  event.preventDefault()
  const point = getCanvasPoint(event, canvas)
  maskPointerActive = true
  maskPointerId = event.pointerId
  maskLastPoint = point
  canvas.setPointerCapture(event.pointerId)
  pushMaskUndoSnapshot()

  if (maskTool.value === 'brush' || maskTool.value === 'eraser') {
    drawMaskLine(point, point)
    maskHasDrawing.value = hasMaskPixels()
    return
  }

  const context = canvas.getContext('2d')
  if (!context) return
  maskShapeStartPoint = point
  maskShapeSnapshot = context.getImageData(0, 0, canvas.width, canvas.height)
}

function handleMaskPointerMove(event: PointerEvent) {
  if (!maskPointerActive || event.pointerId !== maskPointerId) return
  const canvas = maskDrawingCanvasRef.value
  if (!canvas) return

  event.preventDefault()
  const point = getCanvasPoint(event, canvas)
  if (maskTool.value === 'brush' || maskTool.value === 'eraser') {
    drawMaskLine(maskLastPoint ?? point, point)
    maskLastPoint = point
    maskHasDrawing.value = hasMaskPixels()
    return
  }
  drawMaskShapePreview(point)
}

function handleMaskPointerUp(event: PointerEvent) {
  if (!maskPointerActive || event.pointerId !== maskPointerId) return
  const canvas = maskDrawingCanvasRef.value
  if (!canvas) return

  event.preventDefault()
  if (maskTool.value === 'circle' || maskTool.value === 'rectangle') {
    drawMaskShapePreview(getCanvasPoint(event, canvas))
  }
  finishMaskPointer(canvas, event.pointerId)
}

function handleMaskPointerLeave(event: PointerEvent) {
  if (!maskPointerActive || event.pointerId !== maskPointerId) return
  if (event.buttons !== 0) return
  const canvas = maskDrawingCanvasRef.value
  if (!canvas) return
  finishMaskPointer(canvas, event.pointerId)
}

function finishMaskPointer(canvas: HTMLCanvasElement, pointerId: number) {
  if (canvas.hasPointerCapture(pointerId)) {
    canvas.releasePointerCapture(pointerId)
  }
  maskPointerActive = false
  maskPointerId = null
  maskLastPoint = null
  maskShapeStartPoint = null
  maskShapeSnapshot = null
  maskHasDrawing.value = hasMaskPixels()
}

function getCanvasPoint(event: PointerEvent, canvas: HTMLCanvasElement): CanvasPoint {
  const rect = canvas.getBoundingClientRect()
  const scaleX = rect.width > 0 ? canvas.width / rect.width : 1
  const scaleY = rect.height > 0 ? canvas.height / rect.height : 1
  return {
    x: (event.clientX - rect.left) * scaleX,
    y: (event.clientY - rect.top) * scaleY,
  }
}

function drawMaskLine(from: CanvasPoint, to: CanvasPoint) {
  const canvas = maskDrawingCanvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  context.save()
  context.lineCap = 'round'
  context.lineJoin = 'round'
  context.lineWidth = maskBrushSize.value
  if (maskTool.value === 'eraser') {
    context.globalCompositeOperation = 'destination-out'
    context.strokeStyle = 'rgba(0, 0, 0, 1)'
  } else {
    context.globalCompositeOperation = 'source-over'
    context.strokeStyle = 'rgba(239, 68, 68, 0.68)'
  }
  context.beginPath()
  context.moveTo(from.x, from.y)
  context.lineTo(to.x, to.y)
  context.stroke()
  context.restore()
}

function drawMaskShapePreview(currentPoint: CanvasPoint) {
  const canvas = maskDrawingCanvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context || !maskShapeStartPoint || !maskShapeSnapshot) return

  context.putImageData(maskShapeSnapshot, 0, 0)
  context.save()
  context.fillStyle = 'rgba(239, 68, 68, 0.68)'
  if (maskTool.value === 'rectangle') {
    context.fillRect(
      maskShapeStartPoint.x,
      maskShapeStartPoint.y,
      currentPoint.x - maskShapeStartPoint.x,
      currentPoint.y - maskShapeStartPoint.y,
    )
  } else {
    const radius = Math.hypot(currentPoint.x - maskShapeStartPoint.x, currentPoint.y - maskShapeStartPoint.y)
    context.beginPath()
    context.arc(maskShapeStartPoint.x, maskShapeStartPoint.y, radius, 0, Math.PI * 2)
    context.fill()
  }
  context.restore()
}

function pushMaskUndoSnapshot() {
  const canvas = maskDrawingCanvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  maskUndoStack.push(context.getImageData(0, 0, canvas.width, canvas.height))
  if (maskUndoStack.length > MAX_UNDO_STACK_SIZE) {
    maskUndoStack = maskUndoStack.slice(maskUndoStack.length - MAX_UNDO_STACK_SIZE)
  }
  maskUndoStackSize.value = maskUndoStack.length
}

function undoMaskDrawing() {
  const canvas = maskDrawingCanvasRef.value
  const context = canvas?.getContext('2d')
  const snapshot = maskUndoStack.pop()
  if (!canvas || !context || !snapshot) return

  context.putImageData(snapshot, 0, 0)
  maskUndoStackSize.value = maskUndoStack.length
  maskHasDrawing.value = hasMaskPixels()
}

function clearMaskDrawing() {
  const canvas = maskDrawingCanvasRef.value
  const context = canvas?.getContext('2d')
  if (!canvas || !context) return

  pushMaskUndoSnapshot()
  context.clearRect(0, 0, canvas.width, canvas.height)
  maskHasDrawing.value = false
}

function hasMaskPixels(): boolean {
  const canvas = maskDrawingCanvasRef.value
  const context = canvas?.getContext('2d', { willReadFrequently: true })
  if (!canvas || !context) return false

  const data = context.getImageData(0, 0, canvas.width, canvas.height).data
  for (let index = 3; index < data.length; index += 4) {
    if (data[index] > 0) return true
  }
  return false
}

async function previewMask() {
  try {
    const blob = await exportMaskBlob()
    if (maskPreviewObjectUrl) {
      URL.revokeObjectURL(maskPreviewObjectUrl)
    }
    maskPreviewObjectUrl = URL.createObjectURL(blob)
    openPreview(maskPreviewObjectUrl, t('imageGeneration.form.maskPreviewTitle'))
  } catch (error: unknown) {
    appStore.showError(extractApiErrorMessage(error, t('imageGeneration.errors.maskExportFailed')))
  }
}

async function exportMaskBlob(): Promise<Blob> {
  const drawingCanvas = maskDrawingCanvasRef.value
  if (!drawingCanvas) {
    throw new Error(t('imageGeneration.errors.maskNotReady'))
  }

  const maskCanvas = document.createElement('canvas')
  maskCanvas.width = drawingCanvas.width
  maskCanvas.height = drawingCanvas.height
  const maskContext = maskCanvas.getContext('2d')
  const drawingContext = drawingCanvas.getContext('2d', { willReadFrequently: true })
  if (!maskContext || !drawingContext) {
    throw new Error(t('imageGeneration.errors.maskNotReady'))
  }

  maskContext.fillStyle = '#ffffff'
  maskContext.fillRect(0, 0, maskCanvas.width, maskCanvas.height)
  const drawingData = drawingContext.getImageData(0, 0, drawingCanvas.width, drawingCanvas.height)
  const maskData = maskContext.getImageData(0, 0, maskCanvas.width, maskCanvas.height)
  for (let index = 0; index < drawingData.data.length; index += 4) {
    if (drawingData.data[index + 3] > 0) {
      maskData.data[index + 3] = 0
    }
  }
  maskContext.putImageData(maskData, 0, 0)

  return new Promise((resolve, reject) => {
    maskCanvas.toBlob((blob) => {
      if (blob) {
        resolve(blob)
      } else {
        reject(new Error(t('imageGeneration.errors.maskExportFailed')))
      }
    }, 'image/png')
  })
}

function resetMaskEditor() {
  const canvas = maskDrawingCanvasRef.value
  const context = canvas?.getContext('2d')
  if (canvas && context) {
    context.clearRect(0, 0, canvas.width, canvas.height)
  }
  maskSourceImageElement = null
  maskPointerActive = false
  maskPointerId = null
  maskLastPoint = null
  maskShapeStartPoint = null
  maskShapeSnapshot = null
  maskUndoStack = []
  maskUndoStackSize.value = 0
  maskHasDrawing.value = false
  maskCanvasWidth.value = DEFAULT_MASK_CANVAS_WIDTH
  maskCanvasHeight.value = DEFAULT_MASK_CANVAS_HEIGHT
}

function toggleMaskEditorFullscreen() {
  maskEditorExpanded.value = !maskEditorExpanded.value
}

function setMaskTool(tool: MaskTool) {
  maskTool.value = tool
}

function exitMaskEditorFullscreen() {
  if (!maskEditorExpanded.value) {
    unlockMaskEditorScroll()
    return
  }
  maskEditorExpanded.value = false
  unlockMaskEditorScroll()
}

function unlockMaskEditorScroll() {
  document.body.style.overflow = previousBodyOverflow
  document.body.classList.remove(MASK_SCROLL_LOCK_CLASS)
}

function extractImagesErrorMessage(responseText: string, status: number): string {
  if (!responseText.trim()) {
    return `${t('imageGeneration.errors.generateFailed')} (${status})`
  }

  try {
    const parsed = JSON.parse(responseText) as {
      error?: { message?: string }
      message?: string
      detail?: string
    }
    return parsed.error?.message || parsed.message || parsed.detail || `${t('imageGeneration.errors.generateFailed')} (${status})`
  } catch {
    return responseText
  }
}

function resolveMimeType(format: string): string {
  const normalized = format.trim().toLowerCase()
  switch (normalized) {
    case 'jpg':
    case 'jpeg':
    case 'image/jpeg':
      return 'image/jpeg'
    case 'webp':
    case 'image/webp':
      return 'image/webp'
    case 'png':
    case 'image/png':
    default:
      return 'image/png'
  }
}

function detectMimeTypeFromUrl(url: string, fallback: string): string {
  if (url.startsWith('data:')) {
    const match = url.match(/^data:([^;]+);/)
    return match?.[1] || fallback
  }
  return fallback
}

function buildImageFileName(index: number, url: string, mimeType: string): string {
  const extension = mimeType.split('/')[1] || 'png'
  if (!url.startsWith('data:')) {
    try {
      const pathname = new URL(url).pathname
      const candidate = pathname.split('/').pop()
      if (candidate) {
        return candidate
      }
    } catch {
      // ignore parse failure
    }
  }
  return `generated-${index + 1}.${extension}`
}

function createCachedResultPayload(savedAt: string, results: ResultImage[]): CachedImageGenerationResult {
  return {
    version: 1,
    savedAt,
    selectedKeyId: selectedKeyId.value,
    form: captureCurrentForm(),
    results,
  }
}

function captureCurrentForm(): CachedImageGenerationForm {
  return {
    mode: mode.value,
    prompt: stringValue(prompt.value),
    responseModel: stringValue(responseModel.value),
    model: stringValue(model.value),
    size: stringValue(size.value),
    customSizeWidth: stringValue(customSizeWidth.value),
    customSizeHeight: stringValue(customSizeHeight.value),
    n: DEFAULT_COUNT,
    quality: stringValue(quality.value),
    background: stringValue(background.value),
    outputFormat: stringValue(outputFormat.value),
    outputCompression: stringValue(outputCompression.value),
    advancedOpen: advancedOpen.value,
  }
}

async function persistCachedResult(): Promise<boolean> {
  const entry = createHistoryEntry(createCachedResultPayload(lastSavedAt.value, resultImages.value))
  imageHistory.value = [
    entry,
    ...imageHistory.value.filter((item) => item.id !== entry.id),
  ].slice(0, HISTORY_LIMIT)
  const historyPersisted = await persistImageHistory(entry.id)
  activeHistoryId.value = historyPersisted ? entry.id : ''
  return historyPersisted
}

async function restoreCachedResult() {
  imageHistory.value = await loadImageHistory()
  await persistImageHistory()
  activeHistoryId.value = ''
  resultImages.value = []
  restoredFromCache.value = false
  submitError.value = ''
  lastSavedAt.value = ''
}

function clearCachedResult() {
  clearHistoryConfirmOpen.value = true
}

async function confirmClearCachedResult() {
  try {
    await clearIndexedDbHistory()
  } catch (error) {
    console.warn('Failed to clear image generation IndexedDB history', error)
  }
  clearLocalStorageHistory()
  imageHistory.value = []
  activeHistoryId.value = ''
  resultImages.value = []
  restoredFromCache.value = false
  submitError.value = ''
  lastSavedAt.value = ''
  clearHistoryConfirmOpen.value = false
  appStore.showSuccess(t('imageGeneration.messages.cacheCleared'))
}

async function loadImageHistory(): Promise<ImageGenerationHistoryEntry[]> {
  const history = await readIndexedDbHistory()
  const localHistory = readLocalStorageHistory()
  return mergeImageHistory([...localHistory, ...history])
}

function readLocalStorageHistory(): ImageGenerationHistoryEntry[] {
  const history = readLocalStorageStoredHistory()
  const legacyEntry = readLegacyCacheEntry()
  return legacyEntry
    ? [legacyEntry, ...history.filter((entry) => entry.id !== legacyEntry.id)]
    : history
}

function readLocalStorageStoredHistory(): ImageGenerationHistoryEntry[] {
  const raw = localStorage.getItem(HISTORY_CACHE_KEY)
  if (!raw) return []

  try {
    const parsed = JSON.parse(raw) as unknown
    if (!Array.isArray(parsed)) return []
    return parsed
      .map((item) => normalizeHistoryEntry(item))
      .filter((item): item is ImageGenerationHistoryEntry => Boolean(item))
      .slice(0, HISTORY_LIMIT)
  } catch {
    localStorage.removeItem(HISTORY_CACHE_KEY)
    return []
  }
}

function readLegacyCacheEntry(): ImageGenerationHistoryEntry | null {
  const raw = localStorage.getItem(LEGACY_LOCAL_CACHE_KEY)
  if (!raw) return null

  try {
    const cached = normalizeCachedResult(JSON.parse(raw))
    if (!cached) {
      localStorage.removeItem(LEGACY_LOCAL_CACHE_KEY)
      return null
    }
    return createHistoryEntry(cached)
  } catch {
    localStorage.removeItem(LEGACY_LOCAL_CACHE_KEY)
    return null
  }
}

function clearLocalStorageHistory() {
  localStorage.removeItem(HISTORY_CACHE_KEY)
  localStorage.removeItem(LEGACY_LOCAL_CACHE_KEY)
}

async function readIndexedDbHistory(): Promise<ImageGenerationHistoryEntry[]> {
  if (!isIndexedDbAvailable()) return []

  let db: IDBDatabase | null = null
  try {
    db = await openImageHistoryDb()
    const rawEntries = await getAllHistoryEntries(db)
    return rawEntries
      .map((item) => normalizeHistoryEntry(item))
      .filter((item): item is ImageGenerationHistoryEntry => Boolean(item))
      .sort((leftEntry, rightEntry) => getHistoryTimestamp(rightEntry) - getHistoryTimestamp(leftEntry))
      .slice(0, HISTORY_LIMIT)
  } catch (error) {
    console.warn('Failed to read image generation IndexedDB history', error)
    return []
  } finally {
    db?.close()
  }
}

async function replaceIndexedDbHistory(entries: ImageGenerationHistoryEntry[]): Promise<void> {
  if (!isIndexedDbAvailable()) {
    throw new Error('IndexedDB is not available')
  }

  let db: IDBDatabase | null = null
  try {
    db = await openImageHistoryDb()
    await writeHistoryEntries(db, entries)
  } finally {
    db?.close()
  }
}

async function clearIndexedDbHistory(): Promise<void> {
  if (!isIndexedDbAvailable()) return

  let db: IDBDatabase | null = null
  try {
    db = await openImageHistoryDb()
    await clearHistoryEntries(db)
  } finally {
    db?.close()
  }
}

function isIndexedDbAvailable(): boolean {
  return typeof window !== 'undefined' && 'indexedDB' in window && Boolean(window.indexedDB)
}

function openImageHistoryDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = window.indexedDB.open(HISTORY_DB_NAME, HISTORY_DB_VERSION)

    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(HISTORY_DB_STORE)) {
        db.createObjectStore(HISTORY_DB_STORE, { keyPath: 'id' })
      }
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open image generation history database'))
    request.onblocked = () => reject(new Error('Image generation history database upgrade is blocked'))
  })
}

function getAllHistoryEntries(db: IDBDatabase): Promise<unknown[]> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_DB_STORE, 'readonly')
    const store = transaction.objectStore(HISTORY_DB_STORE)
    const request = store.getAll()

    request.onsuccess = () => resolve(request.result as unknown[])
    request.onerror = () => reject(request.error ?? transaction.error ?? new Error('Failed to read image generation history'))
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to read image generation history'))
  })
}

function writeHistoryEntries(db: IDBDatabase, entries: ImageGenerationHistoryEntry[]): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_DB_STORE, 'readwrite')
    const store = transaction.objectStore(HISTORY_DB_STORE)

    store.clear()
    for (const entry of entries) {
      store.put(toPlainHistoryEntry(entry))
    }

    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to write image generation history'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Failed to write image generation history'))
  })
}

function clearHistoryEntries(db: IDBDatabase): Promise<void> {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(HISTORY_DB_STORE, 'readwrite')
    transaction.objectStore(HISTORY_DB_STORE).clear()
    transaction.oncomplete = () => resolve()
    transaction.onerror = () => reject(transaction.error ?? new Error('Failed to clear image generation history'))
    transaction.onabort = () => reject(transaction.error ?? new Error('Failed to clear image generation history'))
  })
}

function toPlainHistoryEntry(entry: ImageGenerationHistoryEntry): ImageGenerationHistoryEntry {
  return {
    id: entry.id,
    version: 1,
    savedAt: entry.savedAt,
    selectedKeyId: entry.selectedKeyId,
    form: {
      mode: entry.form.mode,
      prompt: entry.form.prompt,
      responseModel: entry.form.responseModel,
      model: entry.form.model,
      size: entry.form.size,
      customSizeWidth: entry.form.customSizeWidth,
      customSizeHeight: entry.form.customSizeHeight,
      n: entry.form.n,
      quality: entry.form.quality,
      background: entry.form.background,
      outputFormat: entry.form.outputFormat,
      outputCompression: entry.form.outputCompression,
      advancedOpen: entry.form.advancedOpen,
    },
    results: entry.results.map((image) => ({
      url: image.url,
      mimeType: image.mimeType,
      fileName: image.fileName,
      revisedPrompt: image.revisedPrompt,
      isPartial: image.isPartial,
    })),
  }
}

function normalizeHistoryEntry(value: unknown): ImageGenerationHistoryEntry | null {
  if (!isRecord(value)) return null
  const cached = normalizeCachedResult(value)
  if (!cached) return null
  return {
    ...cached,
    id: typeof value.id === 'string' && value.id ? value.id : buildHistoryEntryId(cached),
  }
}

function normalizeCachedResult(value: unknown): CachedImageGenerationResult | null {
  if (!isRecord(value) || value.version !== 1 || !isRecord(value.form) || !Array.isArray(value.results)) {
    return null
  }
  const form = normalizeCachedForm(value.form)
  const results = value.results.filter(isResultImage)
  if (results.length === 0) return null

  return {
    version: 1,
    savedAt: typeof value.savedAt === 'string' && value.savedAt ? value.savedAt : new Date().toISOString(),
    selectedKeyId: typeof value.selectedKeyId === 'number' ? value.selectedKeyId : null,
    form,
    results,
  }
}

function normalizeCachedForm(value: Record<string, unknown>): CachedImageGenerationForm {
  const storedMode = stringValue(value.mode)
  const normalizedSize = normalizeCachedSizeSettings(value)
  return {
    mode: storedMode === 'edit' || storedMode === 'mask' ? storedMode : 'generate',
    prompt: stringValue(value.prompt),
    responseModel: stringValue(value.responseModel) || DEFAULT_RESPONSE_MODEL,
    model: stringValue(value.model) || DEFAULT_MODEL,
    size: normalizedSize.size,
    customSizeWidth: normalizedSize.customSizeWidth,
    customSizeHeight: normalizedSize.customSizeHeight,
    n: stringValue(value.n) || DEFAULT_COUNT,
    quality: normalizeOptionValue(stringValue(value.quality), ['', 'low', 'medium', 'high']),
    background: normalizeOptionValue(stringValue(value.background), ['', 'transparent', 'opaque', 'auto']),
    outputFormat: normalizeOptionValue(stringValue(value.outputFormat), ['', 'png', 'jpeg', 'webp']),
    outputCompression: stringValue(value.outputCompression),
    advancedOpen: value.advancedOpen === true,
  }
}

function normalizeCachedSizeSettings(value: Record<string, unknown>): {
  size: string
  customSizeWidth: string
  customSizeHeight: string
} {
  const storedSize = stringValue(value.size)
  const storedCustomWidth = stringValue(value.customSizeWidth) || DEFAULT_CUSTOM_SIZE_WIDTH
  const storedCustomHeight = stringValue(value.customSizeHeight) || DEFAULT_CUSTOM_SIZE_HEIGHT

  if (storedSize === CUSTOM_SIZE_VALUE) {
    return {
      size: CUSTOM_SIZE_VALUE,
      customSizeWidth: storedCustomWidth,
      customSizeHeight: storedCustomHeight,
    }
  }

  if (SIZE_PRESET_VALUES.has(storedSize)) {
    return {
      size: storedSize,
      customSizeWidth: storedCustomWidth,
      customSizeHeight: storedCustomHeight,
    }
  }

  const parsedSize = parseSizeValue(storedSize)
  if (parsedSize) {
    return {
      size: CUSTOM_SIZE_VALUE,
      customSizeWidth: parsedSize.width,
      customSizeHeight: parsedSize.height,
    }
  }

  return {
    size: DEFAULT_SIZE,
    customSizeWidth: storedCustomWidth,
    customSizeHeight: storedCustomHeight,
  }
}

function isResultImage(value: unknown): value is ResultImage {
  return isRecord(value) &&
    typeof value.url === 'string' &&
    value.url.length > 0 &&
    typeof value.mimeType === 'string' &&
    typeof value.fileName === 'string' &&
    (value.revisedPrompt === undefined || typeof value.revisedPrompt === 'string')
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null
}

function stringValue(value: unknown): string {
  if (typeof value === 'string') return value
  if (typeof value === 'number' && Number.isFinite(value)) return String(value)
  return ''
}

function trimmedStringValue(value: unknown): string {
  return stringValue(value).trim()
}

function isQuotaExceededError(error: unknown): boolean {
  return error instanceof DOMException && (
    error.name === 'QuotaExceededError' ||
    error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
    error.code === 22 ||
    error.code === 1014
  )
}

function normalizeOptionValue<T extends string>(value: string, allowedValues: readonly T[]): T {
  return allowedValues.includes(value as T) ? value as T : allowedValues[0]
}

function createHistoryEntry(payload: CachedImageGenerationResult): ImageGenerationHistoryEntry {
  return {
    ...payload,
    results: [...payload.results],
    id: buildHistoryEntryId(payload),
  }
}

function buildHistoryEntryId(payload: CachedImageGenerationResult): string {
  return `${payload.savedAt}-${payload.form.mode}-${payload.results.length}`
}

function getHistoryTimestamp(entry: ImageGenerationHistoryEntry): number {
  const timestamp = Date.parse(entry.savedAt)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function mergeImageHistory(entries: ImageGenerationHistoryEntry[]): ImageGenerationHistoryEntry[] {
  const merged = new Map<string, ImageGenerationHistoryEntry>()
  for (const entry of entries) {
    const existing = merged.get(entry.id)
    if (!existing || getHistoryTimestamp(entry) >= getHistoryTimestamp(existing)) {
      merged.set(entry.id, entry)
    }
  }
  return [...merged.values()]
    .sort((leftEntry, rightEntry) => getHistoryTimestamp(rightEntry) - getHistoryTimestamp(leftEntry))
    .slice(0, HISTORY_LIMIT)
}

async function persistImageHistory(preferredEntryId?: string): Promise<boolean> {
  const nextHistory = mergeImageHistory(imageHistory.value).slice(0, HISTORY_LIMIT)

  if (nextHistory.length === 0) {
    try {
      await clearIndexedDbHistory()
      clearLocalStorageHistory()
      return false
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        console.warn('Failed to clear image generation history', error)
      }
      return false
    }
  }

  while (nextHistory.length > 0) {
    try {
      await replaceIndexedDbHistory(nextHistory)
      imageHistory.value = nextHistory
      clearLocalStorageHistory()
      return preferredEntryId
        ? nextHistory.some((entry) => entry.id === preferredEntryId)
        : true
    } catch (error) {
      if (!isQuotaExceededError(error)) {
        console.warn('Failed to persist image generation history', error)
        return false
      }
      nextHistory.pop()
    }
  }

  try {
    await clearIndexedDbHistory()
    clearLocalStorageHistory()
  } catch (error) {
    if (!isQuotaExceededError(error)) {
      console.warn('Failed to reset image generation history after quota overflow', error)
    }
  }

  imageHistory.value = []
  return false
}

function restoreHistoryEntry(entry: ImageGenerationHistoryEntry) {
  suppressRestoreWatcher = true
  clearLocalPreviews(sourceImagePreviews.value)
  sourceImagePreviews.value = []
  resetMaskEditor()
  exitMaskEditorFullscreen()
  selectedKeyId.value = entry.selectedKeyId
  mode.value = entry.form.mode
  prompt.value = entry.form.prompt
  responseModel.value = entry.form.responseModel
  model.value = entry.form.model
  size.value = entry.form.size
  customSizeWidth.value = entry.form.customSizeWidth
  customSizeHeight.value = entry.form.customSizeHeight
  n.value = DEFAULT_COUNT
  quality.value = entry.form.quality
  background.value = entry.form.background
  outputFormat.value = entry.form.outputFormat
  outputCompression.value = entry.form.outputCompression
  advancedOpen.value = entry.form.advancedOpen
  resultImages.value = [...entry.results]
  restoredFromCache.value = true
  lastSavedAt.value = entry.savedAt
  activeHistoryId.value = entry.id
  submitError.value = ''
  queueMicrotask(() => {
    suppressRestoreWatcher = false
  })
}

function formatHistoryTime(value: string): string {
  try {
    return new Date(value).toLocaleString(locale.value)
  } catch {
    return value
  }
}

function formatHistoryMeta(entry: ImageGenerationHistoryEntry): string {
  const modeLabel = entry.form.mode === 'generate'
    ? t('imageGeneration.form.modeGenerate')
    : entry.form.mode === 'mask'
      ? t('imageGeneration.form.modeMask')
      : t('imageGeneration.form.modeEdit')
  const responseModelLabel = entry.form.responseModel || DEFAULT_RESPONSE_MODEL
  const imageModelLabel = entry.form.model || DEFAULT_MODEL
  const sizeLabel = formatHistorySize(entry.form)
  return t('imageGeneration.history.meta', {
    mode: modeLabel,
    responseModel: responseModelLabel,
    imageModel: imageModelLabel,
    size: sizeLabel,
  })
}

function formatHistorySize(form: CachedImageGenerationForm): string {
  if (form.size === CUSTOM_SIZE_VALUE) {
    return `${form.customSizeWidth}x${form.customSizeHeight}`
  }
  return form.size || DEFAULT_SIZE
}

async function copyAllImageLinks() {
  const content = resultImages.value.map((image) => image.url).join('\n')
  if (!content) return
  try {
    await writeClipboardText(content)
    appStore.showSuccess(t('imageGeneration.messages.linksCopied'))
  } catch (error: unknown) {
    appStore.showError(extractApiErrorMessage(error, t('imageGeneration.errors.copyFailed')))
  }
}

async function copyImageLink(image: ResultImage) {
  try {
    await writeClipboardText(image.url)
    appStore.showSuccess(t('imageGeneration.messages.linkCopied'))
  } catch (error: unknown) {
    appStore.showError(extractApiErrorMessage(error, t('imageGeneration.errors.copyFailed')))
  }
}

async function writeClipboardText(content: string) {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(content)
      return
    }
  } catch {
    // fallback below
  }

  const textarea = document.createElement('textarea')
  textarea.value = content
  textarea.setAttribute('readonly', 'true')
  textarea.style.position = 'fixed'
  textarea.style.left = '-9999px'
  document.body.appendChild(textarea)
  textarea.select()
  const copied = document.execCommand('copy')
  document.body.removeChild(textarea)
  if (!copied) {
    throw new Error(t('imageGeneration.errors.copyFailed'))
  }
}

function openPreview(url: string, title = '') {
  previewImageUrl.value = url
  previewImageTitle.value = title
  resetPreviewZoom()
}

function closePreview() {
  const closedUrl = previewImageUrl.value
  previewImageUrl.value = ''
  previewImageTitle.value = ''
  finishPreviewDrag()
  resetPreviewZoom()
  if (maskPreviewObjectUrl && closedUrl === maskPreviewObjectUrl) {
    URL.revokeObjectURL(maskPreviewObjectUrl)
    maskPreviewObjectUrl = null
  }
}

function handlePreviewWheel(event: WheelEvent) {
  if (!previewImageUrl.value) return
  const image = previewImageRef.value
  if (image) {
    const rect = image.getBoundingClientRect()
    if (rect.width > 0 && rect.height > 0) {
      const originX = ((event.clientX - rect.left) / rect.width) * 100
      const originY = ((event.clientY - rect.top) / rect.height) * 100
      previewImageTransformOrigin.value = `${clampNumber(originX, 0, 100)}% ${clampNumber(originY, 0, 100)}%`
    }
  }

  const wheelDelta = clampNumber(event.deltaY, -PREVIEW_MAX_WHEEL_DELTA, PREVIEW_MAX_WHEEL_DELTA)
  const nextZoom = previewImageZoom.value * Math.exp(-wheelDelta * PREVIEW_WHEEL_ZOOM_SENSITIVITY)
  previewImageZoom.value = clampNumber(nextZoom, PREVIEW_MIN_ZOOM, PREVIEW_MAX_ZOOM)
  if (previewImageZoom.value <= 1) {
    previewImageOffset.value = { x: 0, y: 0 }
    finishPreviewDrag()
  }
}

function handlePreviewPointerDown(event: PointerEvent) {
  if (event.button !== 0 || previewImageZoom.value <= 1) return
  const image = previewImageRef.value
  if (!image) return
  event.preventDefault()
  previewDragState.value = {
    pointerId: event.pointerId,
    startClientX: event.clientX,
    startClientY: event.clientY,
    startOffsetX: previewImageOffset.value.x,
    startOffsetY: previewImageOffset.value.y,
  }
  image.setPointerCapture(event.pointerId)
}

function handlePreviewPointerMove(event: PointerEvent) {
  const dragState = previewDragState.value
  if (!dragState || event.pointerId !== dragState.pointerId) return
  event.preventDefault()
  previewImageOffset.value = {
    x: dragState.startOffsetX + event.clientX - dragState.startClientX,
    y: dragState.startOffsetY + event.clientY - dragState.startClientY,
  }
}

function finishPreviewDrag(event?: PointerEvent) {
  const dragState = previewDragState.value
  if (!dragState || (event && event.pointerId !== dragState.pointerId)) return
  const image = previewImageRef.value
  if (image?.hasPointerCapture(dragState.pointerId)) {
    image.releasePointerCapture(dragState.pointerId)
  }
  previewDragState.value = null
}

function resetPreviewZoom() {
  previewImageZoom.value = 1
  previewImageTransformOrigin.value = '50% 50%'
  previewImageOffset.value = { x: 0, y: 0 }
}

function clampNumber(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function handleGlobalKeydown(event: KeyboardEvent) {
  if (event.key !== 'Escape') return
  if (previewImageUrl.value) {
    closePreview()
    return
  }
  if (maskEditorExpanded.value) {
    exitMaskEditorFullscreen()
  }
}

function restoreAdvancedSettings() {
  const parsed = readAdvancedSettings()
  if (parsed) applyAdvancedSettings(parsed)
}

function readAdvancedSettings(): CachedImageGenerationAdvancedSettings | null {
  const raw = localStorage.getItem(ADVANCED_SETTINGS_CACHE_KEY)
  if (!raw) return null

  try {
    return normalizeAdvancedSettings(JSON.parse(raw))
  } catch {
    localStorage.removeItem(ADVANCED_SETTINGS_CACHE_KEY)
    return null
  }
}

function applyAdvancedSettings(settings: CachedImageGenerationAdvancedSettings) {
  quality.value = settings.quality
  background.value = settings.background
  outputFormat.value = settings.outputFormat
  outputCompression.value = settings.outputCompression
  advancedOpen.value = settings.advancedOpen
}

function persistAdvancedSettings() {
  const payload: CachedImageGenerationAdvancedSettings = {
    quality: stringValue(quality.value),
    background: stringValue(background.value),
    outputFormat: stringValue(outputFormat.value),
    outputCompression: stringValue(outputCompression.value),
    advancedOpen: advancedOpen.value,
  }
  localStorage.setItem(ADVANCED_SETTINGS_CACHE_KEY, JSON.stringify(payload))
}

function normalizeAdvancedSettings(value: unknown): CachedImageGenerationAdvancedSettings | null {
  if (!isRecord(value)) return null
  return {
    quality: normalizeOptionValue(stringValue(value.quality), ['', 'low', 'medium', 'high']),
    background: normalizeOptionValue(stringValue(value.background), ['', 'transparent', 'opaque', 'auto']),
    outputFormat: normalizeOptionValue(stringValue(value.outputFormat), ['', 'png', 'jpeg', 'webp']),
    outputCompression: stringValue(value.outputCompression),
    advancedOpen: value.advancedOpen === true,
  }
}

function createDefaultAdvancedSettings(): CachedImageGenerationAdvancedSettings {
  return {
    quality: '',
    background: '',
    outputFormat: '',
    outputCompression: '',
    advancedOpen: false,
  }
}

async function downloadAllImages() {
  for (const [index, image] of resultImages.value.entries()) {
    await downloadImage(image, index)
  }
}

async function downloadImage(image: ResultImage, index: number) {
  try {
    if (image.url.startsWith('data:')) {
      triggerDownload(image.url, image.fileName)
      return
    }

    const response = await fetch(image.url)
    const blob = await response.blob()
    const objectUrl = URL.createObjectURL(blob)
    triggerDownload(objectUrl, image.fileName || `generated-${index + 1}.png`)
    setTimeout(() => URL.revokeObjectURL(objectUrl), 1000)
  } catch {
    window.open(image.url, '_blank', 'noopener,noreferrer')
    appStore.showInfo(t('imageGeneration.messages.openedInNewTab'))
  }
}

function triggerDownload(url: string, fileName: string) {
  const link = document.createElement('a')
  link.href = url
  link.download = fileName
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}
</script>

<style scoped>
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
