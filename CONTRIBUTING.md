# Contributing

## Adding support for a bank

Most banks are handled by the generic CSV importer already. Write a parser only when a bank issues
statements as PDFs with no CSV option.

One bank is one file. It exports a `StatementParser`, ships a fixture and a test, and touches no
shared code. Do not commit a real statement — generate a synthetic fixture in the same layout.

## House rules

These exist because the alternative is a codebase that drifts a little with every change.

**Structure**

- `packages/core` imports nothing from React, the DOM or any browser API.
- Feature folders, not type folders. There is no `utils/`.
- Money is whole minor units in the `Money` type. Floats never touch a balance.
- Anything that decides what a number *means* belongs in `core` with a test, not in a component.

**Code**

- No comments that restate the code. A comment explains a non-obvious *why*, or it is deleted.
- The second use site earns an abstraction. The first does not.
- Components take data, not flags. No `variant`, `isCompact` or `mode` props stacking up.
- Colours, spacing and radii come from tokens. No hex values and no arbitrary Tailwind values in
  components.
- TypeScript strict. No `any`, no non-null `!`, no type assertions outside a library boundary.
- Prefer a named function to a clever expression.

**Design**

- Colour encodes data. Buttons, tabs, selection and focus are ink and grey.
- One hero number per screen.
- Every figure carries an explicit sign, so meaning never depends on colour alone.

## Before opening a pull request

```bash
pnpm typecheck
pnpm test
pnpm build
```

Tests that assert real totals are worth more than tests that assert a function was called.
