# 🌤️ SkyPulse 

> Clean, fast weather dashboard for any city, town, or village in **India**.

SkyPulse is a lightweight, responsive static web application that displays live **temperature, humidity, and barometric pressure** across India. Powered directly by the free [Open-Meteo](https://open-meteo.com) API, SkyPulse requires **no API keys, no backend servers, no build steps, and no login**.

---

## ✨ Features

- **Built Exclusively for India**: Live geocoding and search suggestions strictly limited to Indian places, with a boundary safety filter (lat 6.0–37.5, lon 68.0–98.0).
- **The Three Core Metrics**:
  - **Temperature (°C)**: Current temperature, "Feels like", plus today's High & Low.
  - **Humidity (%)**: Plain-language labels (*Dry*, *Comfortable*, *Humid*, *Very Humid*) with visual meter bar.
  - **Barometric Pressure (hPa)**: Sea-level pressure (`pressure_msl`), atmospheric classification (*Low*, *Normal*, *High*), real-time 3-hour trend arrow (↑ Rising, ↓ Falling, → Steady), and local surface pressure.
- **Current Conditions Hero Card**: Dynamic gentle gradient that shifts based on whether it is day or night (`is_day`), with weather description and last updated time.
- **Hourly Forecast Strip**: Horizontally scrollable 24-hour weather breakdown (Hour, condition icon, temperature, humidity).
- **7-Day Forecast**: Day-by-day outlook with proportional temperature range bars and mean humidity.
- **Popular Cities Shortcuts**: One-tap chips for Delhi, Mumbai, Kolkata, Chennai, Bengaluru, Hyderabad, Patna, Jaipur, Lucknow, and Ahmedabad.
- **"Use My Location"**: Instant geolocation detection restricted to Indian coordinates with graceful fallback.
- **Light & Dark Theme**: Cohesive "sky" palette with auto system detection (`prefers-color-scheme`) and manual toggle remembered in `localStorage`.
- **Offline & Resilience**: In-memory caching for 10 minutes, 8-second request timeout with automatic retry, and persistent offline snapshot fallback.
- **Fully Accessible**: Semantic HTML5, ARIA tags, keyboard navigation (Arrow keys + Enter for suggestions), high contrast ratios (≥ 4.5:1).

---

## 🛠️ Tech Stack

- **HTML5**: Semantic tags (`<header>`, `<main>`, `<section>`, `<article>`, `<footer>`).
- **CSS3**: Custom properties (CSS variables), Grid, Flexbox, responsive design (Mobile < 600px, Tablet 600–1024px, Desktop > 1024px).
- **JavaScript (Vanilla ES6+)**: Native `fetch()`, `AbortController`, DOM manipulation, no build steps or frameworks.
- **API**: [Open-Meteo Free API](https://open-meteo.com) (CORS-enabled, zero keys needed).

---

## 📁 Project Structure

```
Electronic_Project/
├── index.html        # Main HTML structure & accessibility semantics
├── style.css         # Styling, clean light theme, responsive rules
├── app.js            # State management, Open-Meteo API, DOM rendering
├── README.md         # Documentation & setup guide
└── assets/           # Icons and graphics
    ├── favicon.svg   # Custom SkyPulse logo (Sun + Cloud + Pulse line)
    └── icons/        # Standalone SVG weather icons
```

---

## 🚀 How to Run Locally

Because SkyPulse uses plain HTML/CSS/JS, no compilation or dependencies are required:

1. **Option A: Direct Open**
   Double-click `index.html` to open it in your web browser.

2. **Option B: Local Static Server**
   ```bash
   # Using Python
   python -m http.server 8000
   
   # Or using Node.js npx
   npx serve .
   ```
   Open `http://localhost:8000` in your browser.

---

## 🌐 Free Static Hosting Deployment

SkyPulse can be deployed with 1 click to any free static host:

- **GitHub Pages**: Push this repo to GitHub, go to Settings → Pages → Select branch `main` → Save.
- **Netlify**: Drag and drop the `skypulse` directory into Netlify dropzone or link GitHub repo.
- **Vercel**: Run `vercel deploy` or import repo from GitHub.

---

## 📄 License & Attribution

- Weather data provided by [Open-Meteo.com](https://open-meteo.com/) under the [Open Database License (ODbL)](https://opendatacommons.org/licenses/odbl/).
- Fonts: [Inter](https://fonts.google.com/specimen/Inter) by Rasmus Andersson (SIL Open Font License).


## Author
- Sahil Verma
