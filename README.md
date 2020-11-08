```
Work in progress 👷‍
```

# tydoc <!-- omit in toc -->

<!-- START doctoc generated TOC please keep comment here to allow auto update -->
<!-- DON'T EDIT THIS SECTION, INSTEAD RE-RUN doctoc TO UPDATE -->


- [Features](#features)
  - [CLI](#cli)
  - [JSON Representation](#json-representation)
  - [Automatic Main-Entrypoint Detection](#automatic-main-entrypoint-detection)
  - [Multiple Entrypoint Support](#multiple-entrypoint-support)
  - [Named Exports](#named-exports)
  - [Main Export](#main-export)
  - [Type Index](#type-index)
    - [Non-exported types of named exports](#non-exported-types-of-named-exports)
    - [Types of named exports reference the type index](#types-of-named-exports-reference-the-type-index)
  - [TsDoc](#tsdoc)
    - [Module Level TsDoc](#module-level-tsdoc)
- [API](#api)
  - [`renderMarkdown`](#rendermarkdown)
  - [`fromProject`](#fromproject)
  - [`fromModule`](#frommodule)
  - [Exported Types](#exported-types)
    - [`I` `RenderMarkdownOptions`](#i-rendermarkdownoptions)
  - [Type Index](#type-index-1)
    - [`I` `Options`](#i-options)
    - [`T` `DocPackage`](#t-docpackage)
    - [`&` `DocModule`](#-docmodule)
    - [`T` `TSDocFrag`](#t-tsdocfrag)
    - [`I` `TSDoc`](#i-tsdoc)
    - [`&` `DocTypeUnion`](#-doctypeunion)
    - [`|` `Node`](#-node)
    - [`T` `DocTypePrimitive`](#t-doctypeprimitive)
    - [`T` `DocTypeLiteral`](#t-doctypeliteral)
    - [`&` `DocTypeAlias`](#-doctypealias)
    - [`T` `RawFrag`](#t-rawfrag)
    - [`&` `DocTypeInterface`](#-doctypeinterface)
    - [`T` `DocProp`](#t-docprop)
    - [`&` `DocTypeCallable`](#-doctypecallable)
    - [`T` `DocSig`](#t-docsig)
    - [`T` `DocSigParam`](#t-docsigparam)
    - [`T` `DocTypeArray`](#t-doctypearray)
    - [`&` `DocTypeObject`](#-doctypeobject)
    - [`T` `DocTypeIndexRef`](#t-doctypeindexref)
    - [`&` `DocUnsupported`](#-docunsupported)
    - [`&` `DocTypeIntersection`](#-doctypeintersection)
    - [`T` `Expor`](#t-expor)
    - [`I` `Options`](#i-options-1)
    - [`I` `Settings`](#i-settings)
    - [`F` `Thunk`](#f-thunk)

<!-- END doctoc generated TOC please keep comment here to allow auto update -->

## Features

### CLI

Tydoc comes with a CLI. Use the `project` sub-command at the root of your node package (where `package.json` resides) to generate your API documentation.

```
cd my/node/package
tydoc project <entrypoint1> <entrypoint2> ...
```

Pass as many entrypoints as there are in your node package. All paths given are relative to your source root. Source root is the `rootDir` as configured in your `tsconfig.json`. If not set then source root is the current working directory.

### JSON Representation

Tydoc can extract documentation as JSON so that you can render it however you want. The structure is fully typed. You can leverage the typings like so:

```ts
import docPackageJson from './extracted/tydoc/json/file.json'
import DocPackage from 'tydoc/types'

const docs = docPackageJson as DocPackage
```

The types are extensively documented inline so read them to learn more about the shape/schema of the JSON data and semantics of fields therein (e.g. is a path relative or not).

### Automatic Main-Entrypoint Detection

All valid Node packages must specify their main entrtypoint in `package.json` like so:

```json
// package.json
{
  "name": "somePackage",
  "main": "./path/to/main.js"
}
```

The main entrypoint can be imported without path qualification, while all other module imports from the package must be done via explicit paths:

```ts
import { foo } from 'somePackage' // <somePackagePath>/path/to/main.js
import { bar } from 'somePackage/not/main/one'
import { qux } from 'somePackage/not/main/two'
```

Tydoc takes advantage of this to automatically detect when the entrypoint it is extracting is the main one or not.

For example:

```
$ tydoc project path/to/main
```

Leads to extracted JSON:

```json
{
  "modules": [
    {
      "isMain": true
      // ...
    }
  ]
}
```

### Multiple Entrypoint Support

Tydoc supports packages with multiple entrypoints.

A package with multiple entrypoints means that your package has more than one module where your users are allowed to import things from. For example in the following `b.ts` and `c.ts` are official entrypoints into the package in addition to `a`.

```
a.ts
b.ts
c.ts
package.json  <-  "name": "some-package"
```

Thus allowing users to do e.g.:

```ts
import { foo } from 'some-package' // a
import { bar } from 'some-package/b'
import { qux } from 'some-package/c'
```

Tydoc accepts multiple entrypoints on the CLI:

```
tydoc project a b c
```

### Named Exports

Tydoc captures all named exports of a module.

For example:

```ts
export const a = 0
export const b = 1
export const c = 2
```

```json
{
  "modules": [
    {
      "namedExports": [
        {
          "name": "a"
          //...
        },
        {
          "name": "b"
          //...
        },
        {
          "name": "c"
          //...
        }
      ]
      //...
    }
  ]
  // ...
}
```

### Main Export

Tydoc captures the main export of a module. The "main" export is the one exported using `export default ...` syntax. Note that main exports are nameless by design and so Tydoc will naturally not extract a name either.

For example:

```ts
const a = 0
export default a
```

```json
{
  "modules": [
    {
      "mainExport": {
        // ...
      }
      //...
  ]
  //...
}
```

### Type Index

The types in a package are potentially a graph of references, so Tydoc always creates a type index. When Tydoc is extracting type information from your package, it keeps extracted types in the type index rather than documenting types inline.

#### Non-exported types of named exports

For example in the following module `Foo` is not exported. But since the exported term `foo` references it, it will still be part of the type index.

```ts
type Foo = { a: string }

export const foo: Foo = { a: 'bar' }
```

```json
{
  "modules": [
    {
      "namedExports": [
        {
          "kind": "export",
          "name": "foo",
          "type": {
            "kind": "typeIndexRef",
            "link": "(test).Foo"
          },
          "isType": false,
          "isTerm": true
        }
      ]
      // ...
    }
  ],
  "typeIndex": {
    "(test).Foo": {
      "kind": "alias",
      "name": "Foo",
      "type": {
        "kind": "object",
        "props": [
          {
            "kind": "prop",
            "name": "a",
            "type": {
              "kind": "primitive",
              "type": "string"
            }
          }
        ]
        // ...
      }
      // ...
    }
  }
}
```

#### Types of named exports reference the type index

For example in the following module the `Foo` type will be indexed and referenced by the two named exports here. Note that `Foo` type is treated as both a named export and a type in the type index. Tydoc decouples the concepts.

```ts
export type Foo = { a: string }

export const foo: Foo = { a: 'bar' }
```

```json
{
  "modules": [
    {
      "namedExports": [
        {
          "kind": "export",
          "name": "Foo",
          "type": {
            "kind": "typeIndexRef",
            "link": "(test).Foo"
          },
          "isType": true,
          "isTerm": false
        },
        {
          "kind": "export",
          "name": "foo",
          "type": {
            "kind": "typeIndexRef",
            "link": "(test).Foo"
          },
          "isType": false,
          "isTerm": true
        }
      ]
      // ...
    }
  ],
  "typeIndex": {
    "(test).Foo": {
      "kind": "alias",
      "name": "Foo",
      "type": {
        "kind": "object",
        "props": [
          {
            "kind": "prop",
            "name": "a",
            "type": {
              "kind": "primitive",
              "type": "string"
            }
          }
        ]
        // ...
      }
      // ...
    }
  }
}
```

### TsDoc

TyDoc supports TsDoc which is a stricter version of JsDoc.

#### Module Level TsDoc

If you write TsDoc at the top of your module then it will be treated as module-level documentation.

For example:

```ts
/**
 * Welcome to MyAwesomePackage...
 */
```

```json
{
  "modules": [
    {
      "tsdoc": {
        "raw": "/**\n * Welcome to MyAwesomePackage...\n */",
        "summary": "Welcome to MyAwesomePackage...",
        "examples": [],
        "customTags": []
      }
      // ...
    }
  ]
}
```

Note that if you have non-import syntax below the the TsDoc then the TsDoc will be assumed to be part of that syntax node.

For example:

```ts
/**
 * Welcome to MyAwesomePackage...
 */

function foo() {}
```

```json
{
  "modules": [
    {
      "tsdoc": null
      // ...
    }
  ]
}
```

To handle this case, make sure that the syntax node has its _own_ TsDoc.

For example:

```ts
/**
 * Welcome to MyAwesomePackage...
 */

/**
 * Whatever
 */
function foo() {}
```

```json
{
  "modules": [
    {
      "tsdoc": {
        "raw": "/**\n * Welcome to MyAwesomePackage...\n */",
        "summary": "Welcome to MyAwesomePackage...",
        "examples": [],
        "customTags": []
      }
      // ...
    }
  ]
}
```

## API

<!-- START API DOCS --->

### `renderMarkdown`

<!-- prettier-ignore -->
```ts
(docs: DocPackage, opts: Options) => string
```

### `fromProject`

<!-- prettier-ignore -->
```ts
(opts: Options) => DocPackage
```

### `fromModule`

<!-- prettier-ignore -->
```ts
(manager: Manager, sourceFile: SourceFile) => DocPackage
```

### Exported Types

#### `I` `RenderMarkdownOptions`

```ts
typeIndexRef
```

### Type Index

#### `I` `Options`

```ts
export interface Options {
  /**
   * Whether or not the API terms section should have a title and nest its term
   * entries under it. If false, term entry titles are de-nested by one level.
   */
  flatTermsSection: boolean
}
```

#### `T` `DocPackage`

```ts
//
// Package node
//

export type DocPackage = {
  modules: DocModule[]
  typeIndex: TypeIndex
}
```

#### `&` `DocModule`

````ts
//
// Module Node
//

export type DocModule = TSDocFrag & {
  kind: 'module'
  name: string
  /**
   * The path to this module from package root. If this module is the root
   * module then the path will be `/`.
   *
   * @remarks
   *
   * This is what a user would place in their import `from `string _following_ the
   * package name. For example:
   *
   * ```ts
   * import foo from "@foo/bar/quux/toto"
   * //                       ^^^^^^^^^^
   * ```
   */
  path: string
  isMain: boolean
  mainExport: null | Node
  namedExports: Expor[]
  location: {
    absoluteFilePath: string
  }
}
````

#### `T` `TSDocFrag`

```ts
//
// Node Features
//

export type TSDocFrag = {
  tsdoc: null | TSDoc
}
```

#### `I` `TSDoc`

```ts
export interface TSDoc {
  raw: string
  summary: string
  examples: { text: string }[]
  customTags: { name: string; text: string }[]
}
```

#### `&` `DocTypeUnion`

```ts
//
// Union Node
//

export type DocTypeUnion = {
  kind: 'union'
  isDiscriminated: boolean
  discriminantProperties: null | string[]
  types: Node[]
} & RawFrag
```

#### `|` `Node`

```ts
export type Node =
  | DocTypeUnion
  | DocTypePrimitive
  | DocTypeLiteral
  | DocTypeAlias
  | DocTypeInterface
  | DocTypeCallable
  | DocTypeArray
  | DocTypeObject
  | DocTypeIndexRef
  | DocUnsupported
  | DocTypeIntersection
  // todo unused?
  | { kind: 'function'; signatures: DocSig[] }
  | ({
      kind: 'callable_object'
      signatures: DocSig[]
      properties: DocProp[]
    } & RawFrag)
  | ({
      kind: 'callable_interface'
      properties: DocProp[]
      signatures: DocSig[]
    } & RawFrag)
```

#### `T` `DocTypePrimitive`

```ts
export type DocTypePrimitive = { kind: 'primitive'; type: string }
```

#### `T` `DocTypeLiteral`

```ts
export type DocTypeLiteral = { kind: 'literal'; base: string }
```

#### `&` `DocTypeAlias`

```ts
export type DocTypeAlias = {
  kind: 'alias'
  name: string
  type: Node
} & RawFrag &
  TSDocFrag
```

#### `T` `RawFrag`

```ts
export type RawFrag = {
  raw: {
    typeText: string
    nodeText: string
    nodeFullText: string
  }
}
```

#### `&` `DocTypeInterface`

```ts
export type DocTypeInterface = {
  kind: 'interface'
  name: string
  props: DocProp[]
} & RawFrag &
  TSDocFrag
```

#### `T` `DocProp`

```ts
export type DocProp = { kind: 'prop'; name: string; type: Node }
```

#### `&` `DocTypeCallable`

```ts
export type DocTypeCallable = {
  kind: 'callable'
  isOverloaded: boolean
  hasProps: boolean
  sigs: DocSig[]
  props: DocProp[]
} & RawFrag
```

#### `T` `DocSig`

```ts
export type DocSig = { kind: 'sig'; params: DocSigParam[]; return: Node }
```

#### `T` `DocSigParam`

```ts
export type DocSigParam = { kind: 'sigParam'; name: string; type: Node }
```

#### `T` `DocTypeArray`

```ts
export type DocTypeArray = { kind: 'array'; innerType: Node }
```

#### `&` `DocTypeObject`

```ts
export type DocTypeObject = { kind: 'object'; props: DocProp[] } & RawFrag
```

#### `T` `DocTypeIndexRef`

````ts
/**
 * A link to the type index. All named types go into the type index. When a type
 * or export includes a named type, rather than documenting it inline, a
 * reference to the type index is created.
 *
 */
export type DocTypeIndexRef = {
  kind: 'typeIndexRef'
  /**
   * An identifier that can be used to lookup the type in the type index.
   *
   * @example
   *
   * ```ts
   * docs.typeIndex[typeIndexRef.link]
   * ```
   */
  link: string
}
````

#### `&` `DocUnsupported`

```ts
export type DocUnsupported = { kind: 'unsupported' } & RawFrag
```

#### `&` `DocTypeIntersection`

```ts
//
// Intersection Node
//

export type DocTypeIntersection = {
  kind: 'intersection'
  types: Node[]
} & RawFrag
```

#### `T` `Expor`

```ts
//
// Export Node
//

export type Expor = {
  kind: 'export'
  name: string
  isTerm: boolean
  isType: boolean
  type: Node
}
```

#### `I` `Options`

````ts
interface Options {
  /**
   * Paths to modules in project, relative to project root or absolute.
   */
  entrypoints: string[]
  project?: tsm.Project
  /**
   * Specify the path to the package's entrypoint file.
   *
   * @defualt Read from package.json main field
   * @remarks This is useful for tests to avoid mocks or environment setup
   */
  packageMainEntrypoint?: string
  /**
   * Specify the root of the project.
   *
   * @default The current working directory
   * @remarks This is useful for tests to avoid having to mock process.cwd
   */
  prjDir?: string
  readSettingsFromJSON: boolean
  /**
   * Sometimes a source entrypoint is fronted by a facade module that allows
   * package consumers to do e.g. `import foo from "bar/toto"` _instead of_
   * `import foo from "bar/dist/toto". Use this mapping to force tydoc to view
   * the given source modules (keys) at the given package path (values).
   *
   * @example
   *
   * Given project layout:
   *
   * ```
   * /src/foo/bar/toto.ts
   * ```
   *
   * The setting:
   *
   * ```ts
   * sourceModuleToPackagePathMappings: {
   *    "foo/bar/toto": "toto"
   * }
   * ```
   *
   * Will cause the `toto` module to be documented as being available at path:
   *
   * ```ts
   * import some from "thing/toto"
   * ```
   */
  sourceModuleToPackagePathMappings?: Record<string, string>
}
````

#### `I` `Settings`

```ts
export interface Settings {
  /**
   * Absolute path to the source root. This should match the path that rootDir
   * resolves to from the project's tsconfig.json.
   */
  srcDir: string
  prjDir: string
  mainModuleFilePathAbs: string
  sourceModuleToPackagePathMappings?: Record<string, string>
}
```

#### `F` `Thunk`

<!-- prettier-ignore -->
```ts
export type Thunk<T> = () => T
```

<!-- END API DOCS --->
