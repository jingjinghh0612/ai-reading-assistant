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
