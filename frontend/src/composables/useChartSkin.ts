import { computed, ref } from 'vue'
import { useMutationObserver } from '@vueuse/core'
import type { ChartOptions } from 'chart.js'

/** Canvas colors must be refreshed when the document skin or light mode changes. */
export function useChartSkin() {
  const appearance = ref('')
  const refresh = () => {
    appearance.value = `${document.documentElement.dataset.skin}:${document.documentElement.className}`
  }
  refresh()
  useMutationObserver(document.documentElement, refresh, {
    attributes: true,
    attributeFilter: ['data-skin', 'class'],
  })
  const palette = computed(() => {
    const skin = appearance.value.split(':')[0]
    if (!skin || skin === 'default') return null
    const style = getComputedStyle(document.documentElement)
    const color = (name: string) => style.getPropertyValue(name).trim()
    return { text: color('--muted'), ink: color('--ink'), grid: color('--rule'), panel: color('--panel'), accent: color('--mark') }
  })

  function skinOptions<T extends object>(options: T): T {
    const colors = palette.value
    if (!colors) return options
    const base = options as ChartOptions<'line'>
    const plugins = base.plugins
    return {
      ...options,
      color: colors.text,
      plugins: {
        ...plugins,
        legend: { ...plugins?.legend, labels: { ...plugins?.legend?.labels, color: colors.text } },
        title: { ...plugins?.title, color: colors.ink },
        tooltip: {
          ...plugins?.tooltip,
          backgroundColor: colors.panel,
          titleColor: colors.ink,
          bodyColor: colors.text,
          footerColor: colors.text,
          borderColor: colors.grid,
          borderWidth: 1,
        },
      },
      ...(base.scales ? { scales: Object.fromEntries(Object.entries(base.scales).map(([id, scale]) => [id, {
        ...scale,
        grid: { ...scale?.grid, color: colors.grid },
        border: { ...scale?.border, color: colors.grid },
        ticks: { ...scale?.ticks, color: colors.text },
        title: { ...scale?.title, color: colors.text },
      }])) } : {}),
    }
  }
  return { skinOptions, palette }
}
