class AdvisoriesManager {
    constructor() {
        this.locationSearch = document.getElementById('locationSearch');
        this.suggestionsList = document.getElementById('suggestionsList');
        this.randomCountries = document.getElementById('randomCountries');
        this.advisoryList = document.getElementById('advisoryList');
        this.weatherApiKey = '32804b24a847407391c53709241010';
        this.weatherApiUrl = 'https://api.weatherapi.com/v1/forecast.json';
        this.geoApiUrl = 'https://api.weatherapi.com/v1/search.json';

        // Update popular cities list with more destinations
        this.popularCities = [
            'Kuala Lumpur',
            'Penang',
            'Johor Bahru',
            'Kuching',
            'Kota Kinabalu',
            'Kuantan',
            'Malacca',
            'Ipoh',
            'Bangkok',
            'Singapore',
            'Hong Kong'
        ];

        this.initializeEventListeners();
        this.displayRandomCities();

        // Initialize advisories array
        this.advisories = [];
        this.currentWeatherData = null;

        // Initialize itinerary array from localStorage
        this.itineraryList = this.loadItineraries();
        this.updateItineraryList(); // Display saved itineraries

        // Initialize file management
        this.initializeFileManagement();

        // Initialize popular destinations
        this.displayRandomCities();
        this.initializePopularDestinations();
    }

