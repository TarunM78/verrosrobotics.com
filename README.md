# verrosrobotics.com

Single-page marketing site for Verros Robotics. Plain HTML, CSS, and JavaScript with no build step.

```
www/
├── index.html   page content
├── style.css    monochrome design system
├── main.js      nav, scroll, and form handling
├── favicon.svg
├── CNAME        custom domain for GitHub Pages
└── README.md
```

## Preview locally

```
py -3.12 -m http.server 8766 -d www
```

Then open <http://127.0.0.1:8766>.

## Form submissions

Both forms post JSON to a form backend. Until an endpoint is set, submitting a form opens the
visitor's email client with the details prefilled to `tarun@verrosrobotics.com`.

To receive submissions directly:

1. Create two forms on a form backend (Formspree, Web3Forms, or Basin): one for quote requests and one for the preorder list. Point both at `tarun@verrosrobotics.com`.
2. Paste the endpoint URLs into `CONFIG` at the top of `main.js`, or set them inline in `index.html` before `main.js` loads:

```html
<script>
  window.VERROS_CONFIG = {
    QUOTE_ENDPOINT: 'https://formspree.io/f/xxxxxxxx',
    SIGNUP_ENDPOINT: 'https://formspree.io/f/yyyyyyyy'
  };
</script>
```

The hidden `_gotcha` field is a honeypot. Bots that fill it are dropped client side, and Formspree ignores submissions that include it.

## Typeface

The site self-hosts "Verros Sans" from `fonts/`, a renamed Latin-only WOFF2 subset of TeX Gyre Heros
(GUST Font License), so type renders the same on every device. Regular and Bold only; the light
weight used for body copy resolves to Regular, as it does on hermeus.com, whose look the site follows.

## Placeholders to replace

- Spec values in the Specifications card (all read "Specs coming soon")
- Logo: currently a text wordmark plus a simple V mark in `index.html` and `favicon.svg`

## Content rules

- Do not describe or diagram the gear design. Outcomes only.
- No invented numbers, customers, testimonials, or logos.
- Monochrome only: black, white, grays for borders and secondary text.
- No em dashes in copy.
