# Retired FFD website preview

`theotest.ffdcle.com` and its former subpages now direct visitors to the single current landing page at `https://www.ffdcle.com/`.

Keep the established GitHub Pages configuration: `main`, `/ (root)`, HTTPS enforced, and `CNAME` set to `theotest.ffdcle.com`. `index.html` and `404.html` have an immediate HTML redirect plus an accessible fallback link. Former subpages return HTTP 404 before the browser redirects. No DNS or mail changes are needed.

All obsolete pages, scripts and assets are removed from the deployed tree. Previous source remains recoverable in Git at `f49ab17049be095b90120de5e5f096227093d930`; revert the retirement commit to restore it. Do not deploy archives or old page copies.