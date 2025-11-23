// API utilities for Dashboard Trabajo Remoto

// Detectar si estamos en desarrollo para usar el puerto correcto
const isDevelopment = window.isDevelopment;
const API_BASE_URL = window.API_BASE_URL + '/api';

class API {
    static getAuthHeaders() {
        const token = localStorage.getItem('token');
        return {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
        };
    }

    static async request(method, endpoint, data = null) {
        const url = `${API_BASE_URL}${endpoint}`;
        const config = {
            method,
            headers: this.getAuthHeaders()
        };

        if (data && (method === 'POST' || method === 'PUT')) {
            config.body = JSON.stringify(data);
        }

        const response = await fetch(url, config);

        if (response.status === 401) {
            // Token expired or invalid
            localStorage.removeItem('token');
            localStorage.removeItem('user');
            window.location.href = '/login';
            throw new Error('Sesión expirada');
        }

        let result;
        try {
            result = await response.json();
        } catch (parseError) {
            console.error('JSON parse error:', parseError);
            throw new Error('Respuesta inválida del servidor');
        }

        if (!response.ok) {
            throw new Error(result.message || 'Error en la petición');
        }

        // Ensure we return an array if data is expected to be an array
        if (result.success && result.data !== undefined) {
            return result.data;
        }

        return result;
    }

    static async get(endpoint) {
        return this.request('GET', endpoint);
    }

    static async post(endpoint, data) {
        return this.request('POST', endpoint, data);
    }

    static async put(endpoint, data) {
        return this.request('PUT', endpoint, data);
    }

    static async delete(endpoint) {
        return this.request('DELETE', endpoint);
    }
}

// Make API available globally
window.API = API;