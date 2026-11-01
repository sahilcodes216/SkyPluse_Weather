/**
 * SkyPulse - India Weather Dashboard
 * Plain JavaScript (ES6+), direct Open-Meteo API integration
 * Zero frameworks, zero build step, pure client-side
 */

(function () {
  'use strict';

  // --------------------------------------------------------------------------
  // Constants & Configuration
  // --------------------------------------------------------------------------
  const CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes in-memory cache
  const REQUEST_TIMEOUT_MS = 15000; // 15 seconds timeout
  const INDIA_BOUNDS = {
    minLat: 6.0,
    maxLat: 37.5,
    minLon: 68.0,
    maxLon: 98.0
  };

  const DEFAULT_CITY = {
    name: 'New Delhi',
    admin1: 'Delhi',
    country: 'India',
    country_code: 'IN',
    latitude: 28.6139,
    longitude: 77.2090
  };

  const POPULAR_CITIES = [
    { name: 'Delhi', admin1: 'Delhi', latitude: 28.6139, longitude: 77.2090 },
    { name: 'Mumbai', admin1: 'Maharashtra', latitude: 19.0760, longitude: 72.8777 },
    { name: 'Kolkata', admin1: 'West Bengal', latitude: 22.5726, longitude: 88.3639 },
    { name: 'Chennai', admin1: 'Tamil Nadu', latitude: 13.0827, longitude: 80.2707 },
    { name: 'Bengaluru', admin1: 'Karnataka', latitude: 12.9716, longitude: 77.5946 },
    { name: 'Hyderabad', admin1: 'Telangana', latitude: 17.3850, longitude: 78.4867 },
    { name: 'Patna', admin1: 'Bihar', latitude: 25.5941, longitude: 85.1376 },
    { name: 'Jaipur', admin1: 'Rajasthan', latitude: 26.9124, longitude: 75.7873 },
    { name: 'Lucknow', admin1: 'Uttar Pradesh', latitude: 26.8467, longitude: 80.9462 },
    { name: 'Ahmedabad', admin1: 'Gujarat', latitude: 23.0225, longitude: 72.5714 }
  ];

  // --------------------------------------------------------------------------
  // Application State
  // --------------------------------------------------------------------------
  const state = {
    currentCity: null,
    weatherData: null,
    inMemoryCache: new Map(),
    searchDebounceTimer: null,
    activeSuggestionIndex: -1,
    currentSuggestions: []
  };

  // --------------------------------------------------------------------------
  // DOM Elements
  // --------------------------------------------------------------------------
  const elements = {
    connectionStatus: document.getElementById('connection-status'),
    searchInput: document.getElementById('search-input'),
    clearSearchBtn: document.getElementById('clear-search-btn'),
    geoBtn: document.getElementById('geo-btn'),
    suggestionsContainer: document.getElementById('suggestions-container'),
    suggestionsList: document.getElementById('suggestions-list'),
    searchHint: document.getElementById('search-hint'),
    popularCitiesList: document.getElementById('popular-cities-list'),
    offlineAlert: document.getElementById('offline-alert'),
    offlineAlertText: document.getElementById('offline-alert-text'),
    errorContainer: document.getElementById('error-container'),
    errorTitle: document.getElementById('error-title'),
    errorMessage: document.getElementById('error-message'),
    retryBtn: document.getElementById('retry-btn'),
    skeletonLoader: document.getElementById('skeleton-loader'),
    weatherDashboard: document.getElementById('weather-dashboard'),
    refreshBtn: document.getElementById('refresh-btn'),
    brandLogoBtn: document.getElementById('brand-logo-btn'),

    // Hero Elements
    heroCard: document.getElementById('hero-card'),
    heroCity: document.getElementById('hero-city'),
    heroState: document.getElementById('hero-state'),
    heroIconSlot: document.getElementById('hero-icon-slot'),
    heroTemp: document.getElementById('hero-temp'),
    heroCondition: document.getElementById('hero-condition'),
    heroFeelsLike: document.getElementById('hero-feels-like'),
    heroUpdatedTime: document.getElementById('hero-updated-time'),

    // Core Metric Elements
    metricTempCard: document.getElementById('metric-temp-card'),
    metricTempVal: document.getElementById('metric-temp-val'),
    metricTempHigh: document.getElementById('metric-temp-high'),
    metricTempLow: document.getElementById('metric-temp-low'),

    metricHumidityCard: document.getElementById('metric-humidity-card'),
    metricHumidityVal: document.getElementById('metric-humidity-val'),
    metricHumidityBadge: document.getElementById('metric-humidity-badge'),
    metricHumidityBar: document.getElementById('metric-humidity-bar'),

    metricPressureCard: document.getElementById('metric-pressure-card'),
    metricPressureVal: document.getElementById('metric-pressure-val'),
    metricPressureBadge: document.getElementById('metric-pressure-badge'),
    metricPressureTrend: document.getElementById('metric-pressure-trend'),
    metricPressureTrendText: document.getElementById('metric-pressure-trend-text'),
    metricSurfacePressure: document.getElementById('metric-surface-pressure'),

    // Forecast Elements
    hourlyStrip: document.getElementById('hourly-strip'),
    dailyForecastList: document.getElementById('daily-forecast-list')
  };

  // --------------------------------------------------------------------------
  // Weather Code to Interpretation & Icon SVGs
  // --------------------------------------------------------------------------
  const WMO_CODES = {
    0: { label: 'Clear Sky', icon: 'clear' },
    1: { label: 'Mainly Clear', icon: 'clear' },
    2: { label: 'Partly Cloudy', icon: 'partly-cloudy' },
    3: { label: 'Overcast', icon: 'cloudy' },
    45: { label: 'Fog', icon: 'fog' },
    48: { label: 'Depositing Rime Fog', icon: 'fog' },
    51: { label: 'Light Drizzle', icon: 'drizzle' },
    53: { label: 'Moderate Drizzle', icon: 'drizzle' },
    55: { label: 'Dense Drizzle', icon: 'drizzle' },
    56: { label: 'Freezing Drizzle', icon: 'sleet' },
    57: { label: 'Dense Freezing Drizzle', icon: 'sleet' },
    61: { label: 'Slight Rain', icon: 'rain' },
    63: { label: 'Moderate Rain', icon: 'rain' },
    65: { label: 'Heavy Rain', icon: 'rain' },
    66: { label: 'Light Freezing Rain', icon: 'sleet' },
    67: { label: 'Heavy Freezing Rain', icon: 'sleet' },
    71: { label: 'Slight Snowfall', icon: 'snow' },
    73: { label: 'Moderate Snowfall', icon: 'snow' },
    75: { label: 'Heavy Snowfall', icon: 'snow' },
    77: { label: 'Snow Grains', icon: 'snow' },
    80: { label: 'Slight Rain Showers', icon: 'rain' },
    81: { label: 'Moderate Rain Showers', icon: 'rain' },
    82: { label: 'Violent Rain Showers', icon: 'rain' },
    85: { label: 'Slight Snow Showers', icon: 'snow' },
    86: { label: 'Heavy Snow Showers', icon: 'snow' },
    95: { label: 'Thunderstorm', icon: 'thunderstorm' },
    96: { label: 'Thunderstorm with Hail', icon: 'thunderstorm' },
    99: { label: 'Thunderstorm with Heavy Hail', icon: 'thunderstorm' }
  };

  function getWeatherMeta(code, isDay = 1) {
    const fallback = { label: 'Clear Sky', icon: 'clear' };
    const meta = WMO_CODES[code] || fallback;
    return {
      label: meta.label,
      iconType: meta.icon,
      isDay: Boolean(isDay)
    };
  }

  function createWeatherSvg(iconType, isDay = true, size = 32) {
    switch (iconType) {
      case 'clear':
        if (!isDay) {
          return `
            <svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
              <defs>
                <linearGradient id="moonGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stop-color="#FDE047"/>
                  <stop offset="100%" stop-color="#EAB308"/>
                </linearGradient>
              </defs>
              <path d="M28 8 A16 16 0 1 0 38 32 A13.5 13.5 0 0 1 28 8 z" fill="url(#moonGrad)" />
              <circle cx="34" cy="14" r="1.5" fill="#FEF08A" opacity="0.8"/>
            </svg>`;
        }
        return `
          <svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
            <defs>
              <radialGradient id="sunGrad" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FDE047"/>
                <stop offset="100%" stop-color="#F59E0B"/>
              </radialGradient>
            </defs>
            <circle cx="24" cy="24" r="11" fill="url(#sunGrad)" />
            <g stroke="#F59E0B" stroke-width="2.6" stroke-linecap="round">
              <line x1="24" y1="5" x2="24" y2="8" />
              <line x1="24" y1="40" x2="24" y2="43" />
              <line x1="5" y1="24" x2="8" y2="24" />
              <line x1="40" y1="24" x2="43" y2="24" />
              <line x1="10.5" y1="10.5" x2="12.8" y2="12.8" />
              <line x1="35.2" y1="35.2" x2="37.5" y2="37.5" />
              <line x1="10.5" y1="37.5" x2="12.8" y2="35.2" />
              <line x1="35.2" y1="12.8" x2="37.5" y2="10.5" />
            </g>
          </svg>`;

      case 'partly-cloudy':
        return `
          <svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
            <defs>
              <radialGradient id="sunPart" cx="50%" cy="50%" r="50%">
                <stop offset="0%" stop-color="#FDE047"/>
                <stop offset="100%" stop-color="#F59E0B"/>
              </radialGradient>
              <linearGradient id="cloudPart" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#FFFFFF"/>
                <stop offset="100%" stop-color="#CBD5E1"/>
              </linearGradient>
            </defs>
            <circle cx="32" cy="18" r="9" fill="url(#sunPart)"/>
            <path d="M34 38H16a9 9 0 0 1-1.8-17.8A11 11 0 0 1 32 21a8 8 0 0 1 2 17z" fill="url(#cloudPart)"/>
          </svg>`;

      case 'cloudy':
        return `
          <svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
            <defs>
              <linearGradient id="cloudOver" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#E2E8F0"/>
                <stop offset="100%" stop-color="#94A3B8"/>
              </linearGradient>
            </defs>
            <path d="M36 36H15a9 9 0 0 1-1.8-17.8A12 12 0 0 1 34 19a8.5 8.5 0 0 1 2 17z" fill="url(#cloudOver)"/>
          </svg>`;

      case 'fog':
        return `
          <svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
            <g stroke="#94A3B8" stroke-width="3" stroke-linecap="round">
              <line x1="10" y1="18" x2="38" y2="18" />
              <line x1="6" y1="24" x2="42" y2="24" />
              <line x1="12" y1="30" x2="36" y2="30" />
              <line x1="16" y1="36" x2="32" y2="36" />
            </g>
          </svg>`;

      case 'drizzle':
      case 'rain':
        return `
          <svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
            <defs>
              <linearGradient id="cloudRain" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#E2E8F0"/>
                <stop offset="100%" stop-color="#94A3B8"/>
              </linearGradient>
            </defs>
            <path d="M36 28H15a8 8 0 0 1-1.6-15.8A10 10 0 0 1 34 13a7.5 7.5 0 0 1 2 15z" fill="url(#cloudRain)"/>
            <g stroke="#38BDF8" stroke-width="2.5" stroke-linecap="round">
              <line x1="17" y1="33" x2="14" y2="41" />
              <line x1="25" y1="33" x2="22" y2="41" />
              <line x1="33" y1="33" x2="30" y2="41" />
            </g>
          </svg>`;

      case 'thunderstorm':
        return `
          <svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
            <defs>
              <linearGradient id="cloudThun" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#94A3B8"/>
                <stop offset="100%" stop-color="#475569"/>
              </linearGradient>
            </defs>
            <path d="M36 26H15a8 8 0 0 1-1.6-15.8A10 10 0 0 1 34 11a7.5 7.5 0 0 1 2 15z" fill="url(#cloudThun)"/>
            <polygon points="25,24 18,34 24,34 21,44 31,31 24,31" fill="#FACC15" stroke="#EAB308" stroke-width="0.5"/>
          </svg>`;

      case 'snow':
      case 'sleet':
        return `
          <svg viewBox="0 0 48 48" width="${size}" height="${size}" aria-hidden="true">
            <defs>
              <linearGradient id="cloudSnow" x1="0%" y1="0%" x2="0%" y2="100%">
                <stop offset="0%" stop-color="#E2E8F0"/>
                <stop offset="100%" stop-color="#94A3B8"/>
              </linearGradient>
            </defs>
            <path d="M36 28H15a8 8 0 0 1-1.6-15.8A10 10 0 0 1 34 13a7.5 7.5 0 0 1 2 15z" fill="url(#cloudSnow)"/>
            <g fill="#93C5FD">
              <circle cx="18" cy="36" r="2.2"/>
              <circle cx="26" cy="38" r="2.2"/>
              <circle cx="34" cy="36" r="2.2"/>
            </g>
          </svg>`;

      default:
        return createWeatherSvg('clear', isDay, size);
    }
  }

  // --------------------------------------------------------------------------
  // Network & Online Status
  // --------------------------------------------------------------------------
  function initNetworkMonitor() {
    function updateStatus() {
      const isOnline = navigator.onLine;
      const dot = elements.connectionStatus.querySelector('.status-dot');
      const label = elements.connectionStatus.querySelector('.status-label');

      if (isOnline) {
        dot.classList.remove('offline');
        label.textContent = 'Live';
        elements.offlineAlert.hidden = true;
        elements.offlineAlert.style.display = 'none';
      } else {
        dot.classList.add('offline');
        label.textContent = 'Offline';
        elements.offlineAlertText.textContent = 'You are currently offline. Showing cached weather data.';
        elements.offlineAlert.hidden = false;
        elements.offlineAlert.style.display = 'flex';
      }
    }

    window.addEventListener('online', updateStatus);
    window.addEventListener('offline', updateStatus);
    updateStatus();
  }

  // --------------------------------------------------------------------------
  // Helper: Bounding Box Check for India
  // --------------------------------------------------------------------------
  function isInsideIndia(lat, lon) {
    return (
      lat >= INDIA_BOUNDS.minLat &&
      lat <= INDIA_BOUNDS.maxLat &&
      lon >= INDIA_BOUNDS.minLon &&
      lon <= INDIA_BOUNDS.maxLon
    );
  }

  // --------------------------------------------------------------------------
  // API Fetch with Timeout & Automatic Retries
  // --------------------------------------------------------------------------
  async function fetchWithRetry(url, options = {}, retries = 2) {
    let lastError = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);

      try {
        const response = await fetch(url, {
          ...options,
          signal: controller.signal
        });

        clearTimeout(timerId);

        if (!response.ok) {
          throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
        }

        return await response.json();
      } catch (err) {
        clearTimeout(timerId);
        lastError = err;
        if (attempt < retries) {
          // Pause before retry with backoff
          await new Promise((res) => setTimeout(res, (attempt + 1) * 800));
        }
      }
    }

    throw lastError;
  }

  // --------------------------------------------------------------------------
  // Weather Data Fetching & Caching
  // --------------------------------------------------------------------------
  async function loadWeatherForCity(city, forceRefresh = false) {
    if (!city || typeof city.latitude !== 'number' || typeof city.longitude !== 'number') {
      showError('Invalid Location', 'Please pick a valid place in India.');
      return;
    }

    state.currentCity = city;
    persistLastCity(city);
    updateActiveCityChip(city.name);

    const cacheKey = `${city.latitude.toFixed(4)},${city.longitude.toFixed(4)}`;
    const now = Date.now();

    // Check in-memory cache
    if (!forceRefresh && state.inMemoryCache.has(cacheKey)) {
      const cached = state.inMemoryCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_TTL_MS) {
        state.weatherData = cached.data;
        renderWeatherDashboard(city, cached.data, cached.timestamp, false);
        return;
      }
    }

    // Show skeleton while loading
    showSkeleton();

    const url = `https://api.open-meteo.com/v1/forecast?latitude=${city.latitude}&longitude=${city.longitude}` +
      `&current=temperature_2m,relative_humidity_2m,apparent_temperature,surface_pressure,pressure_msl,weather_code,is_day` +
      `&hourly=temperature_2m,relative_humidity_2m,pressure_msl,weather_code` +
      `&daily=weather_code,temperature_2m_max,temperature_2m_min,relative_humidity_2m_mean` +
      `&timezone=Asia/Kolkata&forecast_days=7`;

    try {
      const data = await fetchWithRetry(url);

      // Save to in-memory cache
      state.inMemoryCache.set(cacheKey, {
        data: data,
        timestamp: Date.now()
      });

      // Also persist to localStorage for offline access
      persistOfflineSnapshot(city, data);

      state.weatherData = data;
      renderWeatherDashboard(city, data, Date.now(), false);
    } catch (err) {
      console.error('Weather fetch failed:', err);

      // Only show offline snapshot if the user is ACTUALLY offline
      if (!navigator.onLine) {
        const offlineSnapshot = getOfflineSnapshot();
        if (offlineSnapshot && offlineSnapshot.city && offlineSnapshot.data) {
          renderWeatherDashboard(offlineSnapshot.city, offlineSnapshot.data, offlineSnapshot.timestamp, true);
          elements.offlineAlertText.textContent = `Offline — showing cached data from ${formatISTTime(new Date(offlineSnapshot.timestamp))}.`;
          elements.offlineAlert.hidden = false;
          elements.offlineAlert.style.display = 'flex';
          hideSkeleton();
          return;
        }
      }

      showError(
        "Couldn't fetch weather",
        'Check your connection and tap Retry.'
      );
    }
  }

  // --------------------------------------------------------------------------
  // Rendering the Weather Dashboard
  // --------------------------------------------------------------------------
  function renderWeatherDashboard(city, data, updateTimestamp, isOfflineSnapshot) {
    hideSkeleton();
    hideError();

    // When rendered with live data, hide offline alert
    if (!isOfflineSnapshot && navigator.onLine) {
      elements.offlineAlert.hidden = true;
      elements.offlineAlert.style.display = 'none';
    }

    const current = data.current || {};
    const hourly = data.hourly || {};
    const daily = data.daily || {};

    const temp = Math.round(current.temperature_2m ?? 0);
    const feelsLike = Math.round(current.apparent_temperature ?? temp);
    const humidity = Math.round(current.relative_humidity_2m ?? 0);
    const pressureMsl = Math.round(current.pressure_msl ?? 1013);
    const surfacePressure = Math.round(current.surface_pressure ?? pressureMsl);
    const weatherCode = current.weather_code ?? 0;
    const isDay = current.is_day ?? 1;

    // 1. Current Conditions Hero Card
    elements.heroCity.textContent = city.name || 'India';
    elements.heroState.textContent = city.admin1 ? `${city.admin1}, India` : 'India';

    const weatherMeta = getWeatherMeta(weatherCode, isDay);
    elements.heroCondition.textContent = weatherMeta.label;
    elements.heroTemp.textContent = `${temp}°`;
    elements.heroFeelsLike.textContent = `${feelsLike}°C`;

    // Large Hero Weather Icon
    elements.heroIconSlot.innerHTML = createWeatherSvg(weatherMeta.iconType, isDay, 60);

    // Hero Update timestamp
    const updateDate = new Date(updateTimestamp || Date.now());
    elements.heroUpdatedTime.textContent = isOfflineSnapshot
      ? `Cached: ${formatISTTime(updateDate)}`
      : `Updated at ${formatISTTime(updateDate)}`;

    // 2. Metric 1: Temperature Card
    elements.metricTempVal.textContent = `${temp}`;
    const todayMax = daily.temperature_2m_max ? Math.round(daily.temperature_2m_max[0]) : temp;
    const todayMin = daily.temperature_2m_min ? Math.round(daily.temperature_2m_min[0]) : temp;
    elements.metricTempHigh.textContent = `${todayMax}°`;
    elements.metricTempLow.textContent = `${todayMin}°`;

    // 3. Metric 2: Humidity Card
    elements.metricHumidityVal.textContent = `${humidity}`;
    const humidityClass = getHumidityClassification(humidity);
    elements.metricHumidityBadge.textContent = humidityClass.label;
    elements.metricHumidityBadge.className = `badge-pill ${humidityClass.badgeClass}`;
    elements.metricHumidityBar.style.width = `${Math.min(Math.max(humidity, 0), 100)}%`;

    // 4. Metric 3: Barometric Pressure Card
    elements.metricPressureVal.textContent = `${pressureMsl}`;
    const pressureClass = getPressureClassification(pressureMsl);
    elements.metricPressureBadge.textContent = pressureClass.label;
    elements.metricPressureBadge.className = `badge-pill ${pressureClass.badgeClass}`;

    // Pressure Trend
    const trend = calculatePressureTrend(hourly, current.time, pressureMsl);
    elements.metricPressureTrend.className = `trend-tag ${trend.cssClass}`;
    elements.metricPressureTrend.querySelector('.trend-icon').textContent = trend.arrow;
    elements.metricPressureTrendText.textContent = trend.text;
    elements.metricPressureTrend.title = trend.description;

    elements.metricSurfacePressure.textContent = `${surfacePressure} hPa`;

    // 5. Hourly Strip (Next 24 Hours)
    renderHourlyStrip(hourly, current.time);

    // 6. 7-Day Forecast
    renderDailyForecast(daily);

    elements.weatherDashboard.hidden = false;
  }

  // --------------------------------------------------------------------------
  // Metric Classifications & Trend Logic
  // --------------------------------------------------------------------------
  function getHumidityClassification(humidity) {
    if (humidity < 30) {
      return { label: 'Dry', badgeClass: 'badge-dry' };
    } else if (humidity <= 60) {
      return { label: 'Comfortable', badgeClass: 'badge-comfortable' };
    } else if (humidity <= 80) {
      return { label: 'Humid', badgeClass: 'badge-humid' };
    } else {
      return { label: 'Very Humid', badgeClass: 'badge-very-humid' };
    }
  }

  function getPressureClassification(pressure) {
    if (pressure < 1008) {
      return { label: 'Low', badgeClass: 'badge-low' };
    } else if (pressure <= 1018) {
      return { label: 'Normal', badgeClass: 'badge-normal' };
    } else {
      return { label: 'High', badgeClass: 'badge-high' };
    }
  }

  function calculatePressureTrend(hourly, currentTimeStr, currentPressure) {
    if (!hourly || !hourly.time || !hourly.pressure_msl) {
      return { arrow: '→', text: 'Steady', cssClass: 'trend-steady', description: 'Trend unavailable' };
    }

    const times = hourly.time;
    const pressures = hourly.pressure_msl;

    let currentIndex = times.findIndex((t) => t === currentTimeStr);
    if (currentIndex === -1) {
      const nowMs = currentTimeStr ? new Date(currentTimeStr).getTime() : Date.now();
      let minDiff = Infinity;
      times.forEach((t, i) => {
        const diff = Math.abs(new Date(t).getTime() - nowMs);
        if (diff < minDiff) {
          minDiff = diff;
          currentIndex = i;
        }
      });
    }

    if (currentIndex >= 3) {
      const pastPressure = pressures[currentIndex - 3];
      if (typeof pastPressure === 'number') {
        const delta = currentPressure - pastPressure;
        if (delta > 1.0) {
          return {
            arrow: '↑',
            text: 'Rising',
            cssClass: 'trend-rising',
            description: `Rose ${delta.toFixed(1)} hPa in the last 3 hours`
          };
        } else if (delta < -1.0) {
          return {
            arrow: '↓',
            text: 'Falling',
            cssClass: 'trend-falling',
            description: `Fell ${Math.abs(delta).toFixed(1)} hPa in the last 3 hours`
          };
        }
      }
    }

    return {
      arrow: '→',
      text: 'Steady',
      cssClass: 'trend-steady',
      description: 'Barometric pressure has remained steady over the last 3 hours'
    };
  }

  // --------------------------------------------------------------------------
  // Hourly Forecast Strip Rendering
  // --------------------------------------------------------------------------
  function renderHourlyStrip(hourly, currentTimeStr) {
    elements.hourlyStrip.innerHTML = '';

    if (!hourly || !hourly.time || hourly.time.length === 0) {
      return;
    }

    const nowMs = currentTimeStr ? new Date(currentTimeStr).getTime() : Date.now();
    let startIndex = 0;

    for (let i = 0; i < hourly.time.length; i++) {
      const timeMs = new Date(hourly.time[i]).getTime();
      if (timeMs >= nowMs - 30 * 60 * 1000) {
        startIndex = i;
        break;
      }
    }

    const fragment = document.createDocumentFragment();
    const count = Math.min(24, hourly.time.length - startIndex);

    for (let i = 0; i < count; i++) {
      const index = startIndex + i;
      const timeStr = hourly.time[index];
      const date = new Date(timeStr);
      const temp = Math.round(hourly.temperature_2m[index] ?? 0);
      const hum = Math.round(hourly.relative_humidity_2m[index] ?? 0);
      const code = hourly.weather_code[index] ?? 0;

      const hour = date.getHours();
      const isDay = hour >= 6 && hour < 18;
      const meta = getWeatherMeta(code, isDay);

      const card = document.createElement('div');
      card.className = `hourly-card${i === 0 ? ' current-hour' : ''}`;

      let timeLabel = '';
      if (i === 0) {
        timeLabel = 'Now';
      } else {
        const period = hour >= 12 ? 'PM' : 'AM';
        const displayHour = hour % 12 === 0 ? 12 : hour % 12;
        timeLabel = `${displayHour} ${period}`;
      }

      const timeDiv = document.createElement('div');
      timeDiv.className = 'hourly-time';
      timeDiv.textContent = timeLabel;

      const iconDiv = document.createElement('div');
      iconDiv.className = 'hourly-icon';
      iconDiv.innerHTML = createWeatherSvg(meta.iconType, isDay, 28);
      iconDiv.title = meta.label;

      const tempDiv = document.createElement('div');
      tempDiv.className = 'hourly-temp';
      tempDiv.textContent = `${temp}°`;

      const humDiv = document.createElement('div');
      humDiv.className = 'hourly-humidity';
      humDiv.innerHTML = `<span>💧</span>${hum}%`;

      card.appendChild(timeDiv);
      card.appendChild(iconDiv);
      card.appendChild(tempDiv);
      card.appendChild(humDiv);

      fragment.appendChild(card);
    }

    elements.hourlyStrip.appendChild(fragment);
  }

  // --------------------------------------------------------------------------
  // 7-Day Forecast Rendering (Balanced, Non-Stretching Bars)
  // --------------------------------------------------------------------------
  function renderDailyForecast(daily) {
    elements.dailyForecastList.innerHTML = '';

    if (!daily || !daily.time || daily.time.length === 0) {
      return;
    }

    // Determine week's min and max
    let weekMin = Infinity;
    let weekMax = -Infinity;

    for (let i = 0; i < daily.time.length; i++) {
      const min = daily.temperature_2m_min[i];
      const max = daily.temperature_2m_max[i];
      if (typeof min === 'number' && min < weekMin) weekMin = min;
      if (typeof max === 'number' && max > weekMax) weekMax = max;
    }

    const rangeSpan = Math.max(weekMax - weekMin, 1);
    const fragment = document.createDocumentFragment();

    const daysCount = Math.min(7, daily.time.length);
    for (let i = 0; i < daysCount; i++) {
      const date = new Date(daily.time[i]);
      const max = Math.round(daily.temperature_2m_max[i] ?? 0);
      const min = Math.round(daily.temperature_2m_min[i] ?? 0);
      const code = daily.weather_code[i] ?? 0;
      const humidityMean = Math.round(daily.relative_humidity_2m_mean?.[i] ?? 0);
      const meta = getWeatherMeta(code, 1);

      const row = document.createElement('div');
      row.className = 'daily-row';

      // Day name
      let dayName = '';
      if (i === 0) {
        dayName = 'Today';
      } else if (i === 1) {
        dayName = 'Tomorrow';
      } else {
        dayName = date.toLocaleDateString('en-IN', { weekday: 'short' });
      }

      const dayDiv = document.createElement('div');
      dayDiv.className = 'daily-day';
      dayDiv.textContent = dayName;

      // Weather condition
      const weatherDiv = document.createElement('div');
      weatherDiv.className = 'daily-weather';

      const iconSpan = document.createElement('span');
      iconSpan.className = 'daily-icon';
      iconSpan.innerHTML = createWeatherSvg(meta.iconType, true, 26);

      const descSpan = document.createElement('span');
      descSpan.className = 'daily-desc';
      descSpan.textContent = meta.label;

      weatherDiv.appendChild(iconSpan);
      weatherDiv.appendChild(descSpan);

      // Temperature bar column
      const tempCol = document.createElement('div');
      tempCol.className = 'daily-temp-bar-col';

      const minSpan = document.createElement('span');
      minSpan.className = 'daily-min';
      minSpan.textContent = `${min}°`;

      const barTrack = document.createElement('div');
      barTrack.className = 'daily-bar-track';

      const barFill = document.createElement('div');
      barFill.className = 'daily-bar-fill';

      // Compute proportional bar fill within the track
      const leftPct = Math.max(0, ((min - weekMin) / rangeSpan) * 100);
      const rightPct = Math.min(100, ((max - weekMin) / rangeSpan) * 100);
      const widthPct = Math.max(rightPct - leftPct, 10);

      barFill.style.left = `${leftPct.toFixed(1)}%`;
      barFill.style.width = `${widthPct.toFixed(1)}%`;

      barTrack.appendChild(barFill);

      const maxSpan = document.createElement('span');
      maxSpan.className = 'daily-max';
      maxSpan.textContent = `${max}°`;

      tempCol.appendChild(minSpan);
      tempCol.appendChild(barTrack);
      tempCol.appendChild(maxSpan);

      // Humidity column
      const humCol = document.createElement('div');
      humCol.className = 'daily-humidity-col';
      humCol.innerHTML = `<span>💧</span><span>${humidityMean}%</span>`;

      row.appendChild(dayDiv);
      row.appendChild(weatherDiv);
      row.appendChild(tempCol);
      row.appendChild(humCol);

      fragment.appendChild(row);
    }

    elements.dailyForecastList.appendChild(fragment);
  }

  // --------------------------------------------------------------------------
  // Search & Live Indian Places Suggestions
  // --------------------------------------------------------------------------
  function initSearch() {
    elements.searchInput.addEventListener('input', (e) => {
      const query = e.target.value.trim();

      if (query.length > 0) {
        elements.clearSearchBtn.hidden = false;
      } else {
        elements.clearSearchBtn.hidden = true;
        closeSuggestions();
        return;
      }

      if (query.length < 2) {
        closeSuggestions();
        return;
      }

      clearTimeout(state.searchDebounceTimer);
      state.searchDebounceTimer = setTimeout(() => {
        searchIndianPlaces(query);
      }, 300);
    });

    elements.clearSearchBtn.addEventListener('click', () => {
      elements.searchInput.value = '';
      elements.clearSearchBtn.hidden = true;
      closeSuggestions();
      elements.searchInput.focus();
    });

    // Keyboard navigation in suggestions list
    elements.searchInput.addEventListener('keydown', (e) => {
      const items = elements.suggestionsList.querySelectorAll('.suggestion-item');
      if (!items.length || elements.suggestionsContainer.hidden) {
        if (e.key === 'Enter') {
          e.preventDefault();
        }
        return;
      }

      if (e.key === 'ArrowDown') {
        e.preventDefault();
        state.activeSuggestionIndex = (state.activeSuggestionIndex + 1) % items.length;
        updateActiveSuggestionItem(items);
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        state.activeSuggestionIndex = (state.activeSuggestionIndex - 1 + items.length) % items.length;
        updateActiveSuggestionItem(items);
      } else if (e.key === 'Enter') {
        e.preventDefault();
        if (state.activeSuggestionIndex >= 0 && state.activeSuggestionIndex < state.currentSuggestions.length) {
          selectSuggestion(state.currentSuggestions[state.activeSuggestionIndex]);
        }
      } else if (e.key === 'Escape') {
        closeSuggestions();
      }
    });

    // Close suggestions on outside click
    document.addEventListener('click', (e) => {
      if (!elements.searchInput.contains(e.target) && !elements.suggestionsContainer.contains(e.target)) {
        closeSuggestions();
      }
    });

    // "Use my location" button
    elements.geoBtn.addEventListener('click', handleGeolocation);

    // Refresh button
    elements.refreshBtn.addEventListener('click', () => {
      if (state.currentCity) {
        loadWeatherForCity(state.currentCity, true);
      }
    });

    // Retry button on error
    elements.retryBtn.addEventListener('click', () => {
      if (state.currentCity) {
        loadWeatherForCity(state.currentCity, true);
      } else {
        loadWeatherForCity(DEFAULT_CITY, true);
      }
    });

    // Logo click loads default city
    elements.brandLogoBtn.addEventListener('click', (e) => {
      e.preventDefault();
      loadWeatherForCity(DEFAULT_CITY);
    });
  }

  async function searchIndianPlaces(query) {
    const geoUrl = `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(query)}&count=8&language=en&countryCode=IN`;

    try {
      const data = await fetchWithRetry(geoUrl, {}, 1);
      const rawResults = data.results || [];

      // Filter: strictly verify country_code is IN and coordinates are inside India bounding box
      const filtered = rawResults.filter((place) => {
        const isCountryIn = (place.country_code || '').toUpperCase() === 'IN';
        const coordsInside = isInsideIndia(place.latitude, place.longitude);
        return isCountryIn && coordsInside;
      });

      renderSuggestions(filtered, query);
    } catch (err) {
      console.warn('Geocoding search failed:', err);
      renderSuggestions([], query);
    }
  }

  function renderSuggestions(places, query) {
    elements.suggestionsList.innerHTML = '';
    state.currentSuggestions = places;
    state.activeSuggestionIndex = -1;

    if (!places.length) {
      const emptyItem = document.createElement('li');
      emptyItem.className = 'suggestion-item';
      emptyItem.style.cursor = 'default';
      emptyItem.innerHTML = `
        <div class="suggestion-place">
          <span class="suggestion-name">No places found for "${escapeHTML(query)}"</span>
          <span class="suggestion-admin">SkyPulse shows weather for India only. Try another city or town.</span>
        </div>
      `;
      elements.suggestionsList.appendChild(emptyItem);
      elements.suggestionsContainer.hidden = false;
      elements.searchInput.setAttribute('aria-expanded', 'true');
      return;
    }

    const fragment = document.createDocumentFragment();

    places.forEach((place, index) => {
      const item = document.createElement('li');
      item.className = 'suggestion-item';
      item.setAttribute('role', 'option');
      item.setAttribute('id', `suggestion-${index}`);

      const placeWrap = document.createElement('div');
      placeWrap.className = 'suggestion-place';

      const nameSpan = document.createElement('span');
      nameSpan.className = 'suggestion-name';
      nameSpan.textContent = place.name;

      const adminSpan = document.createElement('span');
      adminSpan.className = 'suggestion-admin';
      const parts = [];
      if (place.admin1) parts.push(place.admin1);
      parts.push('India');
      adminSpan.textContent = parts.join(', ');

      placeWrap.appendChild(nameSpan);
      placeWrap.appendChild(adminSpan);

      const badge = document.createElement('span');
      badge.className = 'suggestion-badge';
      badge.textContent = place.admin1 ? place.admin1 : 'IN';

      item.appendChild(placeWrap);
      item.appendChild(badge);

      item.addEventListener('click', () => {
        selectSuggestion(place);
      });

      fragment.appendChild(item);
    });

    elements.suggestionsList.appendChild(fragment);
    elements.suggestionsContainer.hidden = false;
    elements.searchInput.setAttribute('aria-expanded', 'true');
  }

  function updateActiveSuggestionItem(items) {
    items.forEach((item, idx) => {
      if (idx === state.activeSuggestionIndex) {
        item.classList.add('active');
        item.scrollIntoView({ block: 'nearest' });
        elements.searchInput.setAttribute('aria-activedescendant', item.id);
      } else {
        item.classList.remove('active');
      }
    });
  }

  function selectSuggestion(place) {
    elements.searchInput.value = place.name;
    closeSuggestions();
    loadWeatherForCity(place);
  }

  function closeSuggestions() {
    elements.suggestionsContainer.hidden = true;
    elements.searchInput.setAttribute('aria-expanded', 'false');
    elements.searchInput.removeAttribute('aria-activedescendant');
    state.activeSuggestionIndex = -1;
  }

  // --------------------------------------------------------------------------
  // Geolocation
  // --------------------------------------------------------------------------
  function handleGeolocation() {
    if (!navigator.geolocation) {
      showSearchHint('Geolocation is not supported by your browser.');
      return;
    }

    const originalText = elements.geoBtn.querySelector('.geo-btn-text').textContent;
    elements.geoBtn.querySelector('.geo-btn-text').textContent = 'Locating...';
    elements.geoBtn.disabled = true;

    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        elements.geoBtn.querySelector('.geo-btn-text').textContent = originalText;
        elements.geoBtn.disabled = false;

        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;

        if (!isInsideIndia(lat, lon)) {
          showSearchHint('SkyPulse shows weather for India only. Try another city.');
          return;
        }

        let locationName = 'Your Location';
        let adminState = 'India';

        try {
          const revRes = await fetch(
            `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${lat}&longitude=${lon}&localityLanguage=en`
          );
          if (revRes.ok) {
            const revData = await revRes.json();
            if (revData.city || revData.locality) {
              locationName = revData.city || revData.locality;
            }
            if (revData.principalSubdivision) {
              adminState = revData.principalSubdivision;
            }
          }
        } catch (e) {
          console.warn('Reverse geocode lookup skipped:', e);
        }

        const cityObj = {
          name: locationName,
          admin1: adminState,
          country: 'India',
          latitude: lat,
          longitude: lon
        };

        elements.searchInput.value = locationName;
        loadWeatherForCity(cityObj);
        showSearchHint(`Found location in ${adminState}, India`);
      },
      (err) => {
        elements.geoBtn.querySelector('.geo-btn-text').textContent = originalText;
        elements.geoBtn.disabled = false;
        console.warn('Geolocation denied or failed:', err);
        showSearchHint('Location access denied. Type your Indian city or village above.');
      },
      { timeout: 9000, maximumAge: 600000 }
    );
  }

  function showSearchHint(text) {
    elements.searchHint.textContent = text;
    setTimeout(() => {
      elements.searchHint.textContent = 'Showing live weather for cities, towns, and villages across India';
    }, 4500);
  }

  // --------------------------------------------------------------------------
  // Popular Cities Chips
  // --------------------------------------------------------------------------
  function initPopularCities() {
    elements.popularCitiesList.innerHTML = '';
    const fragment = document.createDocumentFragment();

    POPULAR_CITIES.forEach((city) => {
      const chip = document.createElement('button');
      chip.type = 'button';
      chip.className = 'city-chip';
      chip.textContent = city.name;
      chip.dataset.cityName = city.name;
      chip.setAttribute('role', 'tab');
      chip.setAttribute('aria-selected', 'false');

      chip.addEventListener('click', () => {
        elements.searchInput.value = city.name;
        loadWeatherForCity(city);
      });

      fragment.appendChild(chip);
    });

    elements.popularCitiesList.appendChild(fragment);
  }

  function updateActiveCityChip(cityName) {
    const chips = elements.popularCitiesList.querySelectorAll('.city-chip');
    chips.forEach((chip) => {
      if (chip.dataset.cityName.toLowerCase() === cityName.toLowerCase()) {
        chip.classList.add('active');
        chip.setAttribute('aria-selected', 'true');
      } else {
        chip.classList.remove('active');
        chip.setAttribute('aria-selected', 'false');
      }
    });
  }

  // --------------------------------------------------------------------------
  // Persistence & Storage Helpers
  // --------------------------------------------------------------------------
  function persistLastCity(city) {
    try {
      localStorage.setItem('skypulse_last_city', JSON.stringify(city));
    } catch (e) {
      console.warn('localStorage setItem failed:', e);
    }
  }

  function getLastCity() {
    try {
      const saved = localStorage.getItem('skypulse_last_city');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  function persistOfflineSnapshot(city, data) {
    try {
      localStorage.setItem(
        'skypulse_offline_data',
        JSON.stringify({
          city: city,
          data: data,
          timestamp: Date.now()
        })
      );
    } catch (e) {
      console.warn('Could not cache snapshot in localStorage:', e);
    }
  }

  function getOfflineSnapshot() {
    try {
      const saved = localStorage.getItem('skypulse_offline_data');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  }

  // --------------------------------------------------------------------------
  // UI State Views: Skeleton & Error Handling
  // --------------------------------------------------------------------------
  function showSkeleton() {
    elements.skeletonLoader.hidden = false;
    elements.weatherDashboard.hidden = true;
    elements.errorContainer.hidden = true;
  }

  function hideSkeleton() {
    elements.skeletonLoader.hidden = true;
  }

  function showError(title, message) {
    hideSkeleton();
    elements.weatherDashboard.hidden = true;
    elements.errorTitle.textContent = title;
    elements.errorMessage.textContent = message;
    elements.errorContainer.hidden = false;
  }

  function hideError() {
    elements.errorContainer.hidden = true;
  }

  // --------------------------------------------------------------------------
  // Utility Functions
  // --------------------------------------------------------------------------
  function formatISTTime(date) {
    return date.toLocaleTimeString('en-IN', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: 'Asia/Kolkata'
    }) + ' IST';
  }

  function escapeHTML(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  // --------------------------------------------------------------------------
  // Application Bootstrap
  // --------------------------------------------------------------------------
  function init() {
    initNetworkMonitor();
    initPopularCities();
    initSearch();

    const initialCity = getLastCity() || DEFAULT_CITY;
    loadWeatherForCity(initialCity);
  }

  // Start app when DOM is ready
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
