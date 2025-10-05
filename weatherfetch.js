// --- Helpers ---
function cleanNasaValue(v) {
  if (v === null || v === undefined) return null;
  const num = Number(v);
  if (Number.isNaN(num)) return null;
  if (num >= 900 || num <= -900) return null;
  return num;
}

function pretty(val, unit = '') {
  return val === null ? 'N/A' : `${val}${unit}`;
}

// Convert HTML date input (MM/DD/YYYY) to JS Date
function parseInputDate(input) {
  if (!input) return new Date(NaN);
  // Support both HTML date (YYYY-MM-DD) and fallback (MM/DD/YYYY)
  if (input.includes('-')) {
    const [yearStr, monthStr, dayStr] = input.split('-');
    const year = Number(yearStr);
    const month = Number(monthStr);
    const day = Number(dayStr);
    return new Date(year, month - 1, day);
  }
  const [month, day, year] = input.split('/').map(Number);
  return new Date(year, month - 1, day);
}

// Build NASA POWER YYYYMMDD string, optionally forcing year (for future dates)
function buildPowerDate(dateObj, forceYear = null) {
  const year = forceYear || dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, '0');
  const day = String(dateObj.getDate()).padStart(2, '0');
  return `${year}${month}${day}`;
}

// --- Fetch Weather ---
async function fetchWeather(latitude, longitude) {
  const dateInput = document.getElementById("datePicker").value;
  if (!dateInput) {
    alert("⚠️ Please select a date first!");
    return;
  }

  const resultBox = document.getElementById("result");
  if (!resultBox) return;

  resultBox.style.display = "block";
  resultBox.classList.add("show");

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const selectedDate = parseInputDate(dateInput);
  selectedDate.setHours(0, 0, 0, 0);

  const diffDays = Math.floor((selectedDate - today) / (1000 * 60 * 60 * 24));

  try {
    if (diffDays >= 0 && diffDays <= 7) {
      // --- OpenWeather 7-day forecast ---
      const apiKey = "ad3a381d8dabe57ba277a7b55e72e59c";
      const url = `https://api.openweathermap.org/data/2.5/forecast?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=metric`;

      const res = await fetch(url);
      const data = await res.json();

      if (data.cod === "200") {
        displayWeather(data, "OpenWeather", selectedDate);
        if (typeof suggestActivities === 'function') {
          suggestActivities(data, "OpenWeather", selectedDate);
        }
      } else {
        resultBox.innerHTML = `<p>Error: ${data.message || 'Failed to fetch weather data'}</p>`;
      }

    } else { 
      // --- NASA POWER climatology for past/future dates ---
      const lastCompleteYear = new Date().getFullYear() - 1;
      const powerYear = diffDays > 7 ? lastCompleteYear : null;
      const powerDate = buildPowerDate(selectedDate, powerYear);

      const proxyUrl = `http://localhost:3000/nasa-power?lat=${latitude}&lon=${longitude}&start=${powerDate}&end=${powerDate}&params=T2M,T2M_MIN,T2M_MAX,PRECTOTCORR,WS10M,RH2M,ALLSKY_KT`;

      const res = await fetch(proxyUrl);
      const data = await res.json();

      if (data.properties && data.properties.parameter) {
        displayWeather(data, "NASA POWER", selectedDate);
        if (typeof suggestActivities === 'function') {
          suggestActivities(data, "NASA POWER", selectedDate);
        }
      } else {
        resultBox.innerHTML = `<p>Error: Failed to fetch NASA POWER data</p>`;
      }
    }

  } catch (error) {
    console.error("Weather fetch error:", error);
    resultBox.innerHTML = `<p>Error: Failed to fetch weather data. ${error.message}</p>`;
  }
}

// --- Display Weather ---
function displayWeather(weather, source, selectedDate) {
  const resultBox = document.getElementById("result");
  const timeButtons = document.getElementById("timeButtons");
  if (!resultBox) return;

  resultBox.style.display = "block";
  resultBox.classList.add("show");

  if (timeButtons) timeButtons.innerHTML = "";

  const displayDate = `${selectedDate.getMonth()+1}/${selectedDate.getDate()}/${selectedDate.getFullYear()}`;

  if (source === "OpenWeather") {
    const forecasts = weather.list.filter(f => f.dt_txt.startsWith(`${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`));

    if (forecasts.length === 0) {
      resultBox.innerHTML = `<p>No forecast available for this date (past hours may already be gone).</p>`;
      return;
    }

    resultBox.innerHTML = `
      <h3>Forecast from OpenWeather 🌤️</h3>
      <p><b>Date:</b> ${displayDate}</p>
      <p>Select a time slot:</p>
      <div id="timeButtonsContainer" style="margin-top:10px;display:flex;gap:6px;flex-wrap:wrap;"></div>
      <div id="timeDetails" style="margin-top:12px;"></div>
    `;

    const container = document.getElementById("timeButtonsContainer");
    const details = document.getElementById("timeDetails");

    forecasts.forEach(f => {
      const time = f.dt_txt.split(" ")[1].slice(0,5);
      const btn = document.createElement("button");
      btn.className = "day-btn";
      btn.innerText = time;
      btn.onclick = () => {
        details.innerHTML = `
          <p><b>Time:</b> ${time}</p>
          <p><b>Avg Temp:</b> ${f.main.temp} °C</p>
          <p><b>Min Temp:</b> ${f.main.temp_min} °C</p>
          <p><b>Max Temp:</b> ${f.main.temp_max} °C</p>
          <p><b>Weather:</b> ${f.weather[0].description}</p>
          <p><b>Humidity:</b> ${f.main.humidity}%</p>
          <p><b>Wind Speed:</b> ${f.wind.speed} m/s</p>
          <p><b>Precipitation:</b>${f.precipitation}mm of rain</p>
        `;
      };
      container.appendChild(btn);
    });

  } else if (source === "NASA POWER") {
    const today = new Date();
    today.setHours(0,0,0,0);
    const lastCompleteYear = new Date().getFullYear() - 1;
    const isFuture = selectedDate > today;
    const dateKey = buildPowerDate(selectedDate, isFuture ? lastCompleteYear : null);
    const daily = weather.properties.parameter;

    resultBox.innerHTML = `
      <h3>Estimate from NASA POWER 🌍</h3>
      <p><b>Date:</b> ${displayDate}</p>
      <p><b>Avg Temp:</b> ${pretty(cleanNasaValue(daily.T2M[dateKey]), ' °C')}</p>
      <p><b>Min Temp:</b> ${pretty(cleanNasaValue(daily.T2M_MIN?.[dateKey]), ' °C')}</p>
      <p><b>Max Temp:</b> ${pretty(cleanNasaValue(daily.T2M_MAX?.[dateKey]), ' °C')}</p>
      <p><b>Humidity:</b> ${pretty(cleanNasaValue(daily.RH2M?.[dateKey]), '%')}</p>
      <p><b>Rainfall:</b> ${pretty(cleanNasaValue(daily.PRECTOTCORR[dateKey]), ' mm of rain')}</p>
      <p><b>Wind Speed:</b> ${pretty(cleanNasaValue(daily.WS10M[dateKey]), ' m/s')}</p>
      <p><b>Sky Clarity:</b> ${pretty(cleanNasaValue(daily.ALLSKY_KT?.[dateKey]))}</p>
      <p class="warning">⚠️ This is a climatology/historical estimate, not a real forecast.</p>
    `;
  }
}
