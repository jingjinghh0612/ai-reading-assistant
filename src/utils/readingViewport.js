const sentenceSelector = '[data-reader-sentence-id]'
const readDelay = 800
const saveDelay = 250

function getViewport(area) {
  const top = area.getBoundingClientRect().top + area.clientTop
  return { top, bottom: top + area.clientHeight }
}

export function hasEnoughVisibleHeight(sentence, viewport) {
  const visibleHeight = Math.min(sentence.bottom, viewport.bottom) - Math.max(sentence.top, viewport.top)
  const targetHeight = Math.min(sentence.bottom - sentence.top, viewport.bottom - viewport.top) / 2
  return targetHeight > 0 && visibleHeight >= targetHeight
}

export function restoreReadingSentence(area, sentenceId) {
  const sentence = sentenceId && Array.from(area.querySelectorAll(sentenceSelector))
    .find((element) => element.dataset.readerSentenceId === sentenceId)

  if (!sentence) {
    area.scrollTop = 0
    return
  }

  area.scrollTop += sentence.getBoundingClientRect().top - getViewport(area).top
}

export function trackReadingViewport(area, { isRead, onRead, onPosition, initiallyPaused }) {
  const sentences = [...area.querySelectorAll(sentenceSelector)]
  const visible = new Set()
  const visibleSince = new Map()
  let paused = initiallyPaused
  let pageHidden = false
  let stopped = false
  let frame = 0
  let readTimer = 0
  let saveTimer = 0
  let lastScrollTop = area.scrollTop
  let lastSentenceId = null

  function canTrack() {
    return !paused && !pageHidden && !document.hidden && !stopped
  }

  function sample() {
    frame = 0
    clearTimeout(readTimer)
    if (!canTrack()) {
      visibleSince.clear()
      return
    }

    const viewport = getViewport(area)
    const now = performance.now()
    const completed = []
    let nextDeadline = Infinity

    for (const element of observer ? visible : sentences) {
      const id = element.dataset.readerSentenceId
      if (isRead(id) || !hasEnoughVisibleHeight(element.getBoundingClientRect(), viewport)) {
        visibleSince.delete(element)
        continue
      }

      const since = visibleSince.get(element) ?? now
      const deadline = since + readDelay
      if (now >= deadline) {
        completed.push(id)
        visibleSince.delete(element)
      } else {
        visibleSince.set(element, since)
        nextDeadline = Math.min(nextDeadline, deadline)
      }
    }

    if (completed.length) {
      onRead(completed)
    }
    if (Number.isFinite(nextDeadline)) {
      readTimer = window.setTimeout(scheduleSample, Math.ceil(nextDeadline - now))
    }
  }

  function scheduleSample() {
    if (!frame && canTrack()) {
      frame = requestAnimationFrame(sample)
    }
  }

  function flushPosition() {
    if (!saveTimer && (paused || area.scrollTop === lastScrollTop)) {
      return
    }
    clearTimeout(saveTimer)
    saveTimer = 0
    lastScrollTop = area.scrollTop
    const viewport = getViewport(area)
    const sentence = sentences.find((element) => {
      const bounds = element.getBoundingClientRect()
      return bounds.bottom > viewport.top && bounds.top < viewport.bottom
    })
    const id = sentence?.dataset.readerSentenceId
    if (id && id !== lastSentenceId) {
      lastSentenceId = id
      onPosition(id)
    }
  }

  function onScroll() {
    scheduleSample()
    if (canTrack() && area.scrollTop !== lastScrollTop) {
      lastScrollTop = area.scrollTop
      if (!saveTimer) {
        saveTimer = window.setTimeout(flushPosition, saveDelay)
      }
    }
  }

  function syncScrollPosition() {
    lastScrollTop = area.scrollTop
    scheduleSample()
  }

  function updateVisibility() {
    if (canTrack()) {
      syncScrollPosition()
    } else {
      flushPosition()
      clearTimeout(readTimer)
      visibleSince.clear()
    }
  }

  function onPageHide() {
    pageHidden = true
    updateVisibility()
  }

  function onPageShow() {
    pageHidden = false
    updateVisibility()
  }

  const observer = typeof IntersectionObserver === 'function' ? new IntersectionObserver((entries) => {
    for (const { target, isIntersecting } of entries) {
      if (isIntersecting) {
        visible.add(target)
      } else {
        visible.delete(target)
        visibleSince.delete(target)
      }
    }
    scheduleSample()
  }, { root: area, threshold: [0, 0.5] }) : null

  const resizeObserver = typeof ResizeObserver === 'function' ? new ResizeObserver(scheduleSample) : null
  const paper = area.querySelector('.workspace-reading-paper')
  resizeObserver?.observe(area)
  if (paper) {
    resizeObserver?.observe(paper)
  }
  for (const sentence of sentences) {
    observer?.observe(sentence)
  }
  area.addEventListener('scroll', onScroll, { passive: true })
  document.addEventListener('visibilitychange', updateVisibility)
  window.addEventListener('pagehide', onPageHide)
  window.addEventListener('pageshow', onPageShow)
  scheduleSample()

  return {
    flushPosition,
    syncScrollPosition,
    setPaused(value) {
      if (value) {
        flushPosition()
      }
      paused = value
      updateVisibility()
    },
    stop() {
      flushPosition()
      stopped = true
      cancelAnimationFrame(frame)
      clearTimeout(readTimer)
      observer?.disconnect()
      resizeObserver?.disconnect()
      area.removeEventListener('scroll', onScroll)
      document.removeEventListener('visibilitychange', updateVisibility)
      window.removeEventListener('pagehide', onPageHide)
      window.removeEventListener('pageshow', onPageShow)
    },
  }
}
