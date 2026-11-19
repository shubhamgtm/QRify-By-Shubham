<p align="center">
  <img src="assets/banner.svg" alt="QRify – Create your QR code instantly. By Shubham Gautam (@shubhamgtm)" width="100%">
</p>

<p align="center">
  <a href="https://qrifyyy.netlify.app/"><img alt="Live demo: qrifyyy.netlify.app" src="https://img.shields.io/badge/Live%20demo-qrifyyy.netlify.app-7c3aed?style=for-the-badge&logo=netlify&logoColor=white"></a>
</p>

<p align="center">
  <strong>Free QR codes in 5 seconds. No sign-up. No ads. No tracking.</strong><br>
  A fast, private and minimal QR code generator built with plain HTML, CSS and vanilla JavaScript.
</p>

<p align="center">
  <img alt="License: MIT" src="https://img.shields.io/badge/license-MIT-7c3aed.svg">
  <img alt="HTML5" src="https://img.shields.io/badge/HTML5-e34f26?logo=html5&logoColor=white">
  <img alt="CSS3" src="https://img.shields.io/badge/CSS3-1572b6?logo=css3&logoColor=white">
  <img alt="JavaScript" src="https://img.shields.io/badge/JavaScript-f7df1e?logo=javascript&logoColor=black">
</p>

<p align="center">
  <a href="https://qrifyyy.netlify.app/">Live demo</a> ·
  <a href="#features">Features</a> ·
  <a href="#installation">Installation</a> ·
  <a href="#usage">Usage</a> ·
  <a href="#author">Author</a>
</p>

---

## Live demo

