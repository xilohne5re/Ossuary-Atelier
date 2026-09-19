# New Shop Review — authoring checklist

Copy `blog/guide/waanwaal-phuket.html` (the reference model) to
`blog/guide/<SHOP-ID>-phuket.html` and edit:

1. `<title>` — `<Shop Name>, Phuket — The Thrift Guide`
2. BlogPosting JSON-LD near `</head>`:
   - `headline` → shop name
   - `datePublished` → visit date (from `found_date`)
   - `image` / publisher `logo` → keep `assets/og-image.png` (do NOT reference
     `assets/blog/placeholder.jpg` or `assets/logo.png` — neither file exists)
3. `<h1 class="shop-title">` → shop name
4. `.shop-prose` → the lead paragraph (hook + your find)
5. `.shop-section` blocks to fill:
   - **Location** — street address + Instagram/Facebook links (from `shops.json`)
   - **What to Expect** — stock, layout, selection strengths
   - **The Owners** — who runs it, helpfulness
   - **Price Range** — from `shops.json`
   - **Found Here** — link the `related_item_url` with a "View ITEM-xxx" label
6. `comment-form` hidden input `name="page"` → shop name
7. Add the shop to `_data/shops.json` (copy `_content/templates/shops-entry.json`)
   and set `status: "live"` so it appears in the directory grid.

The directory cards + ItemList JSON-LD on `blog/guide/index.html` regenerate
automatically from `shops.json` on `node scripts/build.mjs --enable-content`.

Note: the hub spotlight cards on `guide/index.html` are marked
`<!-- CONTENT -->` — the shop name + review link are duplicated there by hand.
Keep them in sync when you add a spotlight shop.