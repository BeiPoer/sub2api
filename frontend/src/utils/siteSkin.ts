export const siteSkins = [
  { value: 'default', label: 'admin.settings.site.skin_default', description: 'admin.settings.site.skin_default_hint', colors: ['#F9FAFB', '#0F172A', '#14B8A6', '#5EEAD4'] },
  { value: 'editorial', label: 'admin.settings.site.skin_editorial', description: 'admin.settings.site.skin_editorial_hint', colors: ['#F6F3EC', '#25231F', '#B9472B', '#ED9477'] },
  { value: 'fantasy', label: 'admin.settings.site.skin_fantasy', description: 'admin.settings.site.skin_fantasy_hint', colors: ['#FFFFFF', '#6D0076', '#0075C2', '#FF8600'] },
  { value: 'caramellatte', label: 'admin.settings.site.skin_caramellatte', description: 'admin.settings.site.skin_caramellatte_hint', colors: ['#FFF7ED', '#000000', '#370A00', '#8C3F27'] },
  { value: 'flexfolio', label: 'admin.settings.site.skin_flexfolio', description: 'admin.settings.site.skin_flexfolio_hint', colors: ['#F5F5F5', '#FBE5EA', '#FA7818', '#241B16'] },
  { value: 'aiwork', label: 'admin.settings.site.skin_aiwork', description: 'admin.settings.site.skin_aiwork_hint', colors: ['#F7F7F8', '#FFFFFF', '#245DED', '#34363B'] },
  { value: 'agentory', label: 'admin.settings.site.skin_agentory', description: 'admin.settings.site.skin_agentory_hint', colors: ['#0B0B0B', '#FF6200', '#FFF6EF', '#292524'] },
  { value: 'rescale', label: 'admin.settings.site.skin_rescale', description: 'admin.settings.site.skin_rescale_hint', colors: ['#F7F9FC', '#695AC1', '#82D2E4', '#DCCCF4'] },
  { value: 'clear', label: 'admin.settings.site.skin_clear', description: 'admin.settings.site.skin_clear_hint', colors: ['#EFF5FF', '#172033', '#076FEE', '#FFFFFF'] },
  { value: 'press', label: 'admin.settings.site.skin_press', description: 'admin.settings.site.skin_press_hint', colors: ['#F5F2E9', '#202020', '#F4D94E', '#FFFFFF'] },
  { value: 'outline', label: 'admin.settings.site.skin_outline', description: 'admin.settings.site.skin_outline_hint', colors: ['#FAFAF9', '#27272A', '#D4D4D8', '#FFFFFF'] },
  { value: 'workspace', label: 'admin.settings.site.skin_workspace', description: 'admin.settings.site.skin_workspace_hint', colors: ['#EAEFF4', '#FFFFFF', '#355C63', '#17272C'] },
  { value: 'instrument', label: 'admin.settings.site.skin_instrument', description: 'admin.settings.site.skin_instrument_hint', colors: ['#DFE3DF', '#25302B', '#3D5527', '#D6EF65'] },
  { value: 'folio', label: 'admin.settings.site.skin_folio', description: 'admin.settings.site.skin_folio_hint', colors: ['#E9E5DB', '#FFFDF7', '#9E4538', '#302D29'] },
  { value: 'softblock', label: 'admin.settings.site.skin_softblock', description: 'admin.settings.site.skin_softblock_hint', colors: ['#F0EEF6', '#FFFFFF', '#6960A2', '#DDD8E9'] },
  { value: 'bluehour', label: 'admin.settings.site.skin_bluehour', description: 'admin.settings.site.skin_bluehour_hint', colors: ['#EDF1F6', '#203A60', '#284B79', '#FFFFFF'] },
  { value: 'swiss', label: 'admin.settings.site.skin_swiss', description: 'admin.settings.site.skin_swiss_hint', colors: ['#FAF9F6', '#252525', '#C63830', '#C8C8C5'] },
  { value: 'ribbon', label: 'admin.settings.site.skin_ribbon', description: 'admin.settings.site.skin_ribbon_hint', colors: ['#F1F4F1', '#367B6B', '#AE8D63', '#FFFFFF'] },
] as const

export type SiteSkin = typeof siteSkins[number]['value']

export function normalizeSiteSkin(value: unknown): SiteSkin {
  return siteSkins.find(skin => skin.value === value)?.value ?? 'default'
}
