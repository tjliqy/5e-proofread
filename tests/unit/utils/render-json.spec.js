import { prepareRenderJson } from '@/utils/render-json'

describe('prepareRenderJson', () => {
  it('prepares a split subclassFluff object for recursive rendering', () => {
    const result = prepareRenderJson({
      _meta: {
        internalCopies: ['subclassFluff']
      },
      subclassFluff: {
        name: 'College of Spirits',
        shortName: 'Spirits',
        source: 'RHW',
        className: 'Bard',
        images: [
          {
            type: 'image',
            href: {
              type: 'internal',
              path: 'classes/RHW/College of Spirits Bard.webp'
            }
          }
        ]
      }
    })

    expect(result.type).toBe('section')
    expect(result.entries).toHaveLength(1)
    expect(result.entries[0].name).toBe('Bard')
    expect(result.entries[0].entries[0]).toMatchObject({
      type: 'section',
      name: 'College of Spirits'
    })
    expect(result.entries[0].entries[0].entries).toContainEqual(
      expect.objectContaining({
        type: 'image'
      })
    )
  })

  it('continues to prepare array-based class data', () => {
    const result = prepareRenderJson({
      subclassFluff: [
        {
          name: 'College of Lore',
          className: 'Bard',
          entries: ['Known for collecting knowledge.']
        }
      ]
    })

    expect(result.entries[0].entries[0].entries).toContain(
      'Known for collecting knowledge.'
    )
  })

  it('preserves the title when preparing backgroundFluff', () => {
    const result = prepareRenderJson({
      backgroundFluff: {
        name: 'Haunted One',
        source: 'RHW',
        entries: [
          'You are haunted by the events of your past.'
        ],
        images: [
          {
            type: 'image',
            href: {
              type: 'internal',
              path: 'backgrounds/RHW/Haunted One.webp'
            }
          }
        ]
      }
    })

    expect(result).toMatchObject({
      type: 'section',
      name: 'Haunted One'
    })
    expect(result.entries).toContain(
      'You are haunted by the events of your past.'
    )
    expect(result.entries).toContainEqual(
      expect.objectContaining({
        type: 'image'
      })
    )
  })

  it('prepares array-based backgroundFluff as named sections', () => {
    const result = prepareRenderJson({
      backgroundFluff: [
        {
          name: 'Acolyte',
          entries: ['Temple service.']
        },
        {
          name: 'Criminal',
          entries: ['A history of crime.']
        }
      ]
    })

    expect(result).toMatchObject({
      type: 'section',
      name: '背景描述'
    })
    expect(result.entries.map(entry => entry.name)).toEqual([
      'Acolyte',
      'Criminal'
    ])
  })
})
