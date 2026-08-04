# Unhead v2 compatibility fixture

The main test suite runs against the Unhead **v3** stack (the root pnpm workspace
pins `@unhead/vue`/`unhead` to v3 so Nuxt's renderer stays coherent). This fixture
guards the **v2** stack, which can't coexist in the same workspace because the
unhead major is global.

It is a standalone npm project (excluded from the pnpm workspace) that links the
local module via `file:module.tgz`. It installs a v2 host with Nuxt 4.2,
`@unhead/vue@2`, and `unhead@2`. The module imports `@unhead/vue` directly
through its v2 exports and skips the v3-only Vite transform. A successful render
proves those imports resolve on v2 and that the `InferSeoMetaPlugin` and
`TemplateParamsPlugin` runtime registrations still run.

## Run

From the repo root:

```sh
pnpm test:compat-v2
```

`run.mjs` builds the module, packs it (so pnpm `catalog:` refs are resolved into
versions npm can install), copies this fixture into a temp directory **outside the
repo**, installs the isolated v2 stack there, and runs the test. The temp dir is
required: nested under the repo, the workspace's hoisted (v3) `node_modules` leaks
into Nuxt's module resolution and breaks the v2 build.

The manifest is committed as `package.template.json` rather than `package.json` so
the workspace's pnpm `catalog:` tooling leaves it alone.

To add it to CI, run `pnpm test:compat-v2` as a separate job (it needs its own
install, so keep it out of the main vitest run).
