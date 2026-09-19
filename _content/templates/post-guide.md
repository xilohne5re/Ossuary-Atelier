# New Guide Article or Field Note — authoring checklist

Both post types are hand-authored HTML (no markdown pipeline yet). Models:

- **Field note** — `blog/field-notes/chatuchak-nov-24.html`
- **Guide article** — `blog/guide/waanwaal-phuket.html`

Copy either file, then:

1. Place under the matching folder:
   - Field notes → `blog/field-notes/<slug>.html`
   - Guide articles → `blog/guide/<slug>.html`
2. `<title>` → `<Post Title> — Field Notes | Guide | The Thrift Guide`
3. BlogPosting JSON-LD before `</head>`:
   - `headline`, `datePublished`, keep `image` → `assets/og-image.png`
4. Keep the body's `.shop-prose`/`.note-prose` lead, sections, and the
   `found-here` / `found-link` cross-link back to the related ITEM page.
5. Add back-links (the hub expects them):
   - `<a href="../index.html">← The Thrift Guide</a>` (guide articles)
   - `<a href="../../index.html">← The Osteology</a>` (field notes — align to depth)
6. Register the post in `blog/index.html`:
   - Add a `.post-card` with `data-category` (`guide` | `field-notes` | `archive`)
   - Optional: add a `blog/index.html` filter pill if you add a new category.
7. Add the URL's description to the `SEO_DESC` map in `scripts/build.mjs`
   (canonical + OG + title are auto-rendered by `runSeo`).

## FAQ block template (for any guide page)

```html
<div class="faq-item">
  <button class="faq-q">Question text?</button>
  <div class="faq-a"><p>Answer text with any <a href="...">links</a>.</p></div>
</div>
```

Wrap FAQs in a container with class `hub-faq` on the hub, or `.guide-prose`
on directory pages. For snippet eligibility, also mirror each Q/A pair in a
`FAQsPage` JSON-LD block.

## Hub editorial/FAQs

The hub's intro, branch-desc, and FAQ copy live behind `<!-- CONTENT -->`
markers in `guide/index.html`. Replace the placeholder lines — do not remove
the markers.