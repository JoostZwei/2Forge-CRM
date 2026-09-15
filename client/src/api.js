const BASE = '/api';

async function req(method, path, body) {
  const res = await fetch(BASE + path, {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    let msg = text;
    try { msg = JSON.parse(text).error || text; } catch {}
    throw new Error(msg);
  }
  return res.json();
}

export const api = {
  // Stats
  getStats: () => req('GET', '/stats'),

  // Companies
  getCompanies: () => req('GET', '/companies'),
  getCompany: (id) => req('GET', `/companies/${id}`),
  createCompany: (d) => req('POST', '/companies', d),
  updateCompany: (id, d) => req('PUT', `/companies/${id}`, d),
  deleteCompany: (id) => req('DELETE', `/companies/${id}`),

  // Contacts
  getContacts: () => req('GET', '/contacts'),
  getContact: (id) => req('GET', `/contacts/${id}`),
  createContact: (d) => req('POST', '/contacts', d),
  updateContact: (id, d) => req('PUT', `/contacts/${id}`, d),
  deleteContact: (id) => req('DELETE', `/contacts/${id}`),

  // Deals
  getDeals: () => req('GET', '/deals'),
  getDeal: (id) => req('GET', `/deals/${id}`),
  createDeal: (d) => req('POST', '/deals', d),
  updateDeal: (id, d) => req('PUT', `/deals/${id}`, d),
  updateDealStage: (id, stage) => req('PATCH', `/deals/${id}/stage`, { stage }),
  deleteDeal: (id) => req('DELETE', `/deals/${id}`),

  // Tasks
  getTasks: () => req('GET', '/tasks'),
  createTask: (d) => req('POST', '/tasks', d),
  updateTask: (id, d) => req('PUT', `/tasks/${id}`, d),
  toggleTask: (id, done) => req('PATCH', `/tasks/${id}/done`, { done }),
  deleteTask: (id) => req('DELETE', `/tasks/${id}`),

  // Notes
  getNotes: (params) => req('GET', `/notes?${new URLSearchParams(params)}`),
  createNote: (d) => req('POST', '/notes', d),
  deleteNote: (id) => req('DELETE', `/notes/${id}`),
};
