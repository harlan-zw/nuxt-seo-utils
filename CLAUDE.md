# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

```bash
# Install dependencies
pnpm install

# Development
pnpm dev             # Run playground development server
pnpm dev:prepare     # Build module stub and prepare test fixtures
pnpm dev:build       # Build playground

# Building
pnpm stub            # Build module stub
pnpm build           # Full module build

# Testing
pnpm test            # Run all tests
pnpm test:runtime    # Run runtime tests in fixtures/basic directory

# Linting & Type Checking
pnpm lint            # Run ESLint with auto-fix
pnpm typecheck       # Run Vue type checking
pnpm lint:docs       # Lint documentation
pnpm lint:docs:fix   # Fix documentation linting issues

# Release
pnpm release         # Build and release new version
```

## Project Architecture

### Module Structure
- `src/module.ts` - Main module entry point
- `src/build-time/` - Build-time utilities that extend Nuxt config
- `src/runtime/` - Runtime utilities and plugins
  - `app/` - Client-side composables and plugins
  - `server/` - Server-side middleware
  - `shared/` - Shared utilities between client/server
- `src/runtime/types.ts` - Runtime type definitions
- `schema.d.ts` - Module option types

### Key Features
1. **Automatic SEO meta tags** - Generates og:title, og:description from page data
2. **Metadata files support** - Next.js style public directory meta file support
3. **Canonical URL handling** - Automatic canonical URLs
4. **Breadcrumbs** - `useBreadcrumbItems` composable
5. **Route rules SEO** - SEO meta in nuxt.config and route rules
6. **Absolute URL conversion** - Converts relative to absolute for required tags
7. **i18n integration** - Works with @nuxtjs/i18n
8. **Schema.org** - Structured data integration

### Testing Structure
- Unit tests: `test/unit/`
- Integration tests: `test/integration/`
- Fixtures: `test/fixtures/` (basic, i18n)
- Runtime tests: `test/fixtures/basic/__runtime__/`
- Test runner: Vitest with @nuxt/test-utils

### Development Setup
- Package manager: pnpm (v10.11.0)
- Playground app: `/playground/` for development testing
- ESLint config: `@antfu/eslint-config`
- TypeScript: Strict mode enabled
- Build tool: `@nuxt/module-builder`

## Module Configuration

The module accepts these options in `nuxt.config.ts`:

```typescript
export default defineNuxtConfig({
  modules: ['nuxt-seo-utils'],
  seoUtils: {
    enabled: true,
    metaDataFiles: true,
    automaticOgAndTwitterTags: true,
    fallbackTitle: true,
    canonicalQueryWhitelist: [],
    redirectToCanonicalSiteUrl: true,
    debug: false
  }
})
```

## Key Composables and Utilities

- `useBreadcrumbItems()` - Generate breadcrumb navigation
- `defineOgImage()` - Define Open Graph images
- Route rules SEO meta support
- Automatic canonical URL generation
- Meta tag inference from page data

## Important Conventions

1. **Build vs Runtime**: Distinguish between build-time utilities (src/build-time/) and runtime features (src/runtime/)
2. **Type Safety**: Use TypeScript strict mode and provide proper types
3. **Testing**: Write tests for new features in appropriate test directories
4. **Playground**: Test features in the playground app before committing
5. **Linting**: Run `pnpm lint` and `pnpm typecheck` before submitting changes
