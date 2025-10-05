// Global map variable
let map;
let userLocation = null;

// Initialize map with default view
function initializeMap() {
  map = L.map('map', {
    zoomControl: true,
    scrollWheelZoom: true,
    doubleClickZoom: true,
    boxZoom: true,
    keyboard: true,
    dragging: true,
    touchZoom: true,
    zoomSnap: 0.1,
    zoomDelta: 0.5
  }).setView([0, 0], 9);
  
  L.tileLayer('https://api.maptiler.com/maps/basic-v2/{z}/{x}/{y}.png?key=OFe9KVBT027J8q6OWgYY', {
    attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
    maxZoom: 18,
    minZoom: 1,
    subdomains: ['a', 'b', 'c'],
    keepBuffer: 2
  }).addTo(map);
}

// Get user's current location and center map
function getUserLocation() {
  console.log("Attempting to get user location...");
  
  // Show loading indicator
  const locationBtn = document.getElementById('locationBtn');
  if (locationBtn) {
    locationBtn.textContent = '⏳';
    locationBtn.disabled = true;
  }
  
  if (navigator.geolocation) {
    // Add timeout and enable high accuracy
    const options = {
      enableHighAccuracy: true,
      timeout: 10000,
      maximumAge: 300000 // 5 minutes
    };
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        console.log("Geolocation successful:", position);
        const latitude = position.coords.latitude;
        const longitude = position.coords.longitude;
        userLocation = { lat: latitude, lng: longitude };
        
        console.log(`User location: ${latitude}, ${longitude}`);
        
        // Center map on user location
        map.setView([latitude, longitude], 16);
        
        // Add a marker for user location
        L.marker([latitude, longitude])
          .addTo(map)
          .bindPopup('Your Location')
          .openPopup();
          
        // Reset button
        if (locationBtn) {
          locationBtn.textContent = '📍';
          locationBtn.disabled = false;
        }
      },
      (error) => {
        console.error("Geolocation error:", error);
        console.error("Error code:", error.code);
        console.error("Error message:", error.message);
        
        // Provide specific error messages
        let errorMessage = "Unable to get your location. ";
        switch(error.code) {
          case error.PERMISSION_DENIED:
            errorMessage += "Location access denied by user.";
            break;
          case error.POSITION_UNAVAILABLE:
            errorMessage += "Location information unavailable.";
            break;
          case error.TIMEOUT:
            errorMessage += "Location request timed out.";
            break;
          default:
            errorMessage += "Unknown error occurred.";
            break;
        }
        console.error(errorMessage);
        
        // Fallback to a default location if geolocation fails
        console.log("Falling back to New York City");
        map.setView([40.7128, -74.0060], 15); // New York City as fallback
        
        // Reset button
        if (locationBtn) {
          locationBtn.textContent = '📍';
          locationBtn.disabled = false;
        }
      },
      options
    );
  } else {
    console.error("Geolocation is not supported by this browser.");
    // Fallback to a default location
    map.setView([40.7128, -74.0060], 15); // New York City as fallback
    
    // Reset button
    if (locationBtn) {
      locationBtn.textContent = '📍';
      locationBtn.disabled = false;
    }
  }
}

// Search for locations using OpenStreetMap Nominatim API
async function searchLocation(query) {
  if (!query.trim()) return [];
  
  try {
    const response = await fetch(
      `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=5&addressdetails=1`
    );
    const data = await response.json();
    return data.map(item => ({
      name: item.display_name,
      lat: parseFloat(item.lat),
      lng: parseFloat(item.lon),
      type: item.type
    }));
  } catch (error) {
    console.error('Search error:', error);
    return [];
  }
}

// Move map to searched location
function moveToLocation(lat, lng, zoom = 18) {
  map.setView([lat, lng], zoom);
  
  // Add a marker for the searched location
  L.marker([lat, lng])
    .addTo(map)
    .bindPopup('Searched Location')
    .openPopup();
}

// Initialize everything when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
  console.log("DOM loaded, initializing map...");
  initializeMap();
  
  // Wait a bit for map to fully initialize before getting location
  setTimeout(() => {
    console.log("Map initialized, getting user location...");
    getUserLocation();
  }, 100);
});

// Export functions for use in other scripts
window.mapFunctions = {
  searchLocation,
  moveToLocation,
  getUserLocation,
  getMap: () => map
};