    initializeEventListeners() {
        // Search input handler with debounce
        this.locationSearch.addEventListener('input', debounce(async (e) => {
            const query = e.target.value;
            if (!query.trim()) {
                this.suggestionsList.innerHTML = '';
                return;
            }

            try {
                const response = await fetch(
                    `${this.geoApiUrl}?key=${this.weatherApiKey}&q=${query}`
                );
                
                if (!response.ok) throw new Error('Location not found');
                
                const data = await response.json();
                
                this.suggestionsList.innerHTML = data.map(location => `
                    <div class="suggestion-item" data-location="${location.name}, ${location.country}">
                        <div class="location-info">
                            <span class="location-name">${location.name}</span>
                            <span class="location-country">${location.region}, ${location.country}</span>
                        </div>
                    </div>
                `).join('');

                // Add click handlers to suggestions
                this.suggestionsList.querySelectorAll('.suggestion-item').forEach(item => {
                    item.addEventListener('click', async () => {
                        const location = item.getAttribute('data-location');
                        await this.selectLocation(location);
                    });
                });

            } catch (error) {
                console.error('Error fetching locations:', error);
                this.suggestionsList.innerHTML = `
                    <div class="suggestion-item error">
                        <i class="fas fa-exclamation-circle"></i>
                        No locations found
                    </div>
                `;
            }
        }, 300));

        // Close suggestions when clicking outside
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.search-container')) {
                this.suggestionsList.innerHTML = '';
            }
        });

        // Add floating button click handler
        document.getElementById('floatingAddBtn').addEventListener('click', () => {
            this.addAllToItinerary();
        });
    }

    displayRandomCities() {
        const randomCountriesElement = document.getElementById('randomCountries');
        
        // Clear existing content
        randomCountriesElement.innerHTML = '';
        
        // Get 7 random cities from the popularCities array
        const selectedCities = this.shuffleArray([...this.popularCities]).slice(0, 7);
        
        // Display selected cities
        selectedCities.forEach(city => {
            const cityCard = document.createElement('div');
            cityCard.className = 'country-card';
            cityCard.setAttribute('data-city', city);
            cityCard.innerHTML = `
                <i class="fas fa-map-marker-alt"></i>
                <span class="city-name">${city}</span>
            `;
            
            // Add click event listener directly
            cityCard.addEventListener('click', () => {
                this.handleCitySelection(city);
            });
            
            randomCountriesElement.appendChild(cityCard);
        });
    }

    shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    async saveToFile(location, advisories) {
        try {
            // Instead of saving to file, we'll update the itinerary list
            const timestamp = new Date().toLocaleDateString();
            const advisoryItem = {
                location,
                date: timestamp,
                advisories: advisories
            };

            // Add to advisories array
            this.advisories.push(advisoryItem);
            
            // Update the itinerary list
            this.updateItineraryList();
            
            this.showToast('Advisory added successfully', 'success');
        } catch (error) {
            this.showToast('Error adding advisory', 'error');
            console.error('Error:', error);
        }
    }

    updateItineraryList() {
        const itineraryListElement = document.getElementById('itineraryList');
        
        if (this.itineraryList.length === 0) {
            itineraryListElement.innerHTML = `
                <div class="empty-itinerary">
                    <i class="fas fa-list-ul"></i>
                    <p>Itinerary list is empty!</p>
                </div>
            `;
            return;
        }

        itineraryListElement.innerHTML = this.itineraryList.map(item => `
            <div class="itinerary-item" data-id="${item.id}">
                <div class="itinerary-header">
                    <div class="itinerary-title">
                        <h4>${item.location}${item.country ? `, ${item.country}` : ''}</h4>
                        <span class="itinerary-user">Created by: ${item.userName || 'Anonymous'}</span>
                    </div>
                    <span class="itinerary-date">${item.date}</span>
                </div>
                <div class="itinerary-content">
                    <div class="itinerary-summary">
                        <div class="itinerary-weather">
                            <i class="fas fa-cloud"></i>
                            <span>${item.details.weather}</span>
                        </div>
                    </div>
                    <div class="itinerary-actions">
                        <div class="action-row">
                            <button class="update-btn" data-id="${item.id}">
                                <i class="fas fa-edit"></i>
                                Update
                            </button>
                            <button class="delete-btn" data-id="${item.id}">
                                <i class="fas fa-trash"></i>
                                Delete
                            </button>
                        </div>
                        <button class="details-btn" data-id="${item.id}">
                            <i class="fas fa-file-alt"></i>
                            Read Text File
                        </button>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners after rendering
        const updateButtons = itineraryListElement.querySelectorAll('.update-btn');
        updateButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = button.getAttribute('data-id');
                this.updateItineraryItem(itemId);
            });
        });

        const deleteButtons = itineraryListElement.querySelectorAll('.delete-btn');
        deleteButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = button.getAttribute('data-id');
                this.removeFromItinerary(itemId);
            });
        });

        const detailsButtons = itineraryListElement.querySelectorAll('.details-btn');
        detailsButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                e.preventDefault();
                const itemId = button.getAttribute('data-id');
                this.readTextFile(itemId);
            });
        });
    }

    async toggleDetails(itemId) {
        try {
            const item = this.itineraryList.find(i => i.id === itemId);
            if (!item) return;

            // Create modal for displaying text content
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content details-modal">
                    <h3>${item.location} Details</h3>
                    <div class="details-content">
                        <div class="details-section">
                            <h4><i class="fas fa-file-text"></i> Travel Information</h4>
                            <div id="additionalInfo" class="additional-info">
                                Loading content...
                            </div>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i> Close
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Load and display text file content
            try {
                // Use the same filename format as in createActivityFile
                const date = new Date(item.id).toISOString().split('T')[0];
                const time = new Date(item.id).toTimeString().split(' ')[0].replace(/:/g, '-');
                const sanitizedActivity = 'complete_travel_plan'; // This matches your activity name
                const fileName = `${date}_${time}_${sanitizedActivity}.txt`;

                const response = await fetch(`TextFiles/${fileName}`);
                if (!response.ok) throw new Error('File not found');
                
                const textContent = await response.text();
                document.getElementById('additionalInfo').innerHTML = textContent.replace(/\n/g, '<br>');
            } catch (error) {
                console.error('Error loading text file:', error);
                document.getElementById('additionalInfo').innerHTML = 
                    'No additional information available for this location.';
            }
        } catch (error) {
            console.error('Error showing details:', error);
            this.showToast('Failed to load details', 'error');
        }
    }

    async selectLocation(location) {
        try {
            this.locationSearch.value = location;
            this.currentLocation = location;
            this.suggestionsList.innerHTML = '';

            // Show loading toast
            this.showToast('Loading weather data...', 'info');

            // Wait for weather data to load
            await this.checkWeatherAdvisories(location);

            // Show success toast
            this.showToast(`Weather data loaded for ${location}`, 'success');
        } catch (error) {
            console.error('Error selecting location:', error);
            this.showToast('Failed to load weather data', 'error');
        }
    }

    async loadAdvisories() {
        try {
            const savedAdvisories = localStorage.getItem('advisories');
            this.advisories = savedAdvisories ? JSON.parse(savedAdvisories) : [];
            this.renderAdvisories();
        } catch (error) {
            this.showToast('Error loading advisories', 'error');
        }
    }

    async saveAdvisories() {
        try {
            localStorage.setItem('advisories', JSON.stringify(this.advisories));
            this.showToast('Advisory saved successfully', 'success');
        } catch (error) {
            this.showToast('Error saving advisory', 'error');
        }
    }

    handleFormSubmit() {
        const title = document.getElementById('advisoryTitle').value;
        const type = document.getElementById('advisoryType').value;
        const description = document.getElementById('advisoryDescription').value;

        if (this.editMode) {
            this.updateAdvisory(this.editId, { title, type, description });
        } else {
            this.createAdvisory({ title, type, description });
        }

        this.advisoryForm.reset();
        this.editMode = false;
        this.editId = null;
    }

    createAdvisory(advisory) {
        const newAdvisory = {
            id: Date.now(),
            ...advisory,
            createdAt: new Date().toISOString()
        };

        this.advisories.push(newAdvisory);
        this.saveAdvisories();
        this.renderAdvisories();
    }

    updateAdvisory(id, updatedData) {
        this.advisories = this.advisories.map(advisory => 
            advisory.id === id ? { ...advisory, ...updatedData } : advisory
        );
        this.saveAdvisories();
        this.renderAdvisories();
    }

    deleteAdvisory(id) {
        if (confirm('Are you sure you want to delete this advisory?')) {
            this.advisories = this.advisories.filter(advisory => advisory.id !== id);
            this.saveAdvisories();
            this.renderAdvisories();
        }
    }

    editAdvisory(id) {
        const advisory = this.advisories.find(a => a.id === id);
        if (advisory) {
            document.getElementById('advisoryTitle').value = advisory.title;
            document.getElementById('advisoryType').value = advisory.type;
            document.getElementById('advisoryDescription').value = advisory.description;
            
            this.editMode = true;
            this.editId = id;
            
            document.querySelector('.primary-btn').innerHTML = `
                <i class="fas fa-save"></i>
                Update Advisory
            `;
        }
    }

    renderAdvisories() {
        this.advisoryList.innerHTML = this.advisories
            .map(advisory => this.createAdvisoryElement(advisory))
            .join('');
    }

    createAdvisoryElement(advisory) {
        const typeIcons = {
            weather: 'fa-cloud',
            travel: 'fa-plane',
            safety: 'fa-shield-alt',
            health: 'fa-heartbeat'
        };

        return `
            <div class="advisory-item" data-id="${advisory.id}">
                <div class="advisory-content">
                    <div class="advisory-header">
                        <h4>
                            <i class="fas ${typeIcons[advisory.type]}"></i>
                            ${advisory.title}
                        </h4>
                        <span class="advisory-type ${advisory.type}">
                            ${advisory.type.charAt(0).toUpperCase() + advisory.type.slice(1)}
                        </span>
                    </div>
                    <p class="advisory-description">${advisory.description}</p>
                    <div class="advisory-footer">
                        <span class="advisory-date">
                            <i class="far fa-clock"></i>
                            ${new Date(advisory.createdAt).toLocaleDateString()}
                        </span>
                        <div class="advisory-actions">
                            <button onclick="advisoriesManager.editAdvisory(${advisory.id})" class="action-btn edit">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button onclick="advisoriesManager.deleteAdvisory(${advisory.id})" class="action-btn delete">
                                <i class="fas fa-trash-alt"></i>
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        `;
    }

    showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast ${type}`;
        toast.textContent = message;

        const container = document.getElementById('toast-container');
        container.appendChild(toast);

        // Show toast
        setTimeout(() => toast.classList.add('show'), 100);

        // Remove toast
        setTimeout(() => {
            toast.classList.add('fade-out');
            setTimeout(() => toast.remove(), 300);
        }, 3000);
    }

    async handleLocationSearch(query) {
        if (!query.trim()) {
            this.suggestionsList.innerHTML = '';
            return;
        }

        try {
            const response = await fetch(`${this.geoApiUrl}?key=${this.weatherApiKey}&q=${query}`);
            if (!response.ok) throw new Error('Failed to fetch locations');
            
            const locations = await response.json();
            this.renderLocationSuggestions(locations);
        } catch (error) {
            this.showToast('Error fetching locations', 'error');
        }
    }

    renderLocationSuggestions(locations) {
        if (!locations.length) {
            this.suggestionsList.innerHTML = '<div class="no-suggestions">No locations found</div>';
            return;
        }

        this.suggestionsList.innerHTML = locations
            .map(location => {
                const countryCode = location.country.toLowerCase();
                return `
                    <div class="suggestion-item" data-location="${location.name}, ${location.country}">
                        <img src="https://flagcdn.com/24x18/${countryCode}.png" 
                             alt="${location.country} flag"
                             onerror="this.src='https://flagcdn.com/24x18/xx.png'">
                        <div class="location-info">
                            <span class="location-name">${location.name}</span>
                            <span class="location-country">${location.region}, ${location.country}</span>
                        </div>
                    </div>
                `;
            })
            .join('');

        const suggestions = this.suggestionsList.querySelectorAll('.suggestion-item');
        suggestions.forEach(suggestion => {
            suggestion.addEventListener('click', () => {
                this.selectLocation(suggestion.dataset.location);
            });
        });
    }

    async checkWeatherAdvisories(location = 'London') {
        try {
            const response = await fetch(`${this.weatherApiUrl}?key=${this.weatherApiKey}&q=${location}&days=3`);
            if (!response.ok) throw new Error('Failed to fetch weather data');
            
            const data = await response.json();
            this.currentWeatherData = data;
            
            // Update the destination header
            const destinationHeader = document.querySelector('.destination-header');
            if (destinationHeader) {
                destinationHeader.textContent = data.location.name;
            }

            this.generateWeatherAdvisories(data);
        } catch (error) {
            this.showToast('Error checking weather advisories', 'error');
        }
    }

    async generateWeatherAdvisories(weatherData) {
        const { current, location } = weatherData;
        const advisories = [];
        
        // Create a detailed current weather advisory
        advisories.push({
            title: `Current Weather in ${location.name}`,
            type: 'weather',
            description: `
                Temperature: ${current.temp_c}°C (Feels like ${current.feelslike_c}°C)
                Condition: ${current.condition.text}
                Humidity: ${current.humidity}%
                Wind: ${current.wind_kph} km/h ${current.wind_dir}
                Pressure: ${current.pressure_mb} mb
                Visibility: ${current.vis_km} km
                UV Index: ${current.uv}
            `
        });

        // Temperature warnings
        if (current.temp_c > 30) {
            advisories.push({
                title: 'High Temperature Alert',
                type: 'weather',
                description: `Temperature is ${current.temp_c}°C. Stay hydrated and avoid prolonged sun exposure.`
            });
        }

        if (current.temp_c < 5) {
            advisories.push({
                title: 'Low Temperature Alert',
                type: 'weather',
                description: `Temperature is ${current.temp_c}°C. Bundle up and be cautious of icy conditions.`
            });
        }

        // Rain and wind alerts
        if (current.precip_mm > 0) {
            advisories.push({
                title: 'Current Rainfall',
                type: 'weather',
                description: `Precipitation: ${current.precip_mm}mm
                             Humidity: ${current.humidity}%
                             Cloud Cover: ${current.cloud}%`
            });
        }

        if (current.wind_kph > 40) {
            advisories.push({
                title: 'Strong Wind Alert',
                type: 'weather',
                description: `Wind Speed: ${current.wind_kph} km/h
                             Direction: ${current.wind_dir}
                             Gust Speed: ${current.gust_kph} km/h`
            });
        }

        // UV Index warning
        if (current.uv >= 8) {
            advisories.push({
                title: 'High UV Alert',
                type: 'health',
                description: `UV Index: ${current.uv}
                             Take precautions:
                             - Use sunscreen
                             - Wear protective clothing
                             - Limit sun exposure between 10am-4pm`
            });
        }

        // Update the weather advisories display
        const weatherAdvisoriesContainer = document.getElementById('weatherAdvisories');
        
        if (advisories.length > 0) {
            weatherAdvisoriesContainer.innerHTML = advisories.map(advisory => `
                <div class="advisory-item">
                    <div class="advisory-content">
                        <div class="advisory-header">
                            <h4>
                                <i class="fas ${advisory.type === 'health' ? 'fa-heartbeat' : 'fa-cloud'}"></i>
                                ${advisory.title}
                            </h4>
                        </div>
                        <p class="advisory-description">${advisory.description}</p>
                    </div>
                </div>
            `).join('');

            // Save the advisories
            await this.saveToFile(location.name, advisories);
        } else {
            weatherAdvisoriesContainer.innerHTML = `
                <div class="advisory-item">
                    <div class="advisory-content">
                        <p>No weather advisories for ${location.name} at this time.</p>
                    </div>
                </div>
            `;
        }

        // Generate recommendations
        this.generateActivityRecommendations(weatherData);
        this.generateClothingRecommendations(weatherData);
        this.generateTransportRecommendations(weatherData);

        // Add the "Add All" button to the advisory container
        const advisoryContainer = document.querySelector('.advisory-container');
        if (!advisoryContainer.querySelector('.add-all-to-itinerary')) {
            advisoryContainer.insertBefore(this.addAllToItineraryBtn, advisoryContainer.firstChild);
        }
    }

    generateActivityRecommendations(weatherData) {
        const { current, forecast, location } = weatherData;
        const activities = [];

        // Outdoor activities for good weather
        if (current.temp_c >= 20 && current.temp_c <= 30 && current.precip_mm < 1) {
            activities.push({
                title: 'Perfect for Outdoor Activities',
                description: 'Weather is ideal for hiking, picnics, or sightseeing.',
                icon: 'fa-hiking'
            });
        }

        // Indoor activities for bad weather
        if (current.precip_mm > 0 || current.temp_c < 10) {
            activities.push({
                title: 'Indoor Activities Recommended',
                description: 'Visit museums, galleries, or enjoy local cafes.',
                icon: 'fa-museum'
            });
        }

        // Water activities
        if (current.temp_c > 25 && current.uv < 8) {
            activities.push({
                title: 'Water Activities',
                description: 'Great conditions for swimming or beach activities.',
                icon: 'fa-swimming-pool'
            });
        }

        // Render activities or no-activities message
        const activityContainer = document.getElementById('activitySuggestions');
        if (activities.length > 0) {
            activityContainer.innerHTML = activities.map(activity => `
                <div class="advisory-item">
                    <i class="fas ${activity.icon}"></i>
                    <div class="advisory-content">
                        <h4>${activity.title}</h4>
                        <p>${activity.description}</p>
                    </div>
                </div>
            `).join('');
        } else {
            activityContainer.innerHTML = `
                <div class="empty-advisory">
                    <i class="fas fa-exclamation-circle"></i>
                    <p>No activity recommendations available for current weather conditions in ${location.name}</p>
                </div>
            `;
        }
    }

    generateClothingRecommendations(weatherData) {
        const { current, forecast } = weatherData;
        const clothing = [];

        // Temperature based recommendations
        if (current.temp_c < 10) {
            clothing.push({
                item: 'Winter Wear',
                description: 'Pack warm jackets, gloves, and scarves.',
                icon: 'fa-mitten'
            });
        } else if (current.temp_c < 20) {
            clothing.push({
                item: 'Light Layers',
                description: 'Bring light jackets and long sleeves.',
                icon: 'fa-tshirt'
            });
        } else {
            clothing.push({
                item: 'Summer Clothing',
                description: 'Pack light, breathable clothing.',
                icon: 'fa-sun'
            });
        }

        // Rain protection
        if (current.precip_mm > 0 || forecast.forecastday[0].day.daily_chance_of_rain > 50) {
            clothing.push({
                item: 'Rain Protection',
                description: 'Bring umbrella and waterproof jacket.',
                icon: 'fa-umbrella'
            });
        }

        // Render clothing recommendations
        const clothingContainer = document.getElementById('clothingRecommendations');
        clothingContainer.innerHTML = clothing.map(item => `
            <div class="advisory-item">
                <i class="fas ${item.icon}"></i>
                <div class="advisory-content">
                    <h4>${item.item}</h4>
                    <p>${item.description}</p>
                </div>
            </div>
        `).join('');
    }

    generateTransportRecommendations(weatherData) {
        const { current } = weatherData;
        const transport = [];

        // Base conditions
        const conditions = {
            isRaining: current.precip_mm > 0,
            heavyRain: current.precip_mm > 5,
            strongWind: current.wind_kph > 40,
            poorVisibility: current.vis_km < 5,
            isHot: current.temp_c > 30,
            isCold: current.temp_c < 10,
            isNight: this.isNightTime(weatherData.location.localtime)
        };

        // Public Transport
        transport.push({
            mode: 'Public Transport',
            recommended: true,
            icon: 'fa-bus',
            description: 'Available and convenient option for most conditions.',
            safety: conditions.isRaining ? 'Stay dry while traveling' : 'Regular service available'
        });

        // Walking
        if (!conditions.isRaining && !conditions.isHot && !conditions.isCold) {
            transport.push({
                mode: 'Walking',
                recommended: true,
                icon: 'fa-walking',
                description: 'Perfect weather for walking and exploring the city.',
                safety: 'Comfortable conditions for pedestrians'
            });
        }

        // Cycling
        if (!conditions.isRaining && !conditions.strongWind && !conditions.isHot) {
            transport.push({
                mode: 'Cycling',
                recommended: true,
                icon: 'fa-bicycle',
                description: 'Good conditions for cycling.',
                safety: 'Remember to wear safety gear'
            });
        }

        // Taxi/Ride-sharing
        if (conditions.isRaining || conditions.isNight || conditions.poorVisibility) {
            transport.push({
                mode: 'Taxi/Ride-sharing',
                recommended: true,
                icon: 'fa-taxi',
                description: 'Recommended for current weather conditions.',
                safety: 'Door-to-door service available'
            });
        }

        // Render transport recommendations
        const transportContainer = document.getElementById('transportRecommendations');
        if (transport.length > 0) {
            transportContainer.innerHTML = transport.map(item => `
                <div class="advisory-item">
                    <div class="transport-recommendation ${item.recommended ? 'recommended' : ''}">
                        <div class="transport-header">
                            <i class="fas ${item.icon}"></i>
                            <h4>${item.mode}</h4>
                        </div>
                        <div class="transport-details">
                            <p>${item.description}</p>
                            <div class="safety-info">
                                <i class="fas fa-shield-alt"></i>
                                <span>${item.safety}</span>
                            </div>
                        </div>
                    </div>
                </div>
            `).join('');
        } else {
            transportContainer.innerHTML = `
                <div class="empty-advisory">
                    <i class="fas fa-bus"></i>
                    <p>No specific transport recommendations for current conditions</p>
                </div>
            `;
        }
    }

    isNightTime(localtime) {
        const hour = new Date(localtime).getHours();
        return hour < 6 || hour > 20;
    }

    async addToItinerary(location, weatherData, activities, packing) {
        try {
            const itineraryItem = {
                id: Date.now(), // Unique ID for each item
                location: location,
                date: new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: '2-digit',
                    day: '2-digit'
                }),
                userName: 'Anonymous', // Default value
                details: {
                    weather: `Temperature: ${weatherData.temp_c}°C, Condition: ${weatherData.condition}`,
                    activities: activities,
                    packing: packing
                }
            };

            this.itineraryList.push(itineraryItem);
            this.saveItineraries(); // Save to localStorage
            this.updateItineraryList();
            this.showToast('Added to itinerary successfully', 'success');
        } catch (error) {
            console.error('Error adding to itinerary:', error);
            this.showToast('Failed to add to itinerary', 'error');
        }
    }

    getCurrentWeatherSummary() {
        // Add this method to get current weather conditions
        const current = this.currentWeatherData?.current;
        if (!current) return 'Weather data not available';
        
        return `Temperature: ${current.temp_c}°C, Condition: ${current.condition.text}`;
    }

    async addAllToItinerary() {
        // Create and show modal
        const modal = document.createElement('div');
        modal.className = 'modal';
        modal.innerHTML = `
            <div class="modal-content">
                <h3>Add to Itinerary</h3>
                <div class="form-group">
                    <input type="text" id="userName" placeholder="Enter your name" required>
                </div>
                <div class="modal-actions">
                    <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                        <i class="fas fa-times"></i>
                        Cancel
                    </button>
                    <button class="primary-btn" id="confirmAdd">
                        <i class="fas fa-plus"></i>
                        Add to Itinerary
                    </button>
                </div>
            </div>
        `;
        document.body.appendChild(modal);

        document.getElementById('confirmAdd').addEventListener('click', async () => {
            const userName = document.getElementById('userName').value.trim();
            if (!userName) {
                this.showToast('Please enter your name', 'error');
                return;
            }

            if (!this.currentWeatherData) {
                this.showToast('No weather data available', 'error');
                return;
            }

            const { location } = this.currentWeatherData;
            const date = new Date().toLocaleDateString();
            
            const itineraryItem = {
                id: Date.now(),
                userName: userName,
                location: location.name,
                country: location.country,
                date: date,
                type: 'comprehensive',
                activity: 'Complete Travel Plan',
                details: {
                    weather: this.getCurrentWeatherSummary(),
                    activities: this.getActivityRecommendations(),
                    packing: this.getPackingList(),
                    transport: this.getTransportRecommendations()
                }
            };

            try {
                const fileName = this.generateFileName(itineraryItem.activity);
                await this.createActivityFile(itineraryItem, fileName);
                itineraryItem.fileName = fileName;
                
                this.itineraryList.push(itineraryItem);
                this.saveAndRender();
                this.showToast('All recommendations added to itinerary', 'success');
                modal.remove();
            } catch (error) {
                console.error('Error adding to itinerary:', error);
                this.showToast('Failed to add to itinerary', 'error');
            }
        });
    }

    getTransportRecommendations() {
        const transportElements = document.querySelectorAll('#transportRecommendations .advisory-item');
        return Array.from(transportElements)
            .map(el => {
                const mode = el.querySelector('h4').textContent;
                const description = el.querySelector('.transport-details p').textContent;
                return `${mode}: ${description}`;
            })
            .join('\n');
    }

    async removeFromItinerary(id) {
        try {
            // Show confirmation modal
            const modal = document.createElement('div');
            modal.className = 'modal';
            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Delete Itinerary</h3>
                    <p>Are you sure you want to delete this itinerary?</p>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i> Cancel
                        </button>
                        <button class="delete-btn" id="confirmDelete">
                            <i class="fas fa-trash"></i> Delete
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Handle delete confirmation
            document.getElementById('confirmDelete').addEventListener('click', async () => {
                try {
                    // Find the item to get its details
                    const item = this.itineraryList.find(i => i.id === parseInt(id));
                    if (!item) throw new Error('Itinerary not found');

                    // Delete the file using the same method used for saving
                    try {
                        await window.electronAPI.deleteActivityFile({
                            fileName: item.fileName,
                            directory: 'TextFiles'
                        });
                    } catch (fileError) {
                        console.error('Error deleting file:', fileError);
                        // Continue with list removal even if file deletion fails
                    }

                    // Remove from itinerary list
                    this.itineraryList = this.itineraryList.filter(item => item.id !== parseInt(id));
                    
                    // Save to localStorage and update display
                    localStorage.setItem('itineraries', JSON.stringify(this.itineraryList));
                    this.updateItineraryList();
                    
                    // Close modal and show success message
                    modal.remove();
                    this.showToast('Itinerary deleted successfully', 'success');
                } catch (error) {
                    console.error('Error deleting itinerary:', error);
                    this.showToast('Failed to delete itinerary', 'error');
                    modal.remove();
                }
            });
        } catch (error) {
            console.error('Error showing delete modal:', error);
            this.showToast('Error showing delete modal', 'error');
        }
    }


    // File management helper methods
    generateFileName(activity) {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const sanitizedActivity = activity.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 50);
        return `${date}_${time}_${sanitizedActivity}.txt`;
    }

    async createActivityFile(item, fileName) {
        const content = this.formatActivityContent(item);
        try {
            await window.electronAPI.saveActivityFile({
                fileName,
                content,
                directory: 'TextFiles'
            });
        } catch (error) {
            console.error('Error creating activity file:', error);
            throw new Error('Failed to create activity file: ' + error.message);
        }
    }

    formatActivityContent(item) {
        const transportElements = document.querySelectorAll('#transportRecommendations .advisory-item');
        const transportRecommendations = Array.from(transportElements)
            .map(el => {
                const mode = el.querySelector('h4').textContent;
                const description = el.querySelector('.transport-details p').textContent;
                const safety = el.querySelector('.safety-info span').textContent;
                return `- ${mode}: ${description} (${safety})`;
            })
            .join('\n') || 'No transport recommendations available';

        return `Travel Plan Details:
-------------------
Created by: ${item.userName}
Location: ${item.location}${item.country ? `, ${item.country}` : ''}
Date: ${item.date}

Weather Conditions:
${item.details.weather}

Recommended Activities:
${item.details.activities || 'No activity recommendations available for current conditions'}

Packing List:
${item.details.packing || 'No packing recommendations available'}

Transport Recommendations:
${transportRecommendations}
-------------------
Created: ${new Date().toLocaleString()}`;
    }

    saveAndRender() {
        this.saveItineraries();
        this.updateItineraryList();
    }

    getActivityRecommendations() {
        const activityElements = document.querySelectorAll('#activitySuggestions .advisory-item');
        if (activityElements.length > 0) {
            return Array.from(activityElements)
                .map(el => {
                    const title = el.querySelector('h4').textContent;
                    const description = el.querySelector('p').textContent;
                    return `- ${title}: ${description}`;
                })
                .join('\n');
        } else {
            const emptyMessage = document.querySelector('#activitySuggestions .empty-advisory p');
            return emptyMessage ? emptyMessage.textContent : 'No activity recommendations available';
        }
    }

    getPackingList() {
        const packingElements = document.querySelectorAll('#clothingRecommendations .advisory-item');
        return Array.from(packingElements).map(el => el.querySelector('h4').textContent).join('\n');
    }

    renderItineraryDetails(item) {
        if (item.type === 'comprehensive') {
            return `
                <div class="itinerary-section">
                    <div class="itinerary-weather">
                        <i class="fas fa-cloud"></i>
                        <span>${item.details.weather}</span>
                    </div>
                    <div class="itinerary-activities">
                        <i class="fas fa-hiking"></i>
                        <span>${item.details.activities}</span>
                    </div>
                    <div class="itinerary-packing">
                        <i class="fas fa-suitcase"></i>
                        <span>${item.details.packing}</span>
                    </div>
                </div>
            `;
        }
        // ... existing rendering for other item types ...
    }

    initializePopularDestinations() {
        // Add click event listeners to all country cards
        document.querySelectorAll('.country-card').forEach(card => {
            card.addEventListener('click', () => {
                const cityName = card.getAttribute('data-city');
                if (cityName) {
                    this.handleCitySelection(cityName);
                }
            });
        });
    }

    async handleCitySelection(cityName) {
        try {
            // Show loading state
            this.showToast('Loading weather data...', 'info');
            
            // Fetch weather data for the selected city
            const weatherData = await this.fetchWeatherData(cityName);
            
            // Update the UI with the weather data
            this.currentWeatherData = weatherData;
            await this.generateWeatherAdvisories(weatherData);
            this.generateActivityRecommendations(weatherData);
            this.generateClothingRecommendations(weatherData);
            
            // Clear the search input and suggestions
            this.locationSearch.value = '';
            this.suggestionsList.innerHTML = '';
            
            // Show success message
            this.showToast(`Weather data loaded for ${cityName}`, 'success');
        } catch (error) {

        }
    }

    async fetchWeatherData(location) {
        try {
            const response = await fetch(`${this.weatherApiUrl}?key=${this.weatherApiKey}&q=${location}&days=3&aqi=yes`);
            if (!response.ok) {
                throw new Error('Weather data not available');
            }
            return await response.json();
        } catch (error) {
            console.error('Error fetching weather data:', error);
            throw error;
        }
    }

    async updateItineraryItem(id) {
        try {
            const modal = document.createElement('div');
            modal.className = 'modal';
            
            const item = this.itineraryList.find(i => i.id === parseInt(id));
            if (!item) throw new Error('Itinerary item not found');

            modal.innerHTML = `
                <div class="modal-content">
                    <h3>Update Itinerary</h3>
                    <div class="form-group">
                        <input type="text" id="updateUserName" 
                               placeholder="Enter your name" 
                               value="${item.userName || ''}" required>
                    </div>
                    <div class="form-group search-container">
                        <input type="text" id="updateLocation" 
                               placeholder="Search for a destination..."
                               value="${item.location}" required>
                        <div id="updateLocationSuggestions" class="suggestions-list"></div>
                    </div>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i>
                            Cancel
                        </button>
                        <button class="primary-btn" id="confirmUpdate">
                            <i class="fas fa-check"></i>
                            Update
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

            // Add location search functionality with debounce
            const locationInput = document.getElementById('updateLocation');
            const suggestionsContainer = document.getElementById('updateLocationSuggestions');
            let selectedLocation = item.location;

            // Add debounced input handler
            locationInput.addEventListener('input', debounce(async (e) => {
                const query = e.target.value.trim();
                if (!query) {
                    suggestionsContainer.innerHTML = '';
                    return;
                }

                try {
                    const response = await fetch(
                        `${this.geoApiUrl}?key=${this.weatherApiKey}&q=${query}`
                    );
                    
                    if (!response.ok) throw new Error('Location not found');
                    
                    const locations = await response.json();
                    
                    if (!locations.length) {
                        suggestionsContainer.innerHTML = '<div class="no-suggestions">No locations found</div>';
                        return;
                    }

                    suggestionsContainer.innerHTML = locations.map(location => `
                        <div class="suggestion-item" data-location="${location.name}, ${location.country}">
                            <img src="https://flagcdn.com/24x18/${location.country.toLowerCase()}.png" 
                                 alt="${location.country} flag"
                                 onerror="this.src='https://flagcdn.com/24x18/xx.png'">
                            <div class="location-info">
                                <span class="location-name">${location.name}</span>
                                <span class="location-country">${location.region}, ${location.country}</span>
                            </div>
                        </div>
                    `).join('');

                    // Add click handlers for suggestions
                    suggestionsContainer.querySelectorAll('.suggestion-item').forEach(suggestion => {
                        suggestion.addEventListener('click', () => {
                            selectedLocation = suggestion.dataset.location;
                            locationInput.value = selectedLocation;
                            suggestionsContainer.innerHTML = '';
                        });
                    });
                } catch (error) {
                    console.error('Error fetching locations:', error);
                    suggestionsContainer.innerHTML = `
                        <div class="suggestion-item error">
                            <i class="fas fa-exclamation-circle"></i>
                            No locations found
                        </div>
                    `;
                }
            }, 300));

            // Close suggestions when clicking outside
            document.addEventListener('click', (e) => {
                if (!e.target.closest('.search-container')) {
                    suggestionsContainer.innerHTML = '';
                }
            });

            // Update the form submission handler
            document.getElementById('confirmUpdate').addEventListener('click', async () => {
                const userName = document.getElementById('updateUserName').value.trim();
                if (!userName) {
                    this.showToast('Please enter your name', 'error');
                    return;
                }

                if (!selectedLocation) {
                    this.showToast('Please select a destination', 'error');
                    return;
                }

                try {
                    // Get the weather data for the new location
                    const weatherResponse = await fetch(
                        `${this.weatherApiUrl}?key=${this.weatherApiKey}&q=${selectedLocation}&days=1`
                    );
                    if (!weatherResponse.ok) throw new Error('Failed to fetch weather data');
                    const weatherData = await weatherResponse.json();

                    // Extract location and country from weatherData
                    const { name: locationName, country } = weatherData.location;

                    // Update the file content with new location, username and weather
                    const updatedContent = this.formatActivityContent({
                        userName,
                        location: locationName,
                        country: country,
                        date: new Date().toLocaleDateString(),
                        details: {
                            weather: `Temperature: ${weatherData.current.temp_c}°C, Condition: ${weatherData.current.condition.text}`,
                            activities: this.getActivityRecommendations(),
                            packing: this.getPackingList()
                        }
                    });

                    await window.electronAPI.saveActivityFile({
                        fileName: item.fileName,
                        content: updatedContent,
                        directory: 'TextFiles'
                    });

                    // Update item in memory
                    item.userName = userName;
                    item.location = locationName;
                    item.country = country;  // Add country to the item
                    item.details.weather = `Temperature: ${weatherData.current.temp_c}°C, Condition: ${weatherData.current.condition.text}`;

                    // Save to localStorage and update display
                    this.saveAndRender();
                    
                    modal.remove();
                    this.showToast('Itinerary updated successfully', 'success');
                } catch (error) {
                    console.error('Error updating itinerary:', error);
                    this.showToast('Failed to update itinerary', 'error');
                }
            });
        } catch (error) {
            console.error('Error showing update modal:', error);
            this.showToast('Error updating itinerary', 'error');
        }
    }

    // Add these new methods for localStorage management
    loadItineraries() {
        const savedItineraries = localStorage.getItem('itineraries');
        return savedItineraries ? JSON.parse(savedItineraries) : [];
    }

    saveItineraries() {
        localStorage.setItem('itineraries', JSON.stringify(this.itineraryList));
    }

    async readTextFile(itemId) {
        try {
            const item = this.itineraryList.find(i => i.id === parseInt(itemId));
            if (!item) {
                this.showToast('Itinerary not found', 'error');
                return;
            }

            // Generate the content
            const content = this.formatActivityContent(item);

            const modal = document.createElement('div');
            modal.className = 'modal print-container';
            modal.innerHTML = `
                <div class="modal-content details-modal">
                    <div class="print-content">
                        <h3>${item.location}${item.country ? `, ${item.country}` : ''} Travel Plan</h3>
                        <div class="details-content">
                            <pre id="fileContent" class="file-content">${content}</pre>
                        </div>
                    </div>
                    <div class="modal-actions">
                        <button class="secondary-btn" onclick="this.closest('.modal').remove()">
                            <i class="fas fa-times"></i> Close
                        </button>
                        <button class="primary-btn" onclick="window.print()">
                            <i class="fas fa-print"></i> Print
                        </button>
                    </div>
                </div>
            `;
            document.body.appendChild(modal);

        } catch (error) {
            console.error('Error in readTextFile:', error);
            this.showToast('Failed to load travel plan', 'error');
        }
    }

    async saveTextFile(fileName, content) {
        try {
            await window.electronAPI.saveTextFile({
                fileName,
                content,
                directory: 'TextFiles'
            });
        } catch (error) {
            console.error('Error saving text file:', error);
            throw new Error('Failed to save text file: ' + error.message);
        }
    }

    async downloadTextFile(fileName) {
        try {
            // Request the file content from the main process
            const fileContent = await window.electronAPI.readTextFile({
                fileName,
                directory: 'TextFiles'
            });

            // Create a blob from the content
            const blob = new Blob([fileContent], { type: 'text/plain' });
            const url = window.URL.createObjectURL(blob);

            // Create a temporary link and trigger the download
            const downloadLink = document.createElement('a');
            downloadLink.href = url;
            downloadLink.download = fileName;
            document.body.appendChild(downloadLink);
            downloadLink.click();

            // Cleanup
            document.body.removeChild(downloadLink);
            window.URL.revokeObjectURL(url);

            this.showToast('File downloaded successfully', 'success');
        } catch (error) {
            console.error('Error downloading file:', error);
            this.showToast('Failed to download file', 'error');
        }
    }
}

// Debounce helper function
function debounce(func, wait) {
    let timeout;
    return function executedFunction(...args) {
        const later = () => {
            clearTimeout(timeout);
            func(...args);
        };
        clearTimeout(timeout);
        timeout = setTimeout(later, wait);
    };
}

// Initialize the advisories manager
const advisoriesManager = new AdvisoriesManager();