**Try it now: [https://qrifyyy.netlify.app/](https://qrifyyy.netlify.app/)**

No install, no account. Open the link, type something, and download your QR code.

## Features

- **Four content types** – generate QR codes from a **URL**, plain **text**, an **email address** (`mailto:`) or a **phone number** (`tel:`).
- **Smart validation** – empty input, malformed URLs, incomplete email addresses and invalid phone numbers all show a clear, helpful message. URLs without a scheme automatically get `https://`.
- **Size options** – 128 px, 256 px or 512 px.
- **Custom colors** – choose foreground and background colors, with a contrast warning when a combination is hard to scan.
- **Error-correction levels** – Low, Medium, Quartile or High.
- **Instant preview** – codes appear immediately and restyle live when you change size, colors or error correction.
- **Download as PNG** – exports a clean image with a proper quiet zone around the code.
- **Copy to clipboard** – copy the text in the input field with one click.
- **Clear & reset** – empties the input and restores the default options.
- **Unlimited codes** – generate as many QR codes as you like without reloading the page.
- **Dark mode** – manual toggle, follows your system preference on first visit and remembers your choice.
- **Fully responsive** – optimized for phones, tablets and desktops.
- **Accessible** – keyboard navigation, visible focus states, ARIA labels and reduced-motion support.
- **Private** – everything runs in your browser. Nothing is uploaded, stored or tracked.

## Screenshots

> Add your own screenshots to `docs/screenshots/` and uncomment the lines below.

<!--
| Light mode | Dark mode |
| :---: | :---: |
| ![QRify in light mode](docs/screenshots/light-mode.png) | ![QRify in dark mode](docs/screenshots/dark-mode.png) |

| Mobile |
| :---: |
| ![QRify on mobile](docs/screenshots/mobile.png) |
-->

## Tech stack

| Layer | Technology |
| --- | --- |
| Markup | HTML5 |
| Styling | CSS3 (custom properties, Grid, Flexbox) |
| Logic | Vanilla JavaScript (ES6+) |
| QR generation | [QRCode.js](https://github.com/davidshimjs/qrcodejs) |
| Hosting | [Netlify](https://qrifyyy.netlify.app/) |

No Node.js, package manager, framework or backend is needed.

## Installation

1. **Get the code**

   ```bash
   git clone https://github.com/shubhamgtm/qrify.git
   cd qrify
   ```

   Or download the repository as a ZIP file and extract it.

2. **Open the app**

   Double-click `index.html`, or open it from your browser with *File → Open*. That's it, there is nothing to install or build.

> **Internet connection:** QRCode.js is loaded from a CDN (cdnjs, with jsDelivr as a fallback). To run QRify completely offline, see [Offline use](#offline-use).

### Optional: serve it locally

Any static file server works if you prefer `http://localhost`:

```bash
# Python 3
python -m http.server 8000

# or, with Node.js installed
npx serve .
```

Then visit <http://localhost:8000>.

### Deploy your own copy

QRify is a static site, so it deploys anywhere that serves files. On Netlify, drag the project folder onto the [Netlify Drop](https://app.netlify.com/drop) page, or connect your fork of the repository and leave the build command empty.

## Usage

1. Pick a content type: **URL**, **Text**, **Email** or **Phone**.
2. Enter your content. Press **Enter** to generate (**Ctrl/⌘ + Enter** in the Text tab).
3. Choose a **size**, **foreground** and **background** color, and an **error-correction** level.
4. Press **Generate QR code**. The code appears in the preview panel.
5. Press **Download PNG** to save it.
6. Use **Copy text** to copy your input to the clipboard, or **Clear** to start over.
7. Use the moon/sun button in the navbar to switch between light and dark mode.

### Tips for reliable scanning

- Keep a **dark foreground on a light background**. Inverted codes are not supported by every scanner.
- Keep strong **contrast** between the two colors. QRify warns you when it is too low.
- Use **Quartile** or **High** error correction if you plan to print the code on rough surfaces or place a logo on top.
- Shorter content creates simpler, easier-to-scan codes.

## Offline use

1. Download [`qrcode.min.js`](https://cdnjs.cloudflare.com/ajax/libs/qrcodejs/1.0.0/qrcode.min.js) once.
2. Save it as `lib/qrcode.min.js` inside the project folder.

`index.html` already falls back to `lib/qrcode.min.js` when both CDNs are unreachable, so no code changes are required. If you prefer, replace the first `<script>` tag with `<script src="lib/qrcode.min.js"></script>`.

## Project structure

```text
qrify/
├── index.html      # Page structure and markup
├── style.css       # Design tokens, themes, layout and components
├── script.js       # Validation, QR generation, download, copy, theme logic
├── README.md       # Project documentation
├── LICENSE         # MIT license
├── .gitignore      # Files excluded from version control
├── assets/
│   ├── banner.svg  # README banner (vector)
│   └── banner.png  # Same banner as a PNG, e.g. for GitHub's social preview
├── lib/            # (optional) local copy of qrcode.min.js for offline use
└── docs/
    └── screenshots/  # (optional) images referenced by this README
```

## Browser support

QRify works in the current versions of Chrome, Edge, Firefox and Safari on desktop and mobile. Clipboard access uses the asynchronous Clipboard API with an automatic fallback for older browsers.

## Customization

Colors, radii and shadows are defined as CSS custom properties at the top of `style.css` (`:root` for light mode and `:root[data-theme="dark"]` for dark mode). Change `--accent` to restyle the whole interface in a different brand color.

## Contributing

Contributions are welcome.

1. Fork the repository.
2. Create a branch: `git checkout -b feature/my-improvement`.
3. Commit your changes: `git commit -m "Add my improvement"`.
4. Push the branch: `git push origin feature/my-improvement`.
5. Open a pull request.

If QRify is useful to you, a star on the repository is always appreciated.

## Author

**Shubham Gautam** · [@shubhamgtm](https://github.com/shubhamgtm)

Live site: [qrifyyy.netlify.app](https://qrifyyy.netlify.app/)

## License

Released under the [MIT License](LICENSE). Copyright © 2026 Shubham Gautam.

QR code generation is powered by [QRCode.js](https://github.com/davidshimjs/qrcodejs), also MIT licensed. "QR Code" is a registered trademark of DENSO WAVE INCORPORATED.
