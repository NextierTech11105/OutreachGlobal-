# UI COMPONENT STRUCTURE AUDIT
## OutreachGlobal Frontend - Structural & Component Analysis
**Date:** 2026-01-06
**Role:** Expert Frontend Architect & UI/UX Auditor

---

# 📂 FILE STRUCTURE & NAMING

## Rating: 🟢 CLEAN (with minor issues)

### Directory Structure

```
apps/front/src/
├── app/              443 files   Next.js App Router
├── components/       309 files   Reusable UI components
├── features/         154 files   Feature modules (21 features)
├── lib/              134 files   Utilities & services
├── hooks/             10 files   Custom React hooks
├── config/             8 files   Configuration
├── stores/             1 file    State management
├── providers/          -         Context providers
├── graphql/            -         GraphQL types
└── types/              -         TypeScript definitions

Total: 1,080 files | 357,945 lines of code
```

### Architecture Pattern

**HYBRID: Features-Based + Type-Based**

Each feature module contains:
```
features/campaign/
├── components/     Feature-specific UI
├── queries/        GraphQL queries
├── mutations/      GraphQL mutations
├── hooks/          Feature hooks
├── types/          Feature types
└── form/           Form logic
```

**21 Feature Modules:**
- analytics, auth, campaign, integration, lead
- message, message-template, power-dialer, prompt
- property, report, sdr, sendgrid, signalhouse
- team, triggers, twilio, user, workflow

### Naming Convention Compliance

| Aspect | Status | Notes |
|--------|--------|-------|
| Component files | ✅ 100% kebab-case | `advanced-search.tsx`, `action-bar.tsx` |
| Feature files | ✅ kebab-case | `campaign-workflow.ts` |
| Library files | ✅ kebab-case | `apollo-client.ts`, `api-auth.ts` |
| PascalCase violations | ✅ NONE | 0 detected |
| camelCase violations | ✅ Minimal | Only in utilities |

### Issues Found

**Bloated Page Files (42 pages > 1000 lines):**

| File | Lines | Issue |
|------|-------|-------|
| `properties/page.tsx` | 3,616 | Massive - needs extraction |
| `valuation/page.tsx` | 3,403 | Complex logic inline |
| `data-hub/page.tsx` | 2,925 | Extensive filtering |
| `sectors/[id]/page.tsx` | 2,912 | Heavy feature logic |
| `import-companies/page.tsx` | 2,568 | Multi-step forms |

**Generic Names (Minor):**
- `lib/utils.ts` - Acceptable
- `lib/db.ts` - Acceptable
- `lib/http.ts` - Acceptable

### Refactor Plan

1. **Extract from bloated pages:**
   - `properties/page.tsx` → `PropertyFilters`, `PropertyMap`, `PropertyTable` components
   - `valuation/page.tsx` → `ValuationCalculator`, `ValuationFilters` components
   - Target: Reduce all pages to <400 lines

2. **Establish pattern:**
   ```typescript
   // page.tsx should be thin wrapper
   export default function Page() {
     return <FeatureContainer />;
   }
   ```

---

# 🧩 COMPONENT LIBRARY HEALTH

## Button Consistency: 79% ✅

| Metric | Value |
|--------|-------|
| Button component imports | 339 files |
| Raw `<button>` tags | 91 occurrences |
| Usage rate | **79%** using Button primitive |

### Button Primitive Features

**Variants (7):**
- `default` - Primary blue
- `destructive` - Red/delete
- `outline` - Border-based
- `outline-solid` - Stronger border
- `secondary` - Secondary styling
- `ghost` - Transparent hover
- `link` - Text link

**Sizes (5):**
- `xs`, `sm`, `default`, `lg`, `icon`

**States:**
- ✅ `loading` - Spinner + disabled
- ✅ `disabled` - 517 occurrences
- ✅ `aria-invalid` - Form validation

### Icon Set: 100% Consistent ✅

| Library | Imports | Status |
|---------|---------|--------|
| lucide-react | 158 | PRIMARY |
| heroicons | 0 | NOT USED |
| react-icons | 0 | NOT USED |

**Common icons:** ArrowLeft, ArrowRight, Plus, Edit, Trash, Check, X, Settings, Search

### Typography Scale

| Usage | Status |
|-------|--------|
| Tailwind text classes | ✅ Consistent |
| Random pixel values | ❌ Not detected |
| Custom font sizes | Minimal |

**Font scale used:**
- `text-xs`, `text-sm`, `text-base`, `text-lg`, `text-xl`, `text-2xl`, `text-3xl`

### Form Validation Pattern

| Metric | Value |
|--------|-------|
| react-hook-form usage | 102 files |
| zod schemas defined | 10+ |
| Form field uses | 342 |
| Consistency | ~62% |

**Error Display:**
- Inline errors: `FormMessage`, `FieldErrors` components
- Toast errors: 839 uses of sonner toast
- Pattern: Toast for API errors, inline for validation

---

# 🖼️ SIDEPANEL & LAYOUT UX

## Active State Logic: ✅ WORKS

**Implementation:**
```typescript
// useActivePath hook
const isActive = pathname.startsWith(href);  // Prefix matching
```

| Scenario | Works? |
|----------|--------|
| `/campaigns` active on `/campaigns` | ✅ |
| `/campaigns` active on `/campaigns/123` | ✅ |
| `/campaigns` active on `/campaigns/123/edit` | ✅ |
| Exact match for root paths | ✅ (exact option) |

