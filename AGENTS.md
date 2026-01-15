# DOT Videos - Agent Development Guide

This guide helps agentic coding agents understand and work effectively with the DOT Videos codebase - a Bible video hosting platform powered by Brightcove.

## Project Overview

DOT Videos is a Deaf Owned Translation platform for hosting and organizing Bible videos in a structured format. The platform serves as a digital Bible interface with video content from Brightcove, supporting multiple languages and offline capabilities.

### Technology Stack
- **Framework**: Astro 5.12.8 with server-side rendering
- **UI Framework**: SolidJS for reactive components  
- **Language**: TypeScript (strict mode)
- **Styling**: UnoCSS with custom utility classes
- **PWA**: Service worker with offline capabilities
- **Deployment**: Cloudflare Pages
- **Video**: Brightcove Video.js integration
- **Internationalization**: English/French support

## Development Commands

### Current Commands
```bash
# Development
pnpm dev              # Start development server with --host
pnpm start            # Alias for dev

# Building  
pnpm build            # Production build
pnpm build-tr         # Build with trace warnings for debugging
pnpm preview          # Preview production build locally
pnpm preview-cf       # Cloudflare Pages preview with wrangler
pnpm cf-dev           # Development with Cloudflare proxy

# Quality Assurance
pnpm lint             # Run ESLint on entire codebase
pnpm check            # Run Astro type checking

# Package Management
pnpm install          # Install dependencies
```

### Recommended Testing Commands (To Add)
```bash
# E2E Testing with Playwright (Recommended Setup)
pnpm test:e2e         # Run Playwright e2e tests
pnpm test:e2e:ui      # Run Playwright with UI interface
pnpm test:e2e:debug   # Debug Playwright tests
pnpm test:e2e:install # Install Playwright browsers
```

## Code Style Guidelines

### Import Patterns & Path Aliases
Always use configured path aliases for clean imports:

```typescript
// Components
import { Header } from "@components/Header";
import { VideoPlayer } from "@components/Player";

// Layouts
import Layout from "@layouts/Layout";

// Utilities and libraries
import { formatDuration } from "@utils";
import { getPlaylistData } from "@lib/routes";
import { i18n } from "@i18n/index";

// Types
import type { IVidWithCustom, userPreferencesI } from "@customTypes/types";
```

### Component Patterns

#### SolidJS Components
```typescript
// Use signals for reactive state
const [isPlaying, setIsPlaying] = createSignal(false);
const [currentTime, setCurrentTime] = createSignal(0);

// Use effects for side effects
createEffect(() => {
  if (isPlaying()) {
    // Handle play state
  }
});

// Props interface
interface VideoPlayerProps {
  video: IVidWithCustom;
  onTimeUpdate?: (time: number) => void;
}

export function VideoPlayer(props: VideoPlayerProps) {
  // Component logic
  return (
    <div class="video-container">
      {/* JSX content */}
    </div>
  );
}
```

#### Astro Pages/Components
```astro
---
// Frontmatter for server-side logic
import Layout from "@layouts/Layout.astro";
import { getUserPreferences } from "@utils";

const userPreferences = getUserPreferences(Astro);
const data = await fetchData();
---

<Layout title="DOT Videos">
  <main>
    <slot />
  </main>
</Layout>
```

### Naming Conventions
- **Components**: PascalCase (`VideoPlayer.tsx`, `Header.tsx`, `AppWrapper.tsx`)
- **Functions**: camelCase (`formatDuration`, `getUserPreferences`, `mutateSortVidsArray`)
- **Constants**: UPPER_SNAKE_CASE (`BibleBookCategories`, `PLAYER_LOADER_OPTIONS`)
- **Files**: 
  - Components: PascalCase (`VideoPlayer.tsx`)
  - Utilities: camelCase (`utils.ts`)
  - Pages: kebab-case (`book-chapter.astro`) or index for folders

### TypeScript Guidelines
- Always type function parameters and return values
- Use interfaces for object shapes
- Leverage the existing type definitions in `@customTypes/types`
- Maintain strict mode compliance

