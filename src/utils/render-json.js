export function prepareRenderJson(rawContent) {
  const jsonContent = typeof rawContent === 'string'
    ? JSON.parse(rawContent)
    : JSON.parse(JSON.stringify(rawContent || {}))

  if (jsonContent && Object.prototype.hasOwnProperty.call(jsonContent, '_meta')) {
    delete jsonContent._meta
  }

  if (jsonContent && jsonContent.type && (jsonContent.entries || jsonContent.data)) {
    return jsonContent
  }

  const rootKeys = Object.keys(jsonContent || {})
  if (rootKeys.length !== 1) {
    throw new Error('加载失败，请联系管理员')
  }

  const jsonType = rootKeys[0]
  const entity = jsonContent[jsonType]
  const normalizedEntity = jsonType === 'adventureData' && entity && typeof entity === 'object'
    ? entity.data
    : entity

  if (jsonType === 'adventure') {
    return prepareAdventureMetadata(normalizedEntity)
  }

  if (normalizedEntity && typeof normalizedEntity === 'object' && !Array.isArray(normalizedEntity)) {
    if (Object.keys(normalizedEntity).length === 0) {
      return normalizedEntity
    }
    if (!Object.prototype.hasOwnProperty.call(normalizedEntity, 'translator')) {
      normalizedEntity.translator = '机翻'
    }
  }

  if (jsonType === 'data' || jsonType === 'adventureData') {
    const sectionEntries = Array.isArray(normalizedEntity)
      ? unwrapNestedEntries(normalizedEntity)
      : [normalizedEntity]
    return {
      type: 'section',
      entries: sectionEntries
    }
  }

  if (normalizedEntity && typeof normalizedEntity === 'object' && Object.prototype.hasOwnProperty.call(normalizedEntity, 'type')) {
    return normalizedEntity
  }

  return {
    type: 'statblockInline',
    dataType: jsonType,
    data: normalizedEntity
  }
}

function unwrapNestedEntries(entries) {
  let currentEntries = entries
  while (Array.isArray(currentEntries) && currentEntries.length === 1 && Array.isArray(currentEntries[0])) {
    currentEntries = currentEntries[0]
  }
  return currentEntries
}

function prepareAdventureMetadata(adventure) {
  if (!adventure || typeof adventure !== 'object') {
    return {
      type: 'section',
      entries: []
    }
  }

  const entries = []
  if (adventure.cover && adventure.cover.url) {
    entries.push({
      type: 'image',
      href: adventure.cover,
      title: adventure.name || ''
    })
  }

  const details = [
    adventure.storyline ? `故事线：${adventure.storyline}` : '',
    adventure.author ? `作者：${adventure.author}` : '',
    adventure.published ? `发布日期：${adventure.published}` : '',
    formatAdventureLevel(adventure.level)
  ].filter(Boolean)
  if (details.length) {
    entries.push({
      type: 'list',
      items: details
    })
  }

  const contents = Array.isArray(adventure.contents) ? adventure.contents : []
  contents.forEach((content) => {
    const chapterEntries = Array.isArray(content.headers)
      ? content.headers.map(header => ({
        type: 'entries',
        name: header,
        entries: []
      }))
      : []
    entries.push({
      type: 'section',
      name: content.name || adventure.name || '',
      entries: chapterEntries
    })
  })

  return {
    type: 'section',
    name: adventure.name || '',
    entries
  }
}

function formatAdventureLevel(level) {
  if (!level || typeof level !== 'object') {
    return ''
  }
  if (level.start && level.end && level.start !== level.end) {
    return `等级：${level.start}-${level.end}`
  }
  const value = level.start || level.end
  return value ? `等级：${value}` : ''
}
