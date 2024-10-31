class ItineraryWeather {
    constructor() {
        this.API_KEY = '32804b24a847407391c53709241010';
        this.API_BASE_URL = 'https://api.weatherapi.com/v1';
        this.destinations = new Map();
        this.popularCountries = [
            { country: 'Malaysia', countryCode: 'my' },
            { country: 'Japan', countryCode: 'jp' },
            { country: 'United States', countryCode: 'us' },
            { country: 'United Kingdom', countryCode: 'gb' },
            { country: 'France', countryCode: 'fr' },
            { country: 'Italy', countryCode: 'it' },
            { country: 'Spain', countryCode: 'es' },
            { country: 'Australia', countryCode: 'au' },
            { country: 'Singapore', countryCode: 'sg' },
            { country: 'South Korea', countryCode: 'kr' }
        ];
        this.initializeDestinations();
    }

    async initializeDestinations() {
        try {
            const dropdown = document.getElementById('countryHistory');
            if (dropdown) {
                dropdown.innerHTML = `
                    <option value="">Select country...</option>
                    ${this.popularCountries.map(item => `
                        <option value="${item.country}" 
                                data-country-code="${item.countryCode}">
                            ${item.country}
                        </option>
                    `).join('')}
                `;
            }
            window.dispatchEvent(new CustomEvent('destinationsReady'));
        } catch (error) {
            console.error('Failed to initialize destinations:', error);
        }
    }

    async searchLocations(query) {
        try {
            const response = await fetch(
                `${this.API_BASE_URL}/search.json?key=${this.API_KEY}&q=${encodeURIComponent(query)}`
            );
            
            if (!response.ok) throw new Error('Search failed');
            
            const data = await response.json();
            if (!data.length) return [];

            return [{
                country: data[0].country,
                countryCode: data[0].country_code.toLowerCase(),
                cities: data.map(location => ({
                    name: location.name,
                    region: location.region
                }))
            }];
        } catch (error) {
            console.error('Error searching locations:', error);
            return [];
        }
    }

    async fetchWeatherForLocation(location) {
        try {
            const response = await fetch(
                `${this.API_BASE_URL}/current.json?key=${this.API_KEY}&q=${encodeURIComponent(location)}`
            );
            
            if (!response.ok) throw new Error('Weather fetch failed');
            
            const data = await response.json();
            return data.current;
        } catch (error) {
            console.error('Error fetching weather:', error);
            return null;
        }
    }

    getWeatherIcon(code) {
        // Map weather codes to Font Awesome icons
        const iconMap = {
            1000: 'fas fa-sun',           // Clear
            1003: 'fas fa-cloud-sun',     // Partly cloudy
            1006: 'fas fa-cloud',         // Cloudy
            1009: 'fas fa-cloud',         // Overcast
            1030: 'fas fa-smog',          // Mist
            1063: 'fas fa-cloud-rain',    // Patchy rain
            1066: 'fas fa-snowflake',     // Patchy snow
            1087: 'fas fa-bolt',          // Thunder
            1183: 'fas fa-cloud-rain',    // Light rain
            1189: 'fas fa-cloud-rain',    // Moderate rain
            1195: 'fas fa-cloud-showers-heavy', // Heavy rain
            1273: 'fas fa-bolt'           // Thunder
        };
        
        return iconMap[code] || 'fas fa-cloud';
    }
}

// Initialize the weather service
const itineraryWeather = new ItineraryWeather(); 