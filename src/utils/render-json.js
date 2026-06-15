export function prepareRenderJson(rawContent) {
  const jsonContent = typeof rawContent === 'string'
    ? JSON.parse(rawContent)
    : JSON.parse(JSON.stringify(rawContent || {}))

  if (jsonContent && Object.prototype.hasOwnProperty.call(jsonContent, '_meta')) {
    delete jsonContent._meta
  }

  if (isClassData(jsonContent)) {
    return prepareClassData(jsonContent)
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

  if (jsonType === 'backgroundFluff') {
    return prepareNamedFluff(normalizedEntity)
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

function isClassData(jsonContent) {
  if (!jsonContent || typeof jsonContent !== 'object' || Array.isArray(jsonContent)) {
    return false
  }
  return [
    'class',
    'subclass',
    'classFeature',
    'subclassFeature',
    'classFluff',
    'subclassFluff'
  ].some(key => {
    const value = jsonContent[key]
    return Array.isArray(value) || (value && typeof value === 'object')
  })
}

function prepareClassData(jsonContent) {
  const classes = normalizeEntityCollection(jsonContent.class)
  const subclasses = normalizeEntityCollection(jsonContent.subclass)
  const classFeatures = normalizeEntityCollection(jsonContent.classFeature)
  const subclassFeatures = normalizeEntityCollection(jsonContent.subclassFeature)
  const classFluff = normalizeEntityCollection(jsonContent.classFluff)
  const subclassFluff = normalizeEntityCollection(jsonContent.subclassFluff)
  const classNames = new Set([
    ...classes.map(item => item.name),
    ...subclasses.map(item => item.className),
    ...classFeatures.map(item => item.className),
    ...subclassFeatures.map(item => item.className),
    ...classFluff.map(item => item.name),
    ...subclassFluff.map(item => item.className)
  ].filter(Boolean))

  const entries = Array.from(classNames).map(className => {
    const classData = classes.find(item => item.name === className)
    const currentClassFluff = classFluff.filter(item => item.name === className)
    const currentClassFeatures = classFeatures.filter(item => item.className === className)
    const currentSubclasses = subclasses.filter(item => item.className === className)
    const currentSubclassFeatures = subclassFeatures.filter(item => item.className === className)
    const currentSubclassFluff = subclassFluff.filter(item => item.className === className)
    const classEntries = []

    if (classData) {
      classEntries.push(...getEntityDescriptionEntries(classData))
    }
    currentClassFluff.forEach(item => {
      classEntries.push(...getEntityDescriptionEntries(item))
    })
    if (currentClassFeatures.length) {
      classEntries.push({
        type: 'section',
        name: '职业特性',
        entries: currentClassFeatures.map(prepareFeatureEntry)
      })
    }

    currentSubclasses.forEach(subclass => {
      const features = currentSubclassFeatures.filter(feature => {
        return feature.subclassShortName === subclass.shortName &&
          feature.subclassSource === subclass.source
      })
      classEntries.push(prepareSubclassEntry(subclass, features))
    })

    currentSubclassFluff.forEach(item => {
      classEntries.push(prepareSubclassEntry(item, []))
    })

    const matchedFeatures = new Set(
      currentSubclasses.flatMap(subclass => {
        return currentSubclassFeatures
          .filter(feature => {
            return feature.subclassShortName === subclass.shortName &&
              feature.subclassSource === subclass.source
          })
          .map(feature => feature)
      })
    )
    const unmatchedFeatures = currentSubclassFeatures.filter(feature => !matchedFeatures.has(feature))
    if (unmatchedFeatures.length) {
      classEntries.push({
        type: 'section',
        name: '其他子职特性',
        entries: unmatchedFeatures.map(prepareFeatureEntry)
      })
    }

    return {
      type: 'section',
      name: className,
      entries: classEntries
    }
  })

  return {
    type: 'section',
    name: '职业与子职',
    entries
  }
}

function normalizeEntityCollection(value) {
  if (Array.isArray(value)) {
    return value
  }
  return value && typeof value === 'object' ? [value] : []
}

function prepareNamedFluff(value) {
  const fluffEntries = normalizeEntityCollection(value).map(entity => ({
    type: 'section',
    name: entity.name || '未命名背景',
    entries: getEntityDescriptionEntries(entity)
  }))

  if (fluffEntries.length === 1) {
    return fluffEntries[0]
  }

  return {
    type: 'section',
    name: '背景描述',
    entries: fluffEntries
  }
}

function prepareSubclassEntry(subclass, features) {
  const details = [
    subclass.shortName && subclass.shortName !== subclass.name ? `简称：${subclass.shortName}` : '',
    subclass.source ? `来源：${subclass.source}` : '',
    subclass.page ? `页码：${subclass.page}` : ''
  ].filter(Boolean)
  const entries = [
    ...getEntityDescriptionEntries(subclass)
  ]
  if (details.length) {
    entries.unshift({
      type: 'list',
      items: details
    })
  }
  entries.push(...features.map(prepareFeatureEntry))
  return {
    type: 'section',
    name: subclass.name || subclass.shortName || '未命名子职',
    entries
  }
}

function prepareFeatureEntry(feature) {
  const level = feature.level ? `${feature.level}级` : ''
  const name = [feature.name || '未命名特性', level].filter(Boolean).join('（') + (level ? '）' : '')
  return {
    type: 'entries',
    name,
    entries: getEntityDescriptionEntries(feature)
  }
}

function getEntityDescriptionEntries(entity) {
  if (!entity || typeof entity !== 'object') {
    return []
  }
  const entries = Array.isArray(entity.entries) ? [...entity.entries] : []
  if (entity.entry !== undefined) {
    entries.push(entity.entry)
  }
  if (Array.isArray(entity.images)) {
    entries.push(...entity.images)
  }
  return entries
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
