/**
 * Backend Connection Test Utility
 * Backend disconnected - new backend in progress. No real fetch; returns stub.
 */

import { API_BASE_URL } from './config.js';

/**
 * Test backend connection (stub - no fetch)
 * @returns {Promise<{success: boolean, message: string, data?: any}>}
 */
export async function testBackendConnection() {
  if (!API_BASE_URL) {
    return {
      success: false,
      message: 'API disabled - new backend in progress',
      data: null,
    };
  }
  try {
    const baseUrl = API_BASE_URL.replace('/api', '');
    const healthUrl = `${baseUrl}/health`;
    const response = await fetch(healthUrl, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    const data = await response.json();
    return { success: true, message: 'Backend server is running', data };
  } catch (error) {
    console.error('❌ Backend connection failed:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to connect to backend',
      error: error,
    };
  }
}

/**
 * Test API endpoint (stub when backend disconnected)
 */
export async function testAPIEndpoint(endpoint) {
  if (!API_BASE_URL) {
    return {
      success: false,
      message: 'API disabled - new backend in progress',
      data: null,
    };
  }
  try {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetch(url, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(5000),
    });
    const data = await response.json();
    if (!response.ok) throw new Error(data.message || `HTTP ${response.status}`);
    return { success: true, message: 'API endpoint is accessible', data };
  } catch (error) {
    console.error('❌ API endpoint test failed:', error.message);
    return {
      success: false,
      message: error.message || 'Failed to access API endpoint',
      error: error,
    };
  }
}

/**
 * Run all connection tests (stub when backend disconnected)
 */
export async function runConnectionTests() {
  const results = {
    health: await testBackendConnection(),
  };
  console.log('📊 Connection Test Results:', results);
  return results;
}

// Auto-run disabled - backend disconnected (new backend in progress)
// if (import.meta.env.DEV && typeof window !== 'undefined') {
//   setTimeout(() => { runConnectionTests().catch(console.error); }, 2000);
// }

