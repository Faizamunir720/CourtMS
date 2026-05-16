const BASE_URL = '/api';

function getToken() {
  return localStorage.getItem('token');
}

async function request(method, endpoint, body = null, isFormData = false) {
  const token = getToken();
  const headers = {};

  if (token) headers['Authorization'] = `Bearer ${token}`;
  if (!isFormData) headers['Content-Type'] = 'application/json';

  const options = { method, headers };
  if (body) options.body = isFormData ? body : JSON.stringify(body);

  const res = await fetch(`${BASE_URL}${endpoint}`, options);
  const data = await res.json().catch(() => ({}));

  if (!res.ok) {
    throw new Error(data.error || `Request failed with status ${res.status}`);
  }
  return data;
}

export const api = {
  get: (endpoint) => request('GET', endpoint),
  post: (endpoint, body) => request('POST', endpoint, body),
  put: (endpoint, body) => request('PUT', endpoint, body),
  delete: (endpoint) => request('DELETE', endpoint),
  upload: (endpoint, formData) => request('POST', endpoint, formData, true),
};

export const authService = {
  login: (email, password) => api.post('/auth/login', { email, password }),
  register: (data) => api.post('/auth/register', data),
  refresh: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
};

export const userService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/users?${q}`);
  },
  getMe: () => api.get('/users/me'),
  getById: (id) => api.get(`/users/${id}`),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
};

export const caseService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/cases?${q}`);
  },
  getById: (id) => api.get(`/cases/${id}`),
  create: (data) => api.post('/cases', data),
  update: (id, data) => api.put(`/cases/${id}`, data),
  assignJudge: (caseId, judgeId) => api.post(`/cases/${caseId}/assign`, { judgeId }),
  getHearings: (caseId) => api.get(`/cases/${caseId}/hearings`),
};

export const hearingService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/hearings?${q}`);
  },
  getById: (id) => api.get(`/hearings/${id}`),
  create: (data) => api.post('/hearings', data),
  update: (id, data) => api.put(`/hearings/${id}`, data),
  recordOutcome: (id, data) => api.put(`/hearings/${id}/outcome`, data),
};

export const documentService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/documents?${q}`);
  },
  upload: (formData) => api.upload('/documents', formData),
  download: (id) => `${BASE_URL}/documents/${id}/download`,
  delete: (id) => api.delete(`/documents/${id}`),
};

export const notificationService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/notifications?${q}`);
  },
  markRead: (id) => api.put(`/notifications/${id}/read`),
  markAllRead: () => api.put('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

export const analyticsService = {
  getOverview: () => api.get('/analytics/overview'),
  getJudgeWorkload: () => api.get('/analytics/judge-workload'),
  getRecentActivity: () => api.get('/analytics/recent-activity'),
};

export const complaintService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/complaints?${q}`);
  },
  create: (data) => api.post('/complaints', data),
  respond: (id, data) => api.put(`/complaints/${id}/respond`, data),
};

export const auditService = {
  getAll: (params = {}) => {
    const q = new URLSearchParams(params).toString();
    return api.get(`/audit-logs?${q}`);
  },
};