```typescript
// Good example
export function formatDuration(milliseconds: number): string {
  const seconds = Math.floor(milliseconds / 1000);
  // Implementation
}

// Use existing types
import type { IVidWithCustom, userPreferencesI } from "@customTypes/types";

const processVideos = (videos: IVidWithCustom[]): IVidWithCustom[] => {
  // Processing logic
};
```

### Styling Guidelines

#### UnoCSS Utilities
Use atomic UnoCSS classes for styling:

```typescript
// Layout
<div class="grid grid-cols-1 md:grid-cols-2 gap-4 p-4">

// Typography
<h1 class="text-2xl font-bold text-primary">Title</h1>

// Responsive design
<div class="w-full md:w-1/2 lg:w-1/3">

// Custom utilities from uno.config.ts
<div class="grid-col-fill-200">Custom grid</div>
<div class="scrollbar-hide">Hide scrollbar</div>
```

#### CSS Variables & Theming
Use CSS custom properties defined in `global.css`:

```css
/* Available theme colors */
--clrSurface    /* Background color */
--clrBase       /* Text color */  
--clrPrimary    /* Primary accent color */
--clrSecondary  /* Secondary accent color */
--clrTertiary   /* Tertiary accent color */
```

```typescript
// Apply theme colors
<div class="bg-base text-surface">
  <button class="bg-primary text-base hover:bg-secondary">
    Button
  </button>
</div>
```

#### Dark/Light Theme Support
- Use CSS custom properties for automatic theme switching
- Theme is controlled via `.dark` and `.light` classes on `<html>` element
- User preference is stored in cookies

## Project Structure

```
src/
├── components/          # SolidJS components
│   ├── Player/         # Video player components
│   ├── PlayerNavigation/ # Navigation controls
│   ├── DownloadForm/   # Download functionality
│   └── Icons.tsx       # Icon components
├── pages/              # Astro pages and API routes
│   ├── api/           # API endpoints (Brightcove integration)
│   ├── [bookChap]/    # Dynamic routing for books/chapters
│   ├── index.astro    # Home page
│   └── 404.astro      # Error page
├── layouts/            # Astro layout components
│   └── Layout.astro   # Main site layout
├── lib/               # Utilities and business logic
│   ├── utils.ts       # General utility functions
│   ├── routes.ts      # API route handlers
│   ├── UI.ts          # UI helper functions
│   ├── store.ts       # State management
│   └── pwa.ts         # PWA configuration
├── i18n/              # Internationalization
│   ├── index.ts       # I18n configuration
│   ├── en.ts         # English translations
│   └── fr.ts         # French translations
├── customTypes/        # TypeScript type definitions
├── images/            # Image assets
├── constants.ts       # Application constants
├── domainConfig.ts    # Domain-specific configurations
├── env.d.ts          # Environment variable types
└── global.css        # Global styles and theme variables
```

## Key Architectural Patterns

### Data Flow
1. **Brightcove API** → Astro server-side data fetching → SolidJS client components
2. **I18n** via `@solid-primitives/i18n` with locale detection from headers
3. **State Management** through SolidJS signals and createEffect
4. **PWA** capabilities via custom service worker implementation

### Video Integration
- Video.js player with Brightcove integration
- Custom fields for Bible book/chapter mapping
- Playlist data processing and sorting
- Chapter markers and navigation

### Internationalization
- Currently supports English (`en`) and French (`fr`)
- Locale detection from `Accept-Language` headers
- Dynamic imports for translation files
- Add new locales to `supportedLanguages` array in `src/i18n/index.ts`

### Domain Configuration
Multiple domains are supported via `src/domainConfig.ts`:
- Each domain maps to specific Brightcove playlists
- Configuration includes display names and playlist IDs
- Used for multi-site deployment from single codebase

## Testing Strategy

### Recommended E2E Test Coverage
When implementing Playwright testing, focus on these critical user flows:

1. **Page Load Test**
   - Home page renders successfully
   - Video list loads from Brightcove API
   - No console errors

2. **Navigation Tests**
   - Navigate between books in the Bible
   - Navigate between chapters within books
   - Dynamic routing (`/[bookChap]`) works correctly
   - Browser back/forward navigation

