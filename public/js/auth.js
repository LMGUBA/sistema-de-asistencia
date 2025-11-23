// Authentication handling for Dashboard Trabajo Remoto

// Detectar si estamos en desarrollo para usar el puerto correcto
window.isDevelopment = window.location.hostname === 'localhost';
window.API_BASE_URL = window.isDevelopment ? 'http://localhost:3000' : '';

document.addEventListener('DOMContentLoaded', function() {
    // Check if we're on the login page
    if (window.location.pathname === '/login' || window.location.pathname.endsWith('/login.html')) {
        setupLoginForm();
        return;
    }

    // Check if user is already logged in
    const token = localStorage.getItem('token');
    if (token) {
        // Verify token is still valid
        verifyToken();
    }
});

function setupLoginForm() {
    const loginForm = document.getElementById('loginForm');
    const loginBtn = document.getElementById('loginBtn');

    if (loginForm) {
        loginForm.addEventListener('submit', handleLogin);
    }
}

function handleLogin(event) {
    event.preventDefault();

    const loginBtn = document.getElementById('loginBtn');
    const originalText = loginBtn.innerHTML;

    // Show loading state
    loginBtn.innerHTML = '<div class="spinner mr-2"></div> Iniciando...';
    loginBtn.disabled = true;

    const formData = new FormData(event.target);
    const loginData = Object.fromEntries(formData);

    fetch(`${window.API_BASE_URL}/api/auth/login`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify(loginData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Store token and user data
            localStorage.setItem('token', data.token);
            localStorage.setItem('user', JSON.stringify(data.user));

            // Redirect to dashboard
            window.location.href = '/';
        } else {
            showMessage(data.message || 'Error en el login', 'error');
        }
    })
    .catch(error => {
        console.error('Login error:', error);
        showMessage('Error de conexión. Inténtalo de nuevo.', 'error');
    })
    .finally(() => {
        // Restore button state
        loginBtn.innerHTML = originalText;
        loginBtn.disabled = false;
    });
}

function verifyToken() {
    const token = localStorage.getItem('token');

    if (!token) {
        redirectToLogin();
        return;
    }

    fetch(`${window.API_BASE_URL}/api/auth/verify`, {
        method: 'GET',
        headers: {
            'Authorization': `Bearer ${token}`
        }
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Token is valid, update user data
            localStorage.setItem('user', JSON.stringify(data.user));
        } else {
            // Token is invalid, redirect to login
            redirectToLogin();
        }
    })
    .catch(error => {
        console.error('Token verification error:', error);
        redirectToLogin();
    });
}

function redirectToLogin() {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    window.location.href = '/login';
}

function showMessage(message, type = 'info') {
    const messageDiv = document.getElementById('message');
    const messageText = document.getElementById('messageText');

    if (!messageDiv || !messageText) return;

    messageText.textContent = message;
    messageText.className = `text-sm ${
        type === 'error' ? 'text-red-600' :
        type === 'success' ? 'text-green-600' :
        'text-blue-600'
    }`;

    messageDiv.classList.remove('hidden');

    // Auto-hide after 5 seconds
    setTimeout(() => {
        messageDiv.classList.add('hidden');
    }, 5000);
}

// Utility function to get auth headers
function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
    };
}

// Export functions for use in other modules
window.Auth = {
    getAuthHeaders,
    verifyToken,
    redirectToLogin
};