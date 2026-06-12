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
