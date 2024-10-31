class Itinerary {
    constructor() {
        this.initializeElements();
        this.attachEventListeners();
        this.loadItineraryItems();
        this.editingIndex = -1;
    }

    initializeElements() {
        this.form = document.getElementById('itineraryForm');
        this.list = document.getElementById('itineraryList');
        this.updateBtn = document.getElementById('updateBtn');
        this.clearAllBtn = document.getElementById('clearAllBtn');
        this.items = JSON.parse(localStorage.getItem('itineraryItems')) || [];
        
        // Create destination field
        this.createDestinationField();
        
        this.updateClearAllButtonVisibility();
    }

    createDestinationField() {
        const activityNameInput = document.getElementById('activityName');
        const destinationField = document.createElement('div');
        destinationField.className = 'destination-field';
        
        // Create input for search
        const input = document.createElement('input');
        input.type = 'text';
        input.id = 'destinationSearch';
        input.placeholder = 'Search destination...';
        input.autocomplete = 'off';
        
        // Create select element
        const select = document.createElement('select');
        select.id = 'activityDestination';
        select.required = true;
        select.style.display = 'none';
        
        // Default option
        select.innerHTML = '<option value="">Select destination...</option>';
        
        // Add search functionality with debounce
        let timeout;
        input.addEventListener('input', (e) => {
            clearTimeout(timeout);
            const query = e.target.value;
            
            if (query.length < 2) {
                select.style.display = 'none';
                return;
            }
            
            timeout = setTimeout(async () => {
                try {
                    const locations = await itineraryWeather.searchLocations(query);
                    if (locations && locations[0]?.cities) {
                        select.innerHTML = '<option value="">Select destination...</option>';
                        locations[0].cities.forEach(city => {
                            const option = document.createElement('option');
                            option.value = city.name;
                            option.textContent = `${city.name}, ${locations[0].country}`;
                            option.dataset.country = locations[0].country;
                            option.dataset.countryCode = locations[0].countryCode;
                            select.appendChild(option);
                        });
                        select.style.display = 'block';
                    }
                } catch (error) {
                    console.error('Error searching locations:', error);
                }
            }, 300);
        });
        
        // Handle selection
        select.addEventListener('change', (e) => {
            if (e.target.value) {
                input.value = e.target.selectedOptions[0].textContent;
                select.style.display = 'none';
            }
        });
        
        destinationField.appendChild(input);
        destinationField.appendChild(select);
        activityNameInput.parentNode.insertBefore(destinationField, activityNameInput.nextSibling);
    }

    attachEventListeners() {
        this.form.addEventListener('submit', (e) => this.handleSubmit(e));
        document.querySelector('#updateBtn').addEventListener('click', () => this.handleUpdate());
        document.querySelector('#cancelUpdateBtn').addEventListener('click', () => this.cancelUpdate());
        this.clearAllBtn.addEventListener('click', () => this.clearAllItems());

        // Add weather data fetch when destination changes
        const destinationSelect = document.getElementById('activityDestination');
        destinationSelect.addEventListener('change', async (e) => {
            if (!e.target.value) return;
            
            const selectedOption = e.target.selectedOptions[0];
            const locationName = selectedOption.value;
            
            // Fetch weather data
            const weatherData = await itineraryWeather.fetchWeatherForLocation(locationName);
            
            if (weatherData) {
                selectedOption.dataset.weather = JSON.stringify(weatherData);
            }
        });
    }

    // Create
    async handleSubmit(e) {
        e.preventDefault();
        
        try {
            const destinationSelect = document.getElementById('activityDestination');
            const selectedOption = destinationSelect.selectedOptions[0];
            const weatherData = selectedOption.dataset.weather ? 
                JSON.parse(selectedOption.dataset.weather) : null;

            const newItem = {
                activity: document.getElementById('activityName').value,
                destination: destinationSelect.value,
                country: selectedOption.dataset.country,
                countryCode: selectedOption.dataset.countryCode,
                date: document.getElementById('activityDate').value,
                time: document.getElementById('activityTime').value,
                type: document.getElementById('activityType').value,
                notes: document.getElementById('activityNotes').value,
                weather: weatherData ? {
                    temp: weatherData.temp_c,
                    condition: weatherData.condition.text,
                    code: weatherData.condition.code
                } : null
            };

            // Generate file name
            newItem.fileName = this.generateFileName(newItem.activity);

            // Create the text file
            await this.createActivityFile(newItem);

            // Add to items array
            this.items.push(newItem);
            this.saveAndRender();
            this.resetForm();
            showToast('Activity added successfully!', 'success');
        } catch (error) {
            console.error('Error adding activity:', error);
            showToast('Failed to add activity', 'error');
        }
    }

    // Create txt file for activity
    async createActivityFile(item) {
        const fileName = this.generateFileName(item.activity);
        const content = this.formatActivityContent(item);

        try {
            console.log('Saving file:', {
                fileName,
                directory: 'TextFiles',
                content
            });
            
            const result = await window.electronAPI.saveActivityFile({
                fileName: fileName,
                content: content,
                directory: 'TextFiles'
            });
            
            console.log('Save result:', result);
            return result;
        } catch (error) {
            console.error('Error in createActivityFile:', error);
            throw new Error('Failed to create activity file: ' + error.message);
        }
    }

    // Generate file name with timestamp
    generateFileName(activity) {
        const date = new Date().toISOString().split('T')[0];
        const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
        const sanitizedActivity = activity.toLowerCase()
            .replace(/[^a-z0-9]/g, '_')
            .replace(/_+/g, '_')
            .substring(0, 50);
        return `${date}_${time}_${sanitizedActivity}.txt`;
    }

    // Read
    loadItineraryItems() {
        // Add a test item if the list is empty
        if (this.items.length === 0) {
            this.items.push({
                activity: "Test Activity",
                destination: "Kuala Lumpur",
                country: "Malaysia",
                countryCode: "my",
                date: "2024-01-01",
                time: "10:00",
                type: "outdoor",
                notes: "Test note",
                weather: {
                    temp: 28,
                    condition: "Sunny",
                    code: 1000
                }
            });
            this.saveAndRender();
        }
        
        this.renderItineraryList();
    }

    // Update
    async handleUpdate() {
        try {
            if (this.editingIndex === -1) return;

            const destinationSelect = document.getElementById('activityDestination');
            const selectedOption = destinationSelect.selectedOptions[0];
            const weatherData = selectedOption.dataset.weather ? 
                JSON.parse(selectedOption.dataset.weather) : null;

            const updatedItem = {
                activity: document.getElementById('activityName').value,
                destination: destinationSelect.value,
                country: selectedOption.dataset.country,
                countryCode: selectedOption.dataset.countryCode,
                date: document.getElementById('activityDate').value,
                time: document.getElementById('activityTime').value,
                type: document.getElementById('activityType').value,
                notes: document.getElementById('activityNotes').value,
                weather: weatherData ? {
                    temp: weatherData.temp_c,
                    condition: weatherData.condition.text,
                    code: weatherData.condition.code
                } : null,
                fileName: this.items[this.editingIndex].fileName
            };

            // Update file content
            const content = this.formatActivityContent(updatedItem);
            await window.electronAPI.saveActivityFile({
                fileName: updatedItem.fileName,
                content: content,
                directory: 'TextFiles'
            });

            // Update array
            this.items[this.editingIndex] = updatedItem;
            this.saveAndRender();
            this.resetForm();
            showToast('Activity updated successfully!', 'success');
        } catch (error) {
            console.error('Error updating activity:', error);
            showToast('Failed to update activity', 'error');
        }
    }

    // Delete
    async deleteItem(index) {
        if (confirm('Are you sure you want to delete this activity?')) {
            try {
                const item = this.items[index];
                
                // Get current date for the file name
                const currentDate = new Date();
                const formattedDate = currentDate.toISOString().split('T')[0];
                const formattedTime = currentDate.toTimeString().split(' ')[0].replace(/:/g, '-');
                
                // Generate fileName if it doesn't exist
                const fileName = item.fileName || `${formattedDate}_${formattedTime}_${item.activity.toLowerCase().replace(/[^a-z0-9]/g, '_')}.txt`;
                

                
                console.log('Deleting activity:', {
                    fileName: fileName,
                    directory: 'TextFiles'
                });

                // Try to delete the file
                try {
                    await window.electronAPI.deleteActivityFile({
                        fileName: fileName,
                        directory: 'TextFiles'
                    });
                } catch (fileError) {
                    console.warn('File deletion failed:', fileError);
                    throw fileError;
                }

                // Remove from array and update UI
                this.items.splice(index, 1);
                this.saveAndRender();
                showToast('Activity deleted successfully!', 'success');
            } catch (error) {
                console.error('Error deleting activity:', error);
                showToast('Failed to delete activity', 'error');
            }
        }
    }

    // Utility methods
    saveAndRender() {
        localStorage.setItem('itineraryItems', JSON.stringify(this.items));
        this.renderItineraryList();
        this.updateClearAllButtonVisibility();
    }

    renderItineraryList() {
        if (!this.list) return;
        this.list.innerHTML = '';

        this.items.forEach((item, index) => {
            const itemElement = document.createElement('div');
            itemElement.className = 'itinerary-item';
            
            itemElement.innerHTML = `
                <div class="activity-main">
                    <h3 class="activity-name">${item.activity}</h3>
                    <span class="activity-type ${item.type}">${item.type}</span>
                </div>
                <div class="activity-details">
                    <div class="activity-time">
                        <i class="far fa-calendar"></i> ${this.formatDate(item.date)}
                        <i class="far fa-clock"></i> ${item.time}
                    </div>
                    <div class="activity-location">
                        <i class="fas fa-map-marker-alt"></i> ${item.destination}
                    </div>
                </div>
                <div class="activity-actions">
                    <button onclick="itinerary.editItem(${index})" class="edit-btn">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button onclick="itinerary.deleteItem(${index})" class="delete-btn">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
            `;
            
            this.list.appendChild(itemElement);
        });
    }

    editItem(index) {
        const item = this.items[index];
        
        // Populate form fields
        document.getElementById('activityName').value = item.activity;
        document.getElementById('activityDestination').value = item.destination;
        document.getElementById('activityDate').value = item.date;
        document.getElementById('activityTime').value = item.time;
        document.getElementById('activityType').value = item.type;
        document.getElementById('activityNotes').value = item.notes || '';

        this.editingIndex = index;
        
        // Hide Add button, show Update and Cancel buttons
        document.querySelector('.primary-btn').style.display = 'none';
        document.querySelector('#updateBtn').style.display = 'inline-flex';
        document.querySelector('#cancelUpdateBtn').style.display = 'inline-flex';
    }

    resetForm() {
        this.form.reset();
        this.editingIndex = -1;
        // Reset buttons to initial state
        document.querySelector('.primary-btn').style.display = 'inline-flex';
        document.querySelector('#updateBtn').style.display = 'none';
        document.querySelector('#cancelUpdateBtn').style.display = 'none';
    }

    formatDate(dateStr) {
        return new Date(dateStr).toLocaleDateString('en-US', {
            weekday: 'short',
            month: 'short',
            day: 'numeric'
        });
    }

    getWeatherIcon(code) {
        return itineraryWeather.getWeatherIcon(code);
    }

    // Clear all
    async clearAllItems() {
        if (!confirm('Are you sure you want to delete all activities? This cannot be undone.')) {
            return;
        }

        try {
            // Delete all files
            for (const item of this.items) {
                try {
                    await window.electronAPI.deleteActivityFile({
                        fileName: item.fileName,
                        directory: 'TextFiles'
                    });
                } catch (error) {
                    console.error('Error deleting file:', error);
                }
            }

            // Clear the items array and update storage
            this.items = [];
            this.saveAndRender();
            showToast('All activities cleared successfully!', 'success');
        } catch (error) {
            console.error('Error clearing activities:', error);
            showToast('Failed to clear all activities', 'error');
        }
    }

    updateClearAllButtonVisibility() {
        if (this.clearAllBtn) {
            this.clearAllBtn.style.display = this.items.length > 0 ? 'flex' : 'none';
        }
    }

    // Add this method to format activity content
    formatActivityContent(item) {
        return `Activity Details:
-------------------
Name: ${item.activity}
Destination: ${item.destination}${item.weather ? ` (${item.weather.temp}°C - ${item.weather.condition})` : ''}
Date: ${this.formatDate(item.date)}
Time: ${item.time}
Type: ${item.type}
${item.notes ? `Notes: ${item.notes}` : ''}
-------------------
Created: ${new Date().toLocaleString()}`;
    }

    // Add a new method to handle cancel
    cancelUpdate() {
        this.resetForm();
        // Show Add button, hide Update and Cancel buttons
        document.querySelector('.primary-btn').style.display = 'inline-flex';
        document.querySelector('#updateBtn').style.display = 'none';
        document.querySelector('#cancelUpdateBtn').style.display = 'none';
    }

    // Helper method to get activity type icon
    getActivityTypeIcon(type) {
        const icons = {
            outdoor: 'fa-hiking',
            indoor: 'fa-home',
            transport: 'fa-bus'
        };
        return icons[type] || 'fa-calendar';
    }

    // Helper method to format activity type
    formatActivityType(type) {
        return type.charAt(0).toUpperCase() + type.slice(1);
    }

    renderItem(item, index) {
        return `
            <div class="itinerary-item" data-index="${index}">
                <div class="itinerary-time">
                    <div class="date">${this.formatDate(item.date)}</div>
                    <div class="time">${item.time}</div>
                </div>
                <div class="itinerary-details">
                    <h4>${item.activity}</h4>
                    <div class="activity-meta">
                        ${item.destination ? `
                            <span class="destination">
                                <i class="fas fa-map-marker-alt"></i>
                                ${item.destination}
                            </span>
                        ` : ''}
                        ${item.weather ? `
                            <span class="weather-info">
                                <i class="fas fa-temperature-high"></i>
                                ${item.weather.temp}°C - ${item.weather.condition}
                            </span>
                        ` : ''}
                        <span class="activity-type">
                            <i class="fas ${this.getActivityTypeIcon(item.type)}"></i>
                            ${item.type}
                        </span>
                    </div>
                    ${item.notes ? `<div class="activity-notes">${item.notes}</div>` : ''}
                </div>
                <div class="itinerary-actions">
                    <button class="action-btn edit" onclick="itinerary.editItem(${index})">
                        <i class="fas fa-edit"></i>
                    </button>
                    <button class="action-btn delete" onclick="itinerary.deleteItem(${index})">
                        <i class="fas fa-trash-alt"></i>
                    </button>
                </div>
            </div>
        `;
    }

    // Make sure to expose the instance globally
    static initialize() {
        window.itinerary = new Itinerary();
    }
}

// Initialize after DOM content is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.addEventListener('destinationsReady', () => {
        Itinerary.initialize();
    });
});
