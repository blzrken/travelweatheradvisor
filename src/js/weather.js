const API_KEY = '32804b24a847407391c53709241010';
const API_BASE_URL = 'https://api.weatherapi.com/v1';

class WeatherApp {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.defaultLocations = [
            'Kuantan',
            'Kuala Lumpur',
            'Jakarta',
            'Bangkok',
            'Sydney'
        ];
        this.initializeDefaultLocations();
        this.destinations = new Map();
    }

    initializeElements() {
        this.locationInput = document.getElementById('locationInput');
        this.searchBtn = document.querySelector('.search-btn');
        this.weatherDetails = document.querySelector('.weather-details');
        this.locationList = document.querySelector('.location-list');
        this.savedLocations = JSON.parse(localStorage.getItem('savedLocations')) || [];
    }

    initializeDefaultLocations() {
        if (this.savedLocations.length === 0) {
            this.savedLocations = [...this.defaultLocations];
            localStorage.setItem('savedLocations', JSON.stringify(this.savedLocations));
        }
        this.renderSavedLocations();
        
        this.defaultLocations.forEach(location => {
            this.fetchWeatherData(location, false);
            this.fetchDestinationWeather(location);
        });
    }

    attachEventListeners() {
        this.searchBtn.addEventListener('click', () => this.searchWeather());
        this.locationInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') this.searchWeather();
        });
    }

    async searchWeather() {
        const location = this.locationInput.value;
        if (!location) return;

        try {
            const response = await fetch(
                `${API_BASE_URL}/forecast.json?key=${API_KEY}&q=${location}&days=3&aqi=yes`
            );
            
            if (!response.ok) throw new Error('Location not found');

            const data = await response.json();
            this.updateWeatherDisplay(data);
            this.updateWeatherDetails(data);
            this.updateForecast(data.forecast);
            this.updateAdvisories(data);
            this.saveLocation(location);
            
        } catch (error) {
            this.showError(error.message);
        }
    }

    updateWeatherDisplay(data) {
        const current = data.current;
        const location = data.location;

        document.querySelector('.temperature-display').textContent = 
            `${Math.round(current.temp_c)}°`;
        document.querySelector('.location-name').textContent = 
            `${location.name}, ${location.country}`;
        document.querySelector('.location-region').textContent = 
            location.region;
        document.querySelector('.weather-time').textContent = 
            this.formatDateTime(location.localtime);
        
        const conditionDiv = document.querySelector('.weather-condition');
        conditionDiv.innerHTML = `
            <i class="${this.getWeatherIcon(current.condition.code)}"></i>
            <span>${current.condition.text}</span>
        `;

        document.querySelector('.sunrise span').textContent = 
            `Sunrise: ${data.forecast.forecastday[0].astro.sunrise}`;
        document.querySelector('.sunset span').textContent = 
            `Sunset: ${data.forecast.forecastday[0].astro.sunset}`;
    }

    updateWeatherDetails(data) {
        const current = data.current;
        const stats = [
            { label: 'Feels Like', value: `${Math.round(current.feelslike_c)}°C`, icon: 'fas fa-temperature-high' },
            { label: 'Humidity', value: `${current.humidity}%`, icon: 'fas fa-tint' },
            { label: 'Wind', value: `${Math.round(current.wind_kph)} km/h`, icon: 'fas fa-wind' },
            { label: 'Rain', value: `${current.precip_mm} mm`, icon: 'fas fa-cloud-rain' },
            { label: 'UV Index', value: current.uv, icon: 'fas fa-sun' },
            { label: 'Visibility', value: `${current.vis_km} km`, icon: 'fas fa-eye' }
        ];

        const statsContainer = document.querySelector('.weather-stats');
        statsContainer.innerHTML = stats.map(({ label, value, icon }) => `
            <div class="weather-stat-item">
                <i class="${icon}"></i>
                <div class="stat-info">
                    <span class="stat-label">${label}</span>
                    <span class="stat-value">${value}</span>
                </div>
            </div>
        `).join('');
    }

    updateForecast(forecast) {
        const forecastContainer = document.querySelector('.forecast-cards');
        forecastContainer.innerHTML = forecast.forecastday.map(day => `
            <div class="forecast-card">
                <div class="forecast-date">${this.formatDate(day.date)}</div>
                <i class="${this.getWeatherIcon(day.day.condition.code)}"></i>
                <div class="forecast-temp">
                    <span class="high">${Math.round(day.day.maxtemp_c)}°</span>
                    <span class="low">${Math.round(day.day.mintemp_c)}°</span>
                </div>
                <div class="forecast-condition">${day.day.condition.text}</div>
            </div>
        `).join('');
    }

    loadSavedLocations() {
        const saved = localStorage.getItem('savedLocations');
        this.savedLocations = saved ? JSON.parse(saved) : [];
        this.renderSavedLocations();
    }

    saveLocation(location) {
        if (!this.savedLocations.includes(location)) {
            this.savedLocations.unshift(location);
            if (this.savedLocations.length > 4) {
                this.savedLocations.pop();
            }
            localStorage.setItem('savedLocations', JSON.stringify(this.savedLocations));
            this.renderSavedLocations();
        }
    }

    renderSavedLocations() {
        this.locationList.innerHTML = this.savedLocations.map(location => `
            <li class="saved-location-item">
                <div class="location-info">
                    <i class="fas fa-map-marker-alt"></i>
                    <span class="location-name">${location}</span>
                </div>
                <span class="location-temp" id="temp-${location.replace(/\s+/g, '-')}">
                    <i class="fas fa-spinner fa-spin"></i>
                </span>
            </li>
        `).join('');

        this.locationList.querySelectorAll('.saved-location-item').forEach(item => {
            item.addEventListener('click', () => {
                const locationName = item.querySelector('.location-name').textContent;
                this.selectLocation(locationName);
            });
        });
    }

    selectLocation(location) {
        this.locationInput.value = location;
        this.searchWeather();
    }

    deleteLocation(location, event) {
        event.stopPropagation();
        this.savedLocations = this.savedLocations.filter(loc => loc !== location);
        localStorage.setItem('savedLocations', JSON.stringify(this.savedLocations));
        this.renderSavedLocations();
    }

    formatDateTime(datetime) {
        const date = new Date(datetime);
        return date.toLocaleString('en-US', {
            hour: '2-digit',
            minute: '2-digit',
            weekday: 'long',
            month: 'short',
            day: 'numeric'
        });
    }

    formatDate(date) {
        return new Date(date).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    getWeatherIcon(code) {
        const iconMap = {
            1000: 'fas fa-sun',
            1003: 'fas fa-cloud-sun',
            1006: 'fas fa-cloud',
            1009: 'fas fa-cloud',
            1030: 'fas fa-smog',
            1063: 'fas fa-cloud-rain',
            1186: 'fas fa-cloud-showers-heavy',
            1189: 'fas fa-cloud-showers-heavy',
            1192: 'fas fa-cloud-showers-heavy',
            1195: 'fas fa-cloud-showers-heavy',
            1273: 'fas fa-bolt',
            1276: 'fas fa-bolt'
        };
        return iconMap[code] || 'fas fa-cloud';
    }

    showError(message) {
        console.error(message);
    }

    async fetchWeatherData(location, updateUI = true) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/forecast.json?key=${API_KEY}&q=${location}&days=3&aqi=yes`
            );
            
            if (!response.ok) throw new Error('Location not found');

            const data = await response.json();
            
            const tempElement = document.getElementById(`temp-${location.replace(/\s+/g, '-')}`);
            if (tempElement) {
                tempElement.innerHTML = `${Math.round(data.current.temp_c)}°C`;
            }

            if (updateUI) {
                this.updateWeatherDisplay(data);
                this.updateWeatherDetails(data);
                this.updateForecast(data.forecast);
                weatherAdvisories.updateAdvisories(data);
            }
            
        } catch (error) {
            console.error(`Error fetching weather for ${location}:`, error);
            const tempElement = document.getElementById(`temp-${location.replace(/\s+/g, '-')}`);
            if (tempElement) {
                tempElement.innerHTML = `<i class="fas fa-exclamation-circle"></i>`;
            }
        }
    }

    async fetchDestinationWeather(location) {
        try {
            const response = await fetch(
                `${API_BASE_URL}/forecast.json?key=${API_KEY}&q=${location}&days=1&aqi=no`
            );
            
            if (!response.ok) throw new Error('Location not found');

            const data = await response.json();
            this.destinations.set(location, {
                name: data.location.name,
                country: data.location.country,
                temp: Math.round(data.current.temp_c),
                condition: data.current.condition.text,
                code: data.current.condition.code
            });
            
            return this.destinations.get(location);
        } catch (error) {
            console.error(`Error fetching weather for ${location}:`, error);
            return null;
        }
    }

    getDestinationsWeather() {
        return Array.from(this.destinations.values());
    }
}

const weatherApp = new WeatherApp();
document.addEventListener('DOMContentLoaded', () => {
    weatherApp.locationInput.value = 'Kuala Lumpur';
    weatherApp.searchWeather();
});