3. **Theme Toggle**
   - Switch between light and dark modes
   - Theme preference persists (cookie-based)
   - UI updates correctly for both themes

4. **Video Functionality**
   - Video playback controls work
   - Chapter markers function properly
   - Video download functionality completes
   - Progress bar and seeking work

5. **Responsive Design**
   - Mobile layout (below md breakpoint)
   - Tablet layout (md breakpoint)
   - Desktop layout (lg breakpoint and above)

### Test Structure Recommendation
```
tests/
├── e2e/
│   ├── setup.ts          # Global test setup
│   ├── page-load.spec.ts # Basic page loading tests
│   ├── navigation.spec.ts # Book/chapter navigation
│   ├── video-playback.spec.ts # Video functionality
│   ├── theme-toggle.spec.ts   # Theme switching
│   ├── download.spec.ts       # Download functionality
│   └── responsive.spec.ts      # Responsive design
├── fixtures/
│   └── test-data.ts     # Mock data and test helpers
└── config/
    └── playwright.config.ts # Playwright configuration
```

## Development Workflow

### Before Making Changes
1. Ensure clean working directory: `git status`
2. Run quality checks: `pnpm lint` and `pnpm check`
3. Create feature branch from `develop` branch
4. Test changes locally with `pnpm dev`

### Before Committing
1. Fix any linting issues: `pnpm lint`
2. Verify TypeScript types: `pnpm check`  
3. Run e2e tests: `pnpm test:e2e`
4. Test production build: `pnpm build`
5. Verify PWA functionality in preview mode

### Common Development Tasks

#### Adding New Components
1. Create component file in appropriate `src/components/` subdirectory
2. Follow SolidJS patterns with proper TypeScript typing
3. Use UnoCSS utilities for styling
4. Export component and add to barrel exports if needed

#### Adding New Pages/Routes
1. Create `.astro` file in `src/pages/`
2. Use existing layout pattern with proper props
3. Handle data fetching in frontmatter
4. Ensure proper TypeScript types for props

#### Internationalization Updates
1. Add translation keys to both `en.ts` and `fr.ts`
2. Use the `t()` function from `@solid-primitives/i18n` in components
3. Test both language variants
4. Update supported languages if adding new locales

#### Styling Updates
1. Prefer UnoCSS utilities over custom CSS
2. Add custom utilities to `uno.config.ts` if needed
3. Use CSS custom properties for theme-aware values
4. Test both light and dark themes

## Important Configuration Details

### ESLint Configuration
- TypeScript strict mode enforcement
- Astro JSX accessibility rules
- SolidJS-specific linting rules
- Custom overrides for different file types
- Automatic fixing of most linting issues

### TypeScript Configuration
- Strict mode enabled with comprehensive type checking
- Path aliases configured for clean imports
- JSX preserve setting for SolidJS compatibility
- Cloudflare worker types included for serverless functions

### UnoCSS Configuration
- Custom theme colors via CSS custom properties
- Custom utility rules for specialized grid layouts
- Montserrat font family configuration
- Responsive breakpoint utilities

### PWA Configuration
- Service worker with custom caching strategies
- Offline video download capabilities
- App manifest for mobile installation
- Background sync for offline functionality

## Special Considerations

### Performance Optimizations
- Bundle size monitoring via rollup-plugin-visualizer
- Lazy loading of video.js localization files
- Efficient image optimization and serving
- Service worker caching for offline access

### Accessibility
- ESLint jsx-a11y rules enforced
- Semantic HTML5 structure
- Keyboard navigation support
- Screen reader compatibility
- ARIA labels where needed

### Security
- Environment variables properly configured
- Cloudflare Workers security headers
- Content Security Policy considerations
- Safe handling of Brightcove API credentials

### Deployment Notes
- Multi-domain support via configuration
- Cloudflare Pages automatic deployments
- PWA features require HTTPS
- Build optimization for various deployment targets

This guide should provide all the essential information for agentic coding agents to work effectively with the DOT Videos codebase while maintaining code quality, consistency, and functionality across the platform.