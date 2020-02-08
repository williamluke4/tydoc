import '../src'
const ctx = createContext()

it('extracts docs', () => {
  expect(
    ctx.extractDocsFromModuleAtPath(
      `
        export function a() {}
        export function b(a:boolean) {}
        export function c(a:string): number {}
      `
    )
  ).toMatchSnapshot()
})

describe('jsdoc', () => {
  it('is null when no jsDoc is present', () => {
    expect(
      ctx.extractDocsFromModuleAtPath(
        `
          export function a() {}
        `
      )[0].jsDoc
    ).toBeNull()
  })

  it('extracts doc from a variable statement', () => {
    expect(
      ctx.extractDocsFromModuleAtPath(
        `
          /**
           * primary
           */
          export function a() {}
        `
      )[0].jsDoc!.primary
    ).toMatchSnapshot()
  })

  it('splits multiple jsDoc blocks by primary and additional (closest to code is primary)', () => {
    expect(
      ctx.extractDocsFromModuleAtPath(
        `
          /**
           * additional 2
           */
          /**
           * additional 1
           */
          /**
           * primary
           */
          export function a() {}
        `
      )[0].jsDoc
    ).toMatchSnapshot()
  })

  it('whitespace and comments between multiple jsDoc blocks are ignored', () => {
    expect(
      ctx.extractDocsFromModuleAtPath(
        `
          /**
           * additional 2
           */

           // boo 2

          /**
           * additional 1
           */

           // boo 1

          /**
           * primary
           */
          export function a() {}
        `
      )[0].jsDoc
    ).toMatchSnapshot()
  })

  it.todo('keeps malformed jsdoc in raw form')
})