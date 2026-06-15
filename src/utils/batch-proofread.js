export function cleanImportedText(rawText) {
  const lines = String(rawText || '')
    .replace(/\r\n?/g, '\n')
    .replace(/```[\s\S]*?```/g, '\n')
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/<[^>]+>/g, '')
    .split('\n')

  const segments = []
  let buffer = ''
  lines.forEach((rawLine) => {
    const isHeading = /^\s{0,3}#{1,6}\s+/.test(rawLine)
    const isList = /^\s*(?:[-*+]|\d+[.)])\s+/.test(rawLine)
    const line = rawLine
      .replace(/^\s{0,3}#{1,6}\s+/, '')
      .replace(/^\s*>\s?/, '')
      .replace(/^\s*(?:[-*+]|\d+[.)])\s+/, '')
      .replace(/[*_~`]/g, '')
      .trim()

    if (!line) {
      pushSegment(segments, buffer)
      buffer = ''
      return
    }
    if (isHeading || isList) {
      pushSegment(segments, buffer)
      buffer = ''
      pushSegment(segments, line)
      return
    }
    if (buffer && !/[。！？!?；;：:]$/.test(buffer)) {
      buffer += line
    } else {
      pushSegment(segments, buffer)
      buffer = line
    }
  })
  pushSegment(segments, buffer)
  return segments.filter(segment => segment.length > 1 && !isLikelyNoise(segment))
}

export function buildBatchMatches(jobs, rawText) {
  const targets = getBatchTargets(jobs)
  const segments = cleanImportedText(rawText)
  const pairs = alignSequences(targets, segments)
  const tagDictionary = buildTagDictionary(jobs || [])

  return pairs.map(({ job, segment, score }) => {
    const restored = restoreTags(job.en_str, segment, tagDictionary)
    const confidence = score >= 0.68 ? 'high' : score >= 0.48 ? 'medium' : 'low'
    return {
      selected: confidence === 'high' && restored.unresolvedTags.length === 0,
      job,
      cn: restored.text,
      sourceText: segment,
      score: Math.round(score * 100),
      confidence,
      unresolvedTags: restored.unresolvedTags
    }
  })
}

export function getBatchTargets(jobs) {
  return (jobs || []).filter(job => {
    return job &&
      job.en_str &&
      Number(job.is_proofread) !== 1 &&
      Number(job.is_key) !== 1
  })
}

export function prepareImportedTranslation(job, segment, jobs) {
  return restoreTags(job.en_str, segment, buildTagDictionary(jobs || []))
}

export function getCopyableTagPairs(english, chinese) {
  const enTags = parseTags(english)
  const cnTags = parseTags(chinese)
  const used = new Set()
  return enTags.map((enTag, index) => {
    let cnIndex = cnTags.findIndex((cnTag, candidateIndex) => {
      return !used.has(candidateIndex) && cnTag.type === enTag.type
    })
    if (cnIndex === -1 && cnTags[index] && !used.has(index)) {
      cnIndex = index
    }
    if (cnIndex !== -1) used.add(cnIndex)
    return {
      en: enTag.raw,
      cn: cnIndex === -1 ? enTag.raw : cnTags[cnIndex].raw
    }
  })
}

export function validateTranslationTags(english, chinese) {
  const source = String(english || '')
  const translation = String(chinese || '')
  const sourceTagStarts = countOccurrences(source, '{@')
  const translationTagStarts = countOccurrences(translation, '{@')
  const sourceBraces = countOccurrences(source, '}')
  const translationBraces = countOccurrences(translation, '}')

  if (sourceTagStarts !== translationTagStarts || sourceBraces !== translationBraces) {
    return {
      valid: false,
      message: `标记符数量不一致（英文 ${sourceTagStarts} 个 TAG，中文 ${translationTagStarts} 个 TAG）`
    }
  }

  const sourceTypes = extractTagTypes(source)
  const translationTypes = extractTagTypes(translation)
  if (
    sourceTypes.length !== sourceTagStarts ||
    translationTypes.length !== translationTagStarts ||
    !hasValidTagBalance(source) ||
    !hasValidTagBalance(translation)
  ) {
    return {
      valid: false,
      message: '存在未闭合或格式错误的 TAG'
    }
  }

  const mismatchIndex = sourceTypes.findIndex((type, index) => type !== translationTypes[index])
  if (mismatchIndex !== -1) {
    return {
      valid: false,
      message: `第 ${mismatchIndex + 1} 个 TAG 类型不一致（应为 {@${sourceTypes[mismatchIndex]}}）`
    }
  }

  return {
    valid: true,
    message: ''
  }
}

function countOccurrences(value, substring) {
  return String(value || '').split(substring).length - 1
}

function extractTagTypes(value) {
  const types = []
  const pattern = /\{@([^\s}]+)/g
  let match = pattern.exec(String(value || ''))
  while (match) {
    types.push(match[1].toLowerCase())
    match = pattern.exec(String(value || ''))
  }
  return types
}

function hasValidTagBalance(value) {
  const text = String(value || '')
  let depth = 0
  for (let index = 0; index < text.length; index++) {
    if (text.slice(index, index + 2) === '{@') {
      depth++
      index++
      continue
    }
    if (text[index] === '}' && depth > 0) {
      depth--
    }
  }
  return depth === 0
}

function pushSegment(segments, value) {
  const normalized = String(value || '').replace(/\s+/g, ' ').trim()
  if (normalized) segments.push(normalized)
}

function isLikelyNoise(text) {
  return /^(?:第?\s*\d+\s*页|page\s*\d+|目录|contents|copyright)$/i.test(text)
}

function alignSequences(jobs, segments) {
  const rows = jobs.length + 1
  const cols = segments.length + 1
  const dp = Array.from({ length: rows }, () => Array(cols).fill(-Infinity))
  const trace = Array.from({ length: rows }, () => Array(cols).fill(null))
  dp[0][0] = 0

  for (let i = 0; i <= jobs.length; i++) {
    for (let j = 0; j <= segments.length; j++) {
      const current = dp[i][j]
      if (!Number.isFinite(current)) continue
      if (i < jobs.length && current - 0.28 > dp[i + 1][j]) {
        dp[i + 1][j] = current - 0.28
        trace[i + 1][j] = { i, j, type: 'skip-job' }
      }
      if (j < segments.length && current - 0.2 > dp[i][j + 1]) {
        dp[i][j + 1] = current - 0.2
        trace[i][j + 1] = { i, j, type: 'skip-segment' }
      }
      if (i < jobs.length && j < segments.length) {
        const score = getMatchScore(jobs[i], segments[j], i, j, jobs.length, segments.length)
        const value = current + score
        if (value > dp[i + 1][j + 1]) {
          dp[i + 1][j + 1] = value
          trace[i + 1][j + 1] = { i, j, type: 'match', score }
        }
      }
    }
  }

  const matches = []
  let i = jobs.length
  let j = segments.length
  while (i > 0 || j > 0) {
    const step = trace[i][j]
    if (!step) break
    if (step.type === 'match' && step.score >= 0.38) {
      matches.push({
        job: jobs[step.i],
        segment: segments[step.j],
        score: step.score
      })
    }
    i = step.i
    j = step.j
  }
  return matches.reverse()
}

function getMatchScore(job, chinese, jobIndex, segmentIndex, jobCount, segmentCount) {
  const english = stripTags(job.en_str)
  const enLength = Math.max(english.replace(/\s+/g, '').length, 1)
  const cnLength = Math.max(chinese.replace(/\s+/g, '').length, 1)
  const ratio = cnLength / enLength
  const lengthScore = Math.max(0, 1 - Math.abs(Math.log(ratio / 0.55)) / 1.5)
  const numberScore = getNumberScore(english, chinese)
  const headingScore = getHeadingScore(english, chinese)
  const enPosition = jobCount > 1 ? jobIndex / (jobCount - 1) : 0
  const cnPosition = segmentCount > 1 ? segmentIndex / (segmentCount - 1) : 0
  const positionScore = Math.max(0, 1 - Math.abs(enPosition - cnPosition) * 2)
  return (lengthScore * 0.4) + (numberScore * 0.25) + (headingScore * 0.15) + (positionScore * 0.2)
}

function getNumberScore(english, chinese) {
  const enNumbers = english.match(/\d+(?:\.\d+)?/g) || []
  const cnNumbers = chinese.match(/\d+(?:\.\d+)?/g) || []
  if (!enNumbers.length && !cnNumbers.length) return 0.7
  if (!enNumbers.length || !cnNumbers.length) return 0
  const matched = enNumbers.filter(number => cnNumbers.includes(number)).length
  return matched / Math.max(enNumbers.length, cnNumbers.length)
}

function getHeadingScore(english, chinese) {
  const enShort = english.length <= 80
  const cnShort = chinese.length <= 35
  return enShort === cnShort ? 1 : 0.2
}

function buildTagDictionary(jobs) {
  const dictionary = {}
  jobs.forEach((job) => {
    if (!job.en_str || !job.cn_str || job.en_str === job.cn_str) return
    const enTags = parseTags(job.en_str)
    const cnTags = parseTags(job.cn_str)
    enTags.forEach((enTag, index) => {
      const cnTag = cnTags.find((tag, cnIndex) => cnIndex === index || tag.type === enTag.type)
      if (!cnTag) return
      dictionary[getTagKey(enTag, true)] = cnTag
      dictionary[getTagKey(enTag, false)] = cnTag
    })
  })
  return dictionary
}

function restoreTags(english, chinese, dictionary) {
  let text = chinese
  const unresolvedTags = []
  parseTags(english).forEach((enTag) => {
    const cnTag = dictionary[getTagKey(enTag, true)] || dictionary[getTagKey(enTag, false)]
    if (!cnTag) {
      unresolvedTags.push(enTag.raw)
      return
    }
    if (text.includes(cnTag.raw)) {
      return
    }
    const candidates = [cnTag.display, cnTag.entity].filter(Boolean).sort((a, b) => b.length - a.length)
    const candidate = candidates.find(value => text.includes(value))
    if (!candidate) {
      unresolvedTags.push(enTag.raw)
      return
    }
    const replaced = replaceOutsideTags(text, candidate, cnTag.raw)
    if (replaced === text) {
      unresolvedTags.push(enTag.raw)
      return
    }
    text = replaced
  })
  return { text, unresolvedTags }
}

function parseTags(text) {
  const tags = []
  const value = String(text || '')
  let index = 0
  while (index < value.length) {
    const start = value.indexOf('{@', index)
    if (start === -1) break
    let depth = 1
    let cursor = start + 2
    while (cursor < value.length && depth > 0) {
      if (value.slice(cursor, cursor + 2) === '{@') {
        depth++
        cursor += 2
        continue
      }
      if (value[cursor] === '}') depth--
      cursor++
    }
    if (depth !== 0) break
    const raw = value.slice(start, cursor)
    const space = raw.indexOf(' ')
    const type = space === -1 ? raw.slice(2, -1) : raw.slice(2, space)
    const parts = splitTagParts(space === -1 ? '' : raw.slice(space + 1, -1))
    tags.push({
      raw,
      type,
      entity: parts[0] || '',
      source: parts[1] || '',
      display: parts[2] || parts[0] || ''
    })
    index = cursor
  }
  return tags
}

function splitTagParts(value) {
  const parts = []
  let buffer = ''
  let depth = 0
  for (let index = 0; index < value.length; index++) {
    if (value.slice(index, index + 2) === '{@') {
      depth++
      buffer += '{@'
      index++
      continue
    }
    if (value[index] === '}' && depth > 0) depth--
    if (value[index] === '|' && depth === 0) {
      parts.push(buffer)
      buffer = ''
    } else {
      buffer += value[index]
    }
  }
  parts.push(buffer)
  return parts
}

function getTagKey(tag, includeSource) {
  const values = [tag.type, tag.entity]
  if (includeSource) values.push(tag.source)
  return values.map(value => String(value || '').trim().toLowerCase()).join('|')
}

function replaceOutsideTags(text, search, replacement) {
  let result = ''
  let index = 0
  let depth = 0
  while (index < text.length) {
    if (text.slice(index, index + 2) === '{@') {
      depth++
      result += '{@'
      index += 2
      continue
    }
    if (text[index] === '}' && depth > 0) {
      depth--
      result += text[index]
      index++
      continue
    }
    if (depth === 0 && text.slice(index, index + search.length) === search) {
      return result + replacement + text.slice(index + search.length)
    }
    result += text[index]
    index++
  }
  return text
}

function stripTags(text) {
  return String(text || '').replace(/\{@[^ ]+\s+([^}|]+)(?:\|[^}]*)?}/g, '$1')
}
