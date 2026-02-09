# Heimursaga Typography System

A standardized typography system for consistent text styling across the application.

---

## 1. Font Families

We use **system fonts** for fast loading and native platform feel.

| Family | Class | Actual Fonts | Usage |
|--------|-------|--------------|-------|
| **Sans** | (default) | system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Arial | All UI text, headings, body copy |
| **Mono** | `font-mono` | ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas | Data, metadata, timestamps, coordinates, stats |
| **Serif** | `font-serif` | ui-serif, Georgia, Cambria, "Times New Roman" | Decorative quotes only (rare) |

### Platform Rendering:
- **macOS/iOS**: San Francisco (SF Pro), SF Mono
- **Windows**: Segoe UI, Consolas
- **Linux**: System default sans-serif

### Rules:
- Default to sans-serif (no class needed)
- Use `font-mono` for ANY numerical data, timestamps, status codes, coordinates
- Never use `font-serif` except for large decorative quotation marks

---

## 2. Text Size Scale

**STOP using custom pixel values.** Use only these standard sizes:

| Class | Size | Usage |
|-------|------|-------|
| `text-3xl` | 30px | Page titles (main headings) |
| `text-2xl` | 24px | Section titles, modal headers |
| `text-xl` | 20px | Card titles, subsection headers |
| `text-lg` | 18px | Large body text, featured content |
| `text-base` | 16px | Primary body text |
| `text-sm` | 14px | Secondary text, descriptions, form inputs |
| `text-xs` | 12px | Labels, metadata, helper text, buttons |

### Migration from Custom Sizes:
| Old | New |
|-----|-----|
| `text-[15px]` | `text-base` (16px) |
| `text-[11px]` | `text-xs` (12px) |
| `text-[10px]` | `text-xs` (12px) - or create `text-2xs` |
| `text-[9px]` | `text-xs` (12px) |
| `text-[8px]` | `text-xs` (12px) |

### Optional: Add Custom Size
If truly needed, add ONE custom size to tailwind.config.js:
```js
fontSize: {
  '2xs': ['10px', { lineHeight: '14px' }],
}
```
Use `text-2xs` ONLY for: badges, tags, and compact metadata displays.

---

## 3. Font Weight Scale

| Class | Weight | Usage |
|-------|--------|-------|
| `font-bold` | 700 | Headings, buttons, navigation, primary labels |
| `font-semibold` | 600 | Secondary emphasis, card subtitles, highlighted metadata |
| `font-medium` | 500 | Form labels, tabs, interactive element labels |
| `font-normal` | 400 | Body text, descriptions, helper text, placeholders |

### Rules:
- **Headings**: Always `font-bold`
- **Buttons**: Always `font-bold`
- **Navigation links**: Always `font-bold`
- **Form labels**: Use `font-medium` (not bold)
- **Card titles**: Use `font-bold`
- **Card subtitles/metadata**: Use `font-semibold` or `font-normal`
- **Body paragraphs**: Always `font-normal`
- **Helper/hint text**: Always `font-normal`

---

## 4. Letter Spacing (Tracking)

**Consolidate to ONE tracking class:** `tracking-wide`

| Class | Usage |
|-------|-------|
| `tracking-wide` | All uppercase text, status badges, section labels |
| (default) | Everything else |

### Rules:
- ALWAYS pair `uppercase` with `tracking-wide`
- Never use `tracking-wider` (remove from codebase)
- Never use tracking on lowercase text

---

## 5. Line Height (Leading)

| Class | Usage |
|-------|-------|
| `leading-tight` | Headings, card titles, compact UI |
| `leading-normal` | Single-line text, buttons, labels |
| `leading-relaxed` | Body paragraphs, descriptions, multi-line content |

### Rules:
- **Headings (text-xl and above)**: `leading-tight`
- **Card titles**: `leading-tight`
- **Body text / paragraphs**: `leading-relaxed`
- **Buttons and labels**: No explicit leading (default)
- **Multi-line descriptions**: `leading-relaxed`

---

## 6. Text Transform

| Class | Usage |
|-------|-------|
| `uppercase` | Buttons, navigation, status badges, section headers |
| (default) | Everything else |

### Rules:
- ALL buttons use `uppercase`
- ALL navigation links use `uppercase`
- Status badges (EXPLORER PRO, ACTIVE, etc.) use `uppercase`
- Section headers in cards use `uppercase`
- Never use `lowercase` or `capitalize`

---

## 7. Component Standards

### Buttons

```html
<!-- Primary Button -->
<button class="text-xs font-bold uppercase">
  BUTTON TEXT
</button>

<!-- All button text: text-xs font-bold uppercase -->
```

### Navigation Links

```html
<a class="text-sm font-bold uppercase">
  NAV ITEM
</a>
```

### Page Titles

