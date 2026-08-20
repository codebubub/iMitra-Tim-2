import { api } from './client';

export async function getParameterSkoring() {
  return api<any[]>('/api/parameter/skoring');
}

export async function updateParameterSkoring(items: any[]) {
  return api<any>('/api/parameter/skoring', { method: 'PUT', body: JSON.stringify(items) });
}

export async function getAmbangApproval() {
  return api<any[]>('/api/parameter/ambang-approval');
}

export async function updateAmbangApproval(items: any[]) {
  return api<any>('/api/parameter/ambang-approval', { method: 'PUT', body: JSON.stringify(items) });
}

export async function getRentangMargin() {
  return api<any[]>('/api/parameter/rentang-margin');
}

export async function updateRentangMargin(items: any[]) {
  return api<any>('/api/parameter/rentang-margin', { method: 'PUT', body: JSON.stringify(items) });
}
