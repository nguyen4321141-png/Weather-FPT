document.addEventListener('DOMContentLoaded', () => {
    const goBtn = document.getElementById('goBtn');
    const locationInput = document.getElementById('locationInput');
    const datePicker = document.getElementById('datePicker');
    const dateHelp = document.getElementById('dateHelp');
    const bigMap = document.getElementById('map');
    const mapSmall = document.getElementById('mapSmall');
    const loading = document.getElementById('loading');
    const content = document.getElementById('content');
  
    let searchSuggestions = [];
    let selectedSuggestionIndex = -1;
    let suggestionsContainer = null;
    let searchTimeout = null;
    let lastSearchQuery = '';
    let smallMapInstance = null;
  
    // Helper visibility: only show if user clicks without a date
    function hideDateHelp() {
      if (dateHelp) dateHelp.style.display = 'none';
    }
    function showDateHelp() {
      if (dateHelp) dateHelp.style.display = 'block';
    }

    datePicker.addEventListener('change', () => {
      if (datePicker.value) hideDateHelp();
    });

    goBtn.addEventListener('click', (e) => {
      if (!datePicker.value) {
        e.preventDefault();
        showDateHelp();
        datePicker.focus();
        return;
      }

      // Capture lat/lng and date for future API calls
      let latitude = null;
      let longitude = null;
      if (window.mapFunctions && window.mapFunctions.getMap) {
        const mainMap = window.mapFunctions.getMap();
        if (mainMap) {
          const center = mainMap.getCenter();
          latitude = center.lat;
          longitude = center.lng;
        }
      }

      const selectedDateISO = datePicker.value; // YYYY-MM-DD
      // Store for future use (e.g., API fetch)
      window.selectedForecastParams = { latitude, longitude, date: selectedDateISO };

      showForecast();
    });

    // removed location button and geolocation wiring
  
    // Search functionality
    locationInput.addEventListener('input', handleSearchInput);
    locationInput.addEventListener('keydown', handleSearchKeydown);
    locationInput.addEventListener('blur', () => {
      // Hide suggestions after a short delay to allow clicking
      setTimeout(() => hideSuggestions(), 200);
    });

    // Create suggestions container
    createSuggestionsContainer();

    // Handle search input with debouncing
    function handleSearchInput(e) {
      const query = e.target.value.trim();
      
      // Clear previous timeout
      if (searchTimeout) {
        clearTimeout(searchTimeout);
      }
      
      if (query.length < 2) {
        hideSuggestions();
        return;
      }

      // Skip if same query
      if (query === lastSearchQuery) {
        return;
      }

      // Debounce search by 300ms
      searchTimeout = setTimeout(async () => {
        try {
          searchSuggestions = await window.mapFunctions.searchLocation(query);
          lastSearchQuery = query;
          showSuggestions();
        } catch (error) {
          console.error('Search error:', error);
        }
      }, 300);
    }

    // Handle search keydown events
    function handleSearchKeydown(e) {
      if (e.key === 'Enter') {
        e.preventDefault();
        if (selectedSuggestionIndex >= 0 && searchSuggestions[selectedSuggestionIndex]) {
          selectSuggestion(searchSuggestions[selectedSuggestionIndex]);
        } else {
          // If no suggestion selected, try to search for the current input
          performLocationSearch(locationInput.value);
        }
      } else if (e.key === 'ArrowDown') {
        e.preventDefault();
        selectedSuggestionIndex = Math.min(selectedSuggestionIndex + 1, searchSuggestions.length - 1);
        updateSuggestionSelection();
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        selectedSuggestionIndex = Math.max(selectedSuggestionIndex - 1, -1);
        updateSuggestionSelection();
      } else if (e.key === 'Escape') {
        hideSuggestions();
      }
    }

    // Create suggestions container
    function createSuggestionsContainer() {
      suggestionsContainer = document.createElement('div');
      suggestionsContainer.id = 'searchSuggestions';
      suggestionsContainer.style.cssText = `
        position: absolute;
        top: 100%;
        left: 0;
        right: 0;
        background: white;
        border: 1px solid #ddd;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 1000;
        max-height: 200px;
        overflow-y: auto;
        display: none;
      `;
      
      const searchContainer = document.querySelector('.search-container');
      searchContainer.style.position = 'relative';
      searchContainer.appendChild(suggestionsContainer);
    }

    // Show search suggestions (optimized)
    function showSuggestions() {
      if (!suggestionsContainer || searchSuggestions.length === 0) {
        hideSuggestions();
        return;
      }

      // Use DocumentFragment for better performance
      const fragment = document.createDocumentFragment();
      
      searchSuggestions.forEach((suggestion, index) => {
        const item = document.createElement('div');
        item.className = 'suggestion-item';
        item.textContent = suggestion.name;
        item.addEventListener('click', () => selectSuggestion(suggestion));
        fragment.appendChild(item);
      });

      suggestionsContainer.innerHTML = '';
      suggestionsContainer.appendChild(fragment);
      suggestionsContainer.style.display = 'block';
      selectedSuggestionIndex = -1;
    }

    // Hide search suggestions
    function hideSuggestions() {
      if (suggestionsContainer) {
        suggestionsContainer.style.display = 'none';
      }
    }

    // Update suggestion selection highlighting
    function updateSuggestionSelection() {
      const items = suggestionsContainer.querySelectorAll('div');
      items.forEach((item, index) => {
        if (index === selectedSuggestionIndex) {
          item.style.backgroundColor = '#f0f4ff';
        } else {
          item.style.backgroundColor = 'white';
        }
      });
    }

    // Select a suggestion
    function selectSuggestion(suggestion) {
      locationInput.value = suggestion.name;
      hideSuggestions();
      
      // Move map to selected location
      window.mapFunctions.moveToLocation(suggestion.lat, suggestion.lng);
    }

    // Perform location search
    async function performLocationSearch(query) {
      if (!query.trim()) return;
      
      try {
        const results = await window.mapFunctions.searchLocation(query);
        if (results.length > 0) {
          const firstResult = results[0];
          window.mapFunctions.moveToLocation(firstResult.lat, firstResult.lng);
        }
      } catch (error) {
        console.error('Location search error:', error);
      }
    }

    // Initialize small map (optimized)
    function initializeSmallMap() {
      // Clear any existing map in the small map container
      const smallMapContainer = document.getElementById('mapSmall');
      smallMapContainer.innerHTML = '';
      
      // Create a new map instance for the small map with optimized settings
      smallMapInstance = L.map('mapSmall', {
        zoomControl: false,
        scrollWheelZoom: false,
        doubleClickZoom: false,
        boxZoom: false,
        keyboard: false,
        dragging: false,
        touchZoom: false
      }).setView([0, 0], 2);
      
      L.tileLayer('https://api.maptiler.com/maps/basic-v2/256/{z}/{x}/{y}.png?key=OFe9KVBT027J8q6OWgYY', {
        attribution: '<a href="https://www.maptiler.com/copyright/" target="_blank">&copy; MapTiler</a> <a href="https://www.openstreetmap.org/copyright" target="_blank">&copy; OpenStreetMap contributors</a>',
        maxZoom: 15,
        minZoom: 1,
        keepBuffer: 1
      }).addTo(smallMapInstance);
      
      // Copy the current view from the main map
      if (window.mapFunctions && window.mapFunctions.getMap) {
        const mainMap = window.mapFunctions.getMap();
        if (mainMap) {
          const center = mainMap.getCenter();
          const zoom = Math.min(mainMap.getZoom(), 12); // Limit zoom for small map
          smallMapInstance.setView([center.lat, center.lng], zoom);
          
          // Copy only the last marker to avoid clutter
          let lastMarker = null;
          mainMap.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              lastMarker = layer;
            }
          });
          
          if (lastMarker) {
            const marker = L.marker([lastMarker.getLatLng().lat, lastMarker.getLatLng().lng])
              .addTo(smallMapInstance);
            if (lastMarker.getPopup()) {
              marker.bindPopup(lastMarker.getPopup().getContent());
            }
          }
        }
      }
    }

    // Update small map with new search location
    async function updateSmallMapWithSearch(query) {
      if (!smallMapInstance) return;
      
      try {
        const results = await window.mapFunctions.searchLocation(query);
        if (results.length > 0) {
          const firstResult = results[0];
          
          // Clear existing markers
          smallMapInstance.eachLayer((layer) => {
            if (layer instanceof L.Marker) {
              smallMapInstance.removeLayer(layer);
            }
          });
          
          // Move to new location
          smallMapInstance.setView([firstResult.lat, firstResult.lng], 12);
          
          // Add new marker
          L.marker([firstResult.lat, firstResult.lng])
            .addTo(smallMapInstance)
            .bindPopup('Searched Location')
            .openPopup();
        }
      } catch (error) {
        console.error('Small map search error:', error);
      }
    }
  
    // --- showForecast: simulate fetch, hide big map, show small map + content ---
    async function showForecast() {
      // simple guard: show loading even if location empty (mockup)
      loading.classList.add('show');
      
      const isSmallMapMode = bigMap.style.display === 'none';
      
      // Get current map coordinates
      let latitude = null;
      let longitude = null;
      if (window.mapFunctions && window.mapFunctions.getMap) {
        const mainMap = window.mapFunctions.getMap();
        if (mainMap) {
          const center = mainMap.getCenter();
          latitude = center.lat;
          longitude = center.lng;
        }
      }
      
      // If there's a location input, try to search for it and move the map
      if (locationInput.value.trim()) {
        try {
          if (isSmallMapMode) {
            // If already in small map mode, update the small map directly
            await updateSmallMapWithSearch(locationInput.value);
          } else {
            // If still in big map mode, search the main map first
            await performLocationSearch(locationInput.value);
          }
          
          // Update coordinates after search
          if (window.mapFunctions && window.mapFunctions.getMap) {
            const mainMap = window.mapFunctions.getMap();
            if (mainMap) {
              const center = mainMap.getCenter();
              latitude = center.lat;
              longitude = center.lng;
            }
          }
        } catch (error) {
          console.error('Location search error:', error);
        }
      }
  
      // simulate network/processing
      setTimeout(async () => {
        loading.classList.remove('show');
  
        if (!isSmallMapMode) {
          // First time: hide big map, reveal content and small map
          bigMap.style.display = 'none';
          mapSmall.style.display = 'block';
          content.classList.add('show');
          content.setAttribute('aria-hidden', 'false');
          
          // Initialize small map with the same view as the big map
          initializeSmallMap();
        }
        // If already in small map mode, just update the content
  
        // Fetch weather data if we have coordinates
        if (latitude !== null && longitude !== null) {
          await fetchWeather(latitude, longitude);
        } else {
          console.warn('No coordinates available for weather fetch');
        }
      }, 900);
    }
    
  
    // --- scroll handler (optimized) ---
    const header = document.getElementById('mainHeader');
    let lastKnownScrollY = 0;
    let ticking = false;
    const SHRINK_THRESHOLD = 80;

    function onScroll() {
      const currentScrollY = window.scrollY;
      
      // Only process if scroll position changed significantly
      if (Math.abs(currentScrollY - lastKnownScrollY) < 5) return;
      
      lastKnownScrollY = currentScrollY;
      
      if (!ticking) {
        window.requestAnimationFrame(() => {
          handleScroll(lastKnownScrollY);
          ticking = false;
        });
        ticking = true;
      }
    }

    function handleScroll(scrollY) {
      const shouldShrink = scrollY > SHRINK_THRESHOLD;
      const isAtTop = scrollY === 0;
      
      if (shouldShrink && !header.classList.contains('shrink')) {
        header.classList.add('shrink');
      } else if (isAtTop && header.classList.contains('shrink')) {
        header.classList.remove('shrink');
      }
    }

    window.addEventListener('scroll', onScroll, { passive: true });
  
  });
