import { api } from './client';

export async function getParameterSkoring() {
  return api<unknown[]>('/api/parameter/skoring');
}

export async function updateParameterSkoring(items: unknown[]) {
  return api<unknown>('/api/parameter/skoring', { method: 'PUT', body: JSON.stringify(items) });
}

export async function getAmbangApproval() {
  return api<unknown[]>('/api/parameter/ambang-approval');
}

export async function updateAmbangApproval(items: unknown[]) {
  return api<unknown>('/api/parameter/ambang-approval', { method: 'PUT', body: JSON.stringify(items) });
}

export async function getRentangMargin() {
  return api<unknown[]>('/api/parameter/rentang-margin');
}

export async function updateRentangMargin(items: unknown[]) {
  return api<unknown>('/api/parameter/rentang-margin', { method: 'PUT', body: JSON.stringify(items) });
}
