class SavedLocations {
    constructor() {
        this.locations = [
            { name: "Kuantan", temp: "29°C" },
            { name: "Kuala Lumpur", temp: "31°C" },
            { name: "Jakarta", temp: "33°C" },
            { name: "Bangkok", temp: "26°C" },
            { name: "Sydney", temp: "17°C" }
        ];
        this.maxLocations = 5;
    }

    updateLocationsList() {
        const locationList = document.querySelector('.location-list');
        locationList.innerHTML = this.locations.map(location => `
            <li class="saved-location-item">
                <div class="location-info">
                    <i class="fas fa-map-marker-alt location-icon"></i>
                    <span class="location-name">${location.name}</span>
                </div>
                <span class="location-temp">${location.temp}</span>
            </li>
        `).join('');
    }
}

// Initialize saved locations
const savedLocations = new SavedLocations();
savedLocations.updateLocationsList();

function searchLocation(location) {
    document.getElementById('locationInput').value = location;
    searchWeather();
}
