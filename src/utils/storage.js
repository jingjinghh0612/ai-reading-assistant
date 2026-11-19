export function getStorageItem(key, fallbackValue = '') {
  try {
    return localStorage.getItem(key) ?? fallbackValue
  } catch {
    return fallbackValue
  }
}

export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, value)
    return true
  } catch {
    return false
  }
}

export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key)
  } catch {
    // 阅读位置仍可在当前页面中使用。
  }
}
