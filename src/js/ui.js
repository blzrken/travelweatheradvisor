// Toast Notification
function showToast(message, type = 'success') {
    // Create toast container if it doesn't exist
    let toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        toastContainer = document.createElement('div');
        toastContainer.id = 'toast-container';
        document.body.insertBefore(toastContainer, document.body.firstChild); // Insert at the top
    }

    // Create toast element
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove toast after delay
    setTimeout(() => {
        toast.classList.add('fade-out');
        setTimeout(() => {
            if (toastContainer.contains(toast)) {
                toastContainer.removeChild(toast);
            }
            // Remove container if empty
            if (toastContainer.children.length === 0) {
                document.body.removeChild(toastContainer);
            }
        }, 300);
    }, 3000);
}

// Loading States
function setLoading(element, isLoading) {
    if (isLoading) {
        element.classList.add('loading');
        element.disabled = true;
    } else {
        element.classList.remove('loading');
        element.disabled = false;
    }
}

// Smooth Updates
function updateValueWithAnimation(element, newValue) {
    element.style.transition = 'opacity 0.3s ease';
    element.style.opacity = '0';
    
    setTimeout(() => {
        element.textContent = newValue;
        element.style.opacity = '1';
    }, 300);
}

// Header Scroll Effect
window.addEventListener('scroll', () => {
    const header = document.querySelector('header');
    if (window.scrollY > 50) {
        header.style.background = 'rgba(0, 0, 0, 0.9)';
        header.style.padding = '10px 0';
    } else {
        header.style.background = 'rgba(0, 0, 0, 0.8)';
        header.style.padding = '15px 0';
    }
});

// Temperature Unit Toggle
function toggleTemperatureUnit() {
    const tempDisplay = document.querySelector('.temperature-display');
    const currentTemp = parseFloat(tempDisplay.textContent);
    const currentUnit = tempDisplay.textContent.includes('°C') ? 'C' : 'F';
    
    let newTemp;
    let newUnit;
    
    if (currentUnit === 'C') {
        newTemp = (currentTemp * 9/5) + 32;
        newUnit = 'F';
    } else {
        newTemp = (currentTemp - 32) * 5/9;
        newUnit = 'C';
    }
    
    updateValueWithAnimation(tempDisplay, `${Math.round(newTemp)}°${newUnit}`);
}

