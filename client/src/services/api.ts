import {
  User,
  DocumentRecord,
  VerificationResult,
  DashboardMetrics,
  RiskConfig,
  AuditLog,
  DocumentType
} from '../../../shared/types';

const API_BASE = '/api';

function getAuthHeader(): Record<string, string> {
  const token = localStorage.getItem('bg_auth_token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const headers = {
    ...getAuthHeader(),
    ...(options.headers || {})
  };

  const response = await fetch(`${API_BASE}${endpoint}`, {
    ...options,
    headers
  });

  const data = await response.json().catch(() => null);

  if (!response.ok) {
    throw new Error(data?.error || `Request failed with status ${response.status}`);
  }

  return data as T;
}

export const api = {
  // Authentication
  auth: {
    login: (credentials: { email: string; password: string }) =>
      request<{ token: string; user: User; message: string }>('/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(credentials)
      }),
    getMe: () => request<{ user: User }>('/auth/me'),
    logout: () =>
      request<{ message: string }>('/auth/logout', {
        method: 'POST'
      })
  },

  // Verification Pipeline
  verification: {
    processUpload: (formData: FormData) =>
      request<VerificationResult>('/verification/process', {
        method: 'POST',
        body: formData
      }),
    processBase64: (imageBase64: string, documentType: DocumentType, scenario?: string) =>
      request<VerificationResult>('/verification/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageBase64, documentType, scenario })
      }),
    processSampleSpecimen: (sampleSpecimenUrl: string, documentType: DocumentType, scenario?: string) =>
      request<VerificationResult>('/verification/process', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sampleSpecimenUrl, documentType, scenario })
      }),
    saveVerification: (result: VerificationResult) =>
      request<{ success: boolean; message: string; id: string }>('/verification/save', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(result)
      }),
    getHistory: (params?: { search?: string; riskLevel?: string; status?: string; documentType?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.riskLevel) query.append('riskLevel', params.riskLevel);
      if (params?.status) query.append('status', params.status);
      if (params?.documentType) query.append('documentType', params.documentType);
      return request<{ records: VerificationResult[]; total: number }>(`/verification/history?${query.toString()}`);
    },
    getById: (id: string) => request<VerificationResult>(`/verification/${id}`)
  },

  // Central Document Registry
  documents: {
    list: (params?: { search?: string; status?: string; type?: string }) => {
      const query = new URLSearchParams();
      if (params?.search) query.append('search', params.search);
      if (params?.status) query.append('status', params.status);
      if (params?.type) query.append('type', params.type);
      return request<DocumentRecord[]>(`/documents?${query.toString()}`);
    },
    create: (doc: Partial<DocumentRecord>) =>
      request<{ success: boolean; id: number; document_number: string }>('/documents', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      }),
    update: (id: number, doc: Partial<DocumentRecord>) =>
      request<{ success: boolean; message: string }>(`/documents/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(doc)
      }),
    delete: (id: number) =>
      request<{ success: boolean; message: string }>(`/documents/${id}`, {
        method: 'DELETE'
      })
  },

  // Analytics & Dashboard Metrics
  analytics: {
    getDashboard: () => request<DashboardMetrics>('/analytics/dashboard')
  },

  // Admin Management
  admin: {
    getUsers: () => request<User[]>('/admin/users'),
    createUser: (userData: any) =>
      request<{ success: boolean; message: string }>('/admin/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData)
      }),
    updateUser: (id: number, data: Partial<User>) =>
      request<{ success: boolean; message: string }>(`/admin/users/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      }),
    getRiskConfig: () => request<RiskConfig>('/admin/risk-config'),
    updateRiskConfig: (config: Partial<RiskConfig>) =>
      request<{ success: boolean; message: string }>('/admin/risk-config', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config)
      }),
    getAuditLogs: (params?: { action?: string; limit?: number; offset?: number }) => {
      const query = new URLSearchParams();
      if (params?.action) query.append('action', params.action);
      if (params?.limit) query.append('limit', params.limit.toString());
      if (params?.offset) query.append('offset', params.offset.toString());
      return request<{ logs: AuditLog[]; total: number }>(`/admin/audit-logs?${query.toString()}`);
    }
  },

  // Demo Specimens
  specimens: {
    list: () =>
      request<
        Array<{
          id: string;
          scenario: string;
          title: string;
          badge: string;
          holderName: string;
          documentNumber: string;
          nationality: string;
          description: string;
          imageUrl: string;
          referencePhotoUrl: string;
          expectedRiskLevel: string;
          expectedRiskScore: number;
        }>
      >('/specimens')
  }
};
