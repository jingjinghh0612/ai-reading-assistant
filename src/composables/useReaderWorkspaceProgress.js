import { nextTick, onBeforeUnmount, shallowReactive, watch } from 'vue'
import { getReadingProgressKey, loadReadingCoverage, mergeReadingCoverage } from '../utils/bookImport.js'
import { getReadingResume, removeReadingResume, saveReadingResume } from '../utils/readingResume.js'
import { restoreReadingSentence, trackReadingViewport } from '../utils/readingViewport.js'

export function useReaderWorkspaceProgress({ readingArea, readingContext, isPaperVisible, isObscured }) {
  const coverage = shallowReactive(new Map())
  const positions = new Map()
  let tracker = null

  function getReadSentenceIds(bookId, chapterId) {
    return coverage.get(getReadingProgressKey(bookId, chapterId))
  }

  function mergeCoverage(key, sentenceIds) {
    const previous = coverage.get(key)
    if (!previous || sentenceIds.some((id) => !previous.has(id))) {
      coverage.set(key, new Set([...(previous || []), ...sentenceIds]))
    }
  }

  async function loadCoverage() {
    for (const { id, sentenceIds } of await loadReadingCoverage()) {
      if (Array.isArray(sentenceIds)) {
        mergeCoverage(id, sentenceIds)
      }
    }
  }

  async function recordRead(context, sentenceIds) {
    const key = getReadingProgressKey(context.bookId, context.chapterId)
    mergeCoverage(key, sentenceIds)
    if (!context.isTemporary) {
      const storedIds = await mergeReadingCoverage({ ...context, sentenceIds: [...coverage.get(key)] })
      if (storedIds && coverage.has(key)) {
        mergeCoverage(key, storedIds)
      }
    }
  }

  function getPosition(bookId, chapterId, isTemporary) {
    const key = getReadingProgressKey(bookId, chapterId)
    return positions.get(key) || (!isTemporary && getReadingResume(bookId, chapterId)) || null
  }

  function getResumeChapterId(book) {
    const saved = getPosition(book.id, null, book.isTemporary)
    return book.chapters.some((chapter) => chapter.id === saved) ? saved : book.chapters[0]?.id
  }

  function recordPosition({ bookId, chapterId, isTemporary }, sentenceId) {
    positions.set(getReadingProgressKey(bookId, null), chapterId)
    if (sentenceId) {
      positions.set(getReadingProgressKey(bookId, chapterId), sentenceId)
    }
    if (!isTemporary) {
      saveReadingResume(bookId, chapterId, sentenceId)
    }
  }

  function stopReading() {
    tracker?.stop()
    tracker = null
  }

  function forgetReading(bookId, chapterIds, isTemporary) {
    positions.delete(getReadingProgressKey(bookId, null))
    for (const chapterId of chapterIds) {
      const key = getReadingProgressKey(bookId, chapterId)
      positions.delete(key)
      coverage.delete(key)
    }
    if (!isTemporary) {
      removeReadingResume(bookId, chapterIds)
    }
  }

  watch([readingArea, readingContext, isPaperVisible], async ([area, context, visible], _, onCleanup) => {
    stopReading()
    if (!area || !context || !visible) {
      return
    }

    let cancelled = false
    onCleanup(() => { cancelled = true })
    await nextTick()
    if (cancelled) {
      return
    }

    const { bookId, chapterId, isTemporary } = context
    restoreReadingSentence(area, getPosition(bookId, chapterId, isTemporary))
    recordPosition(context)
    tracker = trackReadingViewport(area, {
      isRead: (id) => getReadSentenceIds(bookId, chapterId)?.has(id),
      onRead: (ids) => recordRead(context, ids),
      onPosition: (id) => recordPosition(context, id),
      initiallyPaused: isObscured.value,
    })
  })

  watch(isObscured, (obscured) => tracker?.setPaused(obscured), { flush: 'sync' })
  onBeforeUnmount(stopReading)

  return {
    getReadSentenceIds,
    getResumeChapterId,
    loadCoverage,
    stopReading,
    forgetReading,
    flushPosition: () => tracker?.flushPosition(),
    syncScrollPosition: () => tracker?.syncScrollPosition(),
  }
}
