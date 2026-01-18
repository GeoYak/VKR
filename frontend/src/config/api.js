const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const handleResponse = async (response) => {
  if (!response.ok) {
    let errorMessage = `HTTP ${response.status}: ${response.statusText}`;
    
    try {
      const errorData = await response.json();
      console.error('API Error:', errorData);
      
      if (errorData.detail) {
        if (Array.isArray(errorData.detail)) {
          errorMessage = errorData.detail.join('; ');
        } else if (typeof errorData.detail === 'string') {
          errorMessage = errorData.detail;
        } else {
          errorMessage = JSON.stringify(errorData.detail);
        }
      } else if (errorData.message) {
        errorMessage = errorData.message;
      }
    } catch (e) {
      console.error('Failed to parse error response:', e);
    }
    
    throw new Error(errorMessage);
  }
  
  if (response.status === 204) {
    return null;
  }
  
  const contentType = response.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  
  return null;
};

const api = {
  users: {
    register: (data) => fetch(`${API_BASE_URL}/users/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    login: (data) => fetch(`${API_BASE_URL}/users/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    logout: () => fetch(`${API_BASE_URL}/users/logout`, {
      method: 'POST',
      credentials: 'include'
    }).then(handleResponse),

    me: () => fetch(`${API_BASE_URL}/users/me`, {
      credentials: 'include'
    }).then(handleResponse),

    updateProfile: (data) => fetch(`${API_BASE_URL}/users/me`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    getAll: () => fetch(`${API_BASE_URL}/users/`, {
      credentials: 'include'
    }).then(handleResponse),

    toggleActive: (userId) => fetch(`${API_BASE_URL}/users/${userId}/toggle-active`, {
      method: 'PATCH',
      credentials: 'include'
    }).then(handleResponse)
  },

  clients: {
    getAll: () => fetch(`${API_BASE_URL}/clients/`, {
      credentials: 'include'
    }).then(handleResponse),

    getById: (id) => fetch(`${API_BASE_URL}/clients/${id}`, {
      credentials: 'include'
    }).then(handleResponse),

    create: (data) => fetch(`${API_BASE_URL}/clients/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    update: (id, data) => fetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    delete: (id) => fetch(`${API_BASE_URL}/clients/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    }).then(handleResponse),

    filter: (filters) => fetch(`${API_BASE_URL}/clients/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(filters)
    }).then(handleResponse)
  },

  properties: {
    getAll: () => fetch(`${API_BASE_URL}/properties/`, {
      credentials: 'include'
    }).then(handleResponse),

    getById: (id) => fetch(`${API_BASE_URL}/properties/${id}`, {
      credentials: 'include'
    }).then(handleResponse),

    create: (data) => fetch(`${API_BASE_URL}/properties/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    update: (id, data) => fetch(`${API_BASE_URL}/properties/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    delete: (id) => fetch(`${API_BASE_URL}/properties/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    }).then(handleResponse),

    filter: (filters) => fetch(`${API_BASE_URL}/properties/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(filters)
    }).then(handleResponse),

    uploadPhoto: (propertyId, file) => {
      const formData = new FormData();
      formData.append('file', file);
      
      return fetch(`${API_BASE_URL}/properties/${propertyId}/photos`, {
        method: 'POST',
        credentials: 'include',
        body: formData
      }).then(handleResponse);
    },

    getPhotoUrl: (propertyId, photoName) => 
      `${API_BASE_URL}/properties/${propertyId}/photos/${photoName}`,

    deletePhoto: (propertyId, photoName) => 
      fetch(`${API_BASE_URL}/properties/${propertyId}/photos/${photoName}`, {
        method: 'DELETE',
        credentials: 'include'
      }).then(handleResponse)
  },

  appointments: {
    getAll: () => fetch(`${API_BASE_URL}/appointments/`, {
      credentials: 'include'
    }).then(handleResponse),

    getById: (id) => fetch(`${API_BASE_URL}/appointments/${id}`, {
      credentials: 'include'
    }).then(handleResponse),

    create: (data) => fetch(`${API_BASE_URL}/appointments/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    update: (id, data) => fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse),

    delete: (id) => fetch(`${API_BASE_URL}/appointments/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    }).then(handleResponse),

    filter: (filters) => fetch(`${API_BASE_URL}/appointments/filter`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(filters)
    }).then(handleResponse),

    getUpcoming: () => fetch(`${API_BASE_URL}/appointments/upcoming`, {
      credentials: 'include'
    }).then(handleResponse)
  },

  deals: {
    getAll: async () => {
      const response = await fetch(`${API_BASE_URL}/deals/`, {
        credentials: 'include'
      });
      return handleResponse(response);
    },
    
    create: async (data) => {
      const response = await fetch(`${API_BASE_URL}/deals/`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },
    
    update: async (id, data) => {
      const response = await fetch(`${API_BASE_URL}/deals/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(data)
      });
      return handleResponse(response);
    },
    
    delete: async (id) => {
      const response = await fetch(`${API_BASE_URL}/deals/${id}`, {
        method: 'DELETE',
        credentials: 'include'
      });
      if (!response.ok) {
        throw new Error('Ошибка удаления сделки');
      }
      return true;
    },

    reportCommissions: async (startDate = null, endDate = null) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const url = `${API_BASE_URL}/deals/reports/commissions${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      return handleResponse(response);
    },

    reportCommissionsAdmin: async (startDate = null, endDate = null) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const url = `${API_BASE_URL}/deals/reports/commissions/admin${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      return handleResponse(response);
    },

    reportTopAgents: async (startDate = null, endDate = null, limit = 10) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      params.append('limit', limit.toString());
      
      const url = `${API_BASE_URL}/deals/reports/top-agents${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      return handleResponse(response);
    },

    reportAgencyRevenue: async (startDate = null, endDate = null) => {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const url = `${API_BASE_URL}/deals/reports/revenue${params.toString() ? '?' + params.toString() : ''}`;
      const response = await fetch(url, {
        credentials: 'include'
      });
      return handleResponse(response);
    }
  },

  documents: {
    getAll: (params = {}) => {
      const queryParams = new URLSearchParams(params);
      return fetch(`${API_BASE_URL}/documents/?${queryParams}`, {
        credentials: 'include'
      }).then(handleResponse);
    },

    getFolders: () => fetch(`${API_BASE_URL}/documents/folders`, {
      credentials: 'include'
    }).then(handleResponse),

    upload: (formData) => fetch(`${API_BASE_URL}/documents/upload`, {
      method: 'POST',
      credentials: 'include',
      body: formData
    }).then(handleResponse),

    download: async (id, filename) => {
      const response = await fetch(`${API_BASE_URL}/documents/${id}/download`, {
        credentials: 'include'
      });
      
      if (!response.ok) {
        throw new Error(`Ошибка загрузки: ${response.statusText}`);
      }
      
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    },

    delete: (id) => fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'DELETE',
      credentials: 'include'
    }).then(handleResponse),

    update: (id, data) => fetch(`${API_BASE_URL}/documents/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(data)
    }).then(handleResponse)
  }
};

export default api;