**Visual Feedback:**
```css
data-[active=true]:bg-sidebar-accent
data-[active=true]:font-medium
data-[active=true]:text-sidebar-accent-foreground
```

## Mobile Behavior: ✅ PASS

| Feature | Status |
|---------|--------|
| Breakpoint | 768px |
| Collapse mechanism | Sheet overlay |
| Keyboard shortcut | Ctrl/Cmd+B |
| State persistence | Cookie (7 days) |
| Auto-close on nav | ✅ |

**Desktop:** Fixed sidebar, 256px width, offcanvas collapsible
**Mobile:** Sheet overlay, 288px width, auto-closes on route change

## Whitespace/Padding: ✅ Consistent

| Metric | Value |
|--------|-------|
| Grid system | 4px base (Tailwind) |
| Common spacings | p-2, p-4, p-6, gap-2, gap-4 |
| Header height | h-12 (48px) |
| Sidebar width | 16rem (256px) |

**Consistency:** Uses Tailwind spacing scale throughout (4px increments)

## Provider Order (Root Layout)

```
1. AppProviders
   ├── AuthProvider
   ├── ApolloWrapper
   └── ModalProvider
2. ThemeProvider
3. Toaster (sonner)
4. GlobalActionsProvider
5. CallStateProvider
6. ImpersonationBanner
7. CallStateBridge
8. [children]
```

**Assessment:** ✅ Logically ordered - Auth → Data → UI → Features

---

# 🗑️ DEAD CODE & BLOAT

## Unused Components

**Potentially Unused (need verification):**
- `data/` directory - Empty, 0 files
- `pages/` directory - Legacy, may be unused with App Router
- Some modal components in `/components/ui/modal/` may be orphaned

## Duplicate Logic

### Form Patterns (Inconsistent)
- `/components/ui/form.tsx` - React-hook-form integration
- `/components/ui/form/` folder - Alternative form items
- Feature-specific form components

**Recommendation:** Consolidate to single form pattern

### Multiple Modal Systems
- `dialog.tsx` - Radix dialog
- `drawer.tsx` - Drawer component
- `/modal/` folder - Custom modal system (11 files)

**Assessment:** Not redundant - different use cases

### Page Logic Duplication

**Copy-paste patterns detected in:**
- Filter components across pages
- Table pagination logic
- Search/filter state management

**Recommendation:** Extract to shared hooks:
- `useTableFilters()`
- `usePaginatedQuery()`
- `useSearchState()`

---

# 📊 FEATURE MODULE INSPECTION

## Feature 1: Inbox

| Aspect | Status |
|--------|--------|
| Layout shifts | ✅ None - uses SidebarInset |
| Header context | ✅ "AI Inbound Response Center" |
| Breadcrumbs | ❌ Missing |
| Primary action | ✅ Compose button |

## Feature 2: Campaigns

| Aspect | Status |
|--------|--------|
| Layout shifts | ✅ None |
| Header context | ✅ Campaign title + status |
| Breadcrumbs | ✅ Campaign → [Name] |
| Primary action | ✅ Launch/Pause buttons |

## Feature 3: Settings

| Aspect | Status |
|--------|--------|
| Layout shifts | ✅ None |
| Header context | ✅ Settings section title |
| Breadcrumbs | ✅ Settings → [Section] |
| Primary action | ✅ Save button |

**Layout Shift Assessment:** ✅ PASS - No janky movements detected

---

# 📈 OVERALL SCORES

| Category | Score | Notes |
|----------|-------|-------|
| **File Structure** | 🟢 85/100 | Clean hybrid architecture |
| **Naming Conventions** | 🟢 95/100 | Excellent consistency |
| **Button Consistency** | 🟢 79/100 | Good primitive adoption |
| **Icon Consistency** | 🟢 100/100 | Single library (lucide) |
| **Form Patterns** | 🟡 62/100 | Needs consolidation |
| **Sidebar UX** | 🟢 90/100 | Excellent active states |
| **Mobile Responsive** | 🟢 90/100 | Proper Sheet overlay |
| **Page Bloat** | 🟡 60/100 | 42 pages need refactoring |

**Overall: 🟢 82/100 - GOOD with improvement areas**

---

# 🔧 ACTION ITEMS

## Immediate (High Impact)

1. **Refactor 5 largest pages** (properties, valuation, data-hub, sectors, import-companies)
   - Extract to feature components
   - Target: <400 lines per page

2. **Convert 91 raw `<button>` tags** to Button component
   - Audit each occurrence
   - Apply consistent variants

3. **Add breadcrumbs to Inbox**
   - Use existing Breadcrumb component
   - Match Campaigns/Settings pattern

## Short-term

4. **Consolidate form patterns**
   - Document single form approach
   - Update inconsistent forms

5. **Create shared hooks**
   - `useTableFilters()`
   - `usePaginatedQuery()`
   - `useSearchState()`

6. **Clean up `/data/` and `/pages/` directories**
   - Verify unused
   - Remove or migrate

## Long-term

7. **Establish page component standard**
   - Max 400 lines rule
   - Container/Presenter pattern
   - Document in CONTRIBUTING.md

8. **Add component documentation**
   - Storybook or similar
   - Usage examples per component

---

*UI Component Structure Audit Complete*
