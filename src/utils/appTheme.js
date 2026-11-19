import { readonly, ref } from 'vue'
import { getStorageItem, setStorageItem } from './storage.js'

export const APP_THEMES = [
  { id: 'classic', label: '经典蓝白' },
  { id: 'paper', label: '暖纸' },
  { id: 'night', label: '夜读' },
]

const storageKey = 'ai-reading-app-theme'
const defaultTheme = APP_THEMES[0].id
const storedTheme = getStorageItem(storageKey, defaultTheme)
const selectedTheme = ref(isAppTheme(storedTheme) ? storedTheme : defaultTheme)

export const appTheme = readonly(selectedTheme)

function isAppTheme(value) {
  return APP_THEMES.some((theme) => theme.id === value)
}

export function applyAppTheme() {
  document.documentElement.dataset.appTheme = selectedTheme.value
}

export function selectAppTheme(value) {
  if (!isAppTheme(value) || value === selectedTheme.value) {
    return
  }
  selectedTheme.value = value
  applyAppTheme()
  setStorageItem(storageKey, value)
}
