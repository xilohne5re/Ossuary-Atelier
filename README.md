# Ossuary Atelier — Website

Full static website. Ready to deploy to GitHub Pages.

## File Structure
```
ossuary-atelier/
├── index.html     ← Home / Hero
├── about.html     ← Mission & Philosophy  
├── drops.html     ← Current Drop
├── story.html     ← QR Story System
├── contact.html   ← Contact / DM to purchase
├── css/
│   ├── base.css   ← Variables, reset, cursor, shared styles
│   ├── nav.css    ← Navigation
│   └── index.css  ← Hero page styles
├── js/
│   ├── nav.js     ← Cursor, transitions, shared eye SVG
│   └── index.js   ← Hero animations
└── assets/images/ ← Add your item photos here
```

## Setup
1. Add item photos to `assets/images/` named `item-001.jpg` etc.
2. Update the `ITEMS` array in `drops.html` with your real data
3. Replace `@ossuaryatelier` with your actual Instagram handle
4. Update Google Sites URLs in `drops.html` to your real story pages

## Deploy to GitHub Pages
1. Create a GitHub repo, push all files to `main`
2. Settings → Pages → Source: main / root
3. Live at `yourusername.github.io/ossuary-atelier`

## Connect Custom Domain (eu.org)
1. Repo Settings → Pages → Custom domain
2. DNS: 4 A records → GitHub IPs:
   185.199.108.153 / 185.199.109.153 / 185.199.110.153 / 185.199.111.153
3. HTTPS activates automatically after ~20 mins

## Palette
- Void `#080810` · Pale Violet `#C9B8E8` · Deep Bruise `#4B2D7A` · Midnight `#1C1828`
