export function isWordCardDismissKey(key) {
  return key === 'Escape' || key === 'Esc'
}

export function shouldDismissWordCardOnPointer(options = {}) {
  return Boolean(options.isOpen && !options.isInsideCard && !options.isWordToken && !options.isReaderControl)
}