```html
<h1 class="text-3xl font-bold">Page Title</h1>
<!-- or with dark mode -->
<h1 class="text-3xl font-bold dark:text-[#e5e5e5]">Page Title</h1>
```

### Section Headers

```html
<h2 class="text-xl font-bold">Section Title</h2>
<h3 class="text-lg font-bold">Subsection Title</h3>
```

### Card Titles

```html
<h3 class="text-lg font-bold leading-tight">Card Title</h3>
```

### Card Metadata / Status Labels

```html
<!-- Status badge -->
<span class="text-xs font-semibold font-mono uppercase tracking-wide">
  EXPLORER PRO
</span>

<!-- Metadata -->
<span class="text-xs font-mono text-[#616161]">
  Jan 15, 2026
</span>
```

### Form Labels

```html
<label class="text-xs font-medium uppercase tracking-wide">
  FIELD LABEL
</label>
```

### Form Helper Text

```html
<p class="text-xs font-normal text-[#616161]">
  Helper text goes here
</p>
```

### Body Paragraphs

```html
<p class="text-sm font-normal leading-relaxed">
  Body text content...
</p>
```

### Error Messages

```html
<p class="text-xs font-normal text-red-600">
  Error message
</p>
```

### Stats / Data Display

```html
<div class="font-mono">
  <span class="text-xs text-[#616161]">Views:</span>
  <span class="text-sm font-bold">1,234</span>
</div>
```

---

## 8. Color + Typography Pairing

### Text Colors (Light Mode)

| Color | Usage |
|-------|-------|
| `text-[#202020]` | Primary text, headings, labels |
| `text-[#616161]` | Secondary text, metadata, helper text |
| `text-[#ac6d46]` | Accent (copper) - links, emphasis, interactive |
| `text-[#4676ac]` | Accent (blue) - secondary actions, active states |
| `text-white` | On dark backgrounds |

### Text Colors (Dark Mode)

| Color | Usage |
|-------|-------|
| `dark:text-[#e5e5e5]` | Primary text |
| `dark:text-[#b5bcc4]` | Secondary text, metadata |

---

## 9. Complete Reference Table

| Element | Size | Weight | Family | Transform | Tracking | Leading |
|---------|------|--------|--------|-----------|----------|---------|
| Page title | `text-3xl` | `font-bold` | - | - | - | `leading-tight` |
| Section header | `text-xl` | `font-bold` | - | - | - | `leading-tight` |
| Subsection header | `text-lg` | `font-bold` | - | - | - | `leading-tight` |
| Card title | `text-lg` | `font-bold` | - | - | - | `leading-tight` |
| Navigation link | `text-sm` | `font-bold` | - | `uppercase` | - | - |
| Button text | `text-xs` | `font-bold` | - | `uppercase` | - | - |
| Form label | `text-xs` | `font-medium` | - | `uppercase` | `tracking-wide` | - |
| Status badge | `text-xs` | `font-semibold` | `font-mono` | `uppercase` | `tracking-wide` | - |
| Metadata | `text-xs` | - | `font-mono` | - | - | - |
| Timestamp | `text-xs` | - | `font-mono` | - | - | - |
| Body text | `text-sm` | `font-normal` | - | - | - | `leading-relaxed` |
| Helper text | `text-xs` | `font-normal` | - | - | - | - |
| Input text | `text-sm` | `font-normal` | - | - | - | - |
| Placeholder | `text-sm` | `font-normal` | - | - | - | - |

---

## 10. Migration Checklist

### High Priority (Inconsistency Fixes)

- [ ] Replace all `text-[10px]`, `text-[9px]`, `text-[8px]` with `text-xs`
- [ ] Replace all `text-[11px]`, `text-[15px]` with `text-xs` or `text-sm`
- [ ] Replace all `tracking-wider` with `tracking-wide`
- [ ] Add `uppercase` to all buttons missing it
- [ ] Add `uppercase tracking-wide` to all status badges
- [ ] Change form labels from `font-bold` to `font-medium`

### Medium Priority (Consistency)

- [ ] Add `leading-tight` to all headings (text-lg and above)
- [ ] Add `leading-relaxed` to all multi-line body text
- [ ] Ensure all metadata uses `font-mono`
- [ ] Ensure all timestamps use `font-mono`

### Low Priority (Polish)

- [ ] Audit and standardize card title sizes
- [ ] Ensure consistent heading hierarchy across pages
- [ ] Review dark mode text color consistency

---

## 11. Tailwind Config Additions

Add to `tailwind.config.js` if needed:

```js
module.exports = {
  theme: {
    extend: {
      fontSize: {
        '2xs': ['10px', { lineHeight: '14px' }],
      },
    },
  },
}
```

Only use `text-2xs` for badges and tags where 12px is truly too large.
