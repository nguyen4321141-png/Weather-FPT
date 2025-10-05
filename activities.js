// Predefined group-friendly outdoor activities
const activityTemplates = [
    { title: "Picnic in the Park 🌳", desc: "Sunny and mild — perfect for a group picnic." },
    { title: "Beach Volleyball 🏖️", desc: "Warm and sunny — gather friends for volleyball." },
    { title: "Group Hiking 🥾", desc: "Cool and dry — explore nearby trails with friends." },
    { title: "Cycling Tour 🚴‍♂️", desc: "Mild temp and low wind — enjoy a group bike ride." },
    { title: "Kayaking Adventure 🚣‍♀️", desc: "Calm waters — fun for small groups." },
    { title: "Outdoor Yoga 🧘‍♂️", desc: "Clear skies and mild temp — good for a relaxing group session." },
    { title: "Photography Walk 📸", desc: "Cloudy but dry — capture scenic shots with friends." },
    { title: "Kite Flying 🌬️", desc: "Windy day — fly kites together in open spaces." },
    { title: "Garden Volunteer Day 🌱", desc: "Mild weather — help out in community gardens." },
    { title: "Fishing Trip 🎣", desc: "Cool weather — organize a small group fishing activity." },
    { title: "Outdoor Board Games 🎲", desc: "Light rain or cloudy — picnic tables and games with friends." },
    { title: "Frisbee or Soccer ⚽", desc: "Clear skies and moderate temp — perfect for group sports." },
    { title: "Camping Night ⛺", desc: "Dry and mild — set up tents and enjoy outdoor games." },
    { title: "Bird Watching 🐦", desc: "Cool, clear skies — ideal for a group walk in nature." },
    { title: "Barbecue Party 🍖", desc: "Warm and sunny — gather friends for food and fun." }
  ];
  
  // Clean NASA values
  function cleanNasaValue(v) {
    if (v === null || v === undefined) return null;
    const num = Number(v);
    if (Number.isNaN(num)) return null;
    if (num >= 900 || num <= -900) return null;
    return num;
  }
  
  // Suggest activities based on forecast
  function suggestActivities(weather, source, selectedDate) {
    const container = document.getElementById("activitiesContainer");
    if (!container) return;
  
    // Clear previous suggestions
    container.innerHTML = "";
  
    // Determine key weather parameters
    let temp = null, wind = null, rain = null, sky = null;
  
    if (source === "OpenWeather") {
      const dateStr = `${selectedDate.getFullYear()}-${String(selectedDate.getMonth()+1).padStart(2,'0')}-${String(selectedDate.getDate()).padStart(2,'0')}`;
      const forecast = weather.list.find(f => f.dt_txt.startsWith(dateStr));
      if (forecast) {
        temp = forecast.main.temp;
        wind = forecast.wind.speed;
        rain = forecast.rain?.['3h'] || 0;
        sky = forecast.weather[0].main.toLowerCase();
      }
    } else if (source === "NASA POWER") {
      const lastCompleteYear = new Date().getFullYear() - 1;
      const today = new Date();
      today.setHours(0,0,0,0);
      const isFuture = selectedDate > today;
      const dateKey = buildPowerDate(selectedDate, isFuture ? lastCompleteYear : null);
      const daily = weather.properties.parameter;
  
      temp = cleanNasaValue(daily.T2M?.[dateKey]);
      wind = cleanNasaValue(daily.WS10M?.[dateKey]);
      rain = cleanNasaValue(daily.PRECTOTCORR?.[dateKey]);
      sky = cleanNasaValue(daily.ALLSKY_KT?.[dateKey]);
    }
  
    // Filter suitable activities based on weather
    const suggested = [];
  
    activityTemplates.forEach(act => {
      if (temp !== null) {
        if (act.title.includes("Picnic") && temp >= 18 && temp <= 28 && rain < 1) suggested.push(act);
        if (act.title.includes("Beach") && temp >= 25 && temp <= 35 && rain < 1) suggested.push(act);
        if (act.title.includes("Hiking") && temp >= 10 && temp <= 22 && rain < 2) suggested.push(act);
        if (act.title.includes("Cycling") && temp >= 15 && temp <= 25 && wind < 6 && rain < 1) suggested.push(act);
        if (act.title.includes("Kayaking") && temp >= 20 && temp <= 30 && wind < 5 && rain < 1) suggested.push(act);
        if (act.title.includes("Yoga") && temp >= 18 && temp <= 28 && rain < 1) suggested.push(act);
        if (act.title.includes("Photography") && rain < 2) suggested.push(act);
        if (act.title.includes("Kite") && wind >= 4 && wind <= 10) suggested.push(act);
        if (act.title.includes("Fishing") && temp >= 5 && temp <= 20 && rain < 2) suggested.push(act);
        if (act.title.includes("Board") && rain < 2) suggested.push(act);
        if (act.title.includes("Soccer") && rain < 2) suggested.push(act);
        if (act.title.includes("Camping") && rain < 2) suggested.push(act);
        if (act.title.includes("Bird") && rain < 2) suggested.push(act);
        if (act.title.includes("Barbecue") && temp >= 20 && temp <= 32 && rain < 1) suggested.push(act);
        if (act.title.includes("Frisbee") && rain < 2) suggested.push(act);
        if (act.title.includes("Volunteer") && temp >= 15 && temp <= 28 && rain < 1) suggested.push(act);
      }
    });
  
    // Insert suggestions (limit max 6)
    suggested.slice(0, 6).forEach(act => {
      const card = document.createElement("div");
      card.className = "activity-card";
      card.innerHTML = `<h3>${act.title}</h3><p>${act.desc}</p>`;
      container.appendChild(card);
    });
  
    // Fallback if none
    if (suggested.length === 0) {
      const fallback = document.createElement("div");
      fallback.className = "activity-card";
      fallback.innerHTML = `<h3>No suitable activities 😔</h3><p>The weather doesn't favor outdoor plans today.</p>`;
      container.appendChild(fallback);
    }
  }
  