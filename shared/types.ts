export type UserRole = 'OFFICER' | 'ADMIN';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: number;
  badge_number?: string;
  created_at: string;
}

export type DocumentType = 'PASSPORT' | 'VISA' | 'NATIONAL_ID' | 'DRIVING_LICENSE' | 'PERMIT';

export type DocumentStatus = 'ACTIVE' | 'EXPIRED' | 'SUSPENDED' | 'BLACKLISTED' | 'SUSPICIOUS';

export interface DocumentRecord {
  id: number;
  document_number: string;
  document_type: DocumentType;
  holder_name: string;
  nationality: string;
  date_of_birth: string;
  gender: string;
  issue_date: string;
  expiry_date: string;
  status: DocumentStatus;
  photo_url?: string;
  notes?: string;
  created_at: string;
}

export type RiskLevel = 'LOW' | 'MEDIUM' | 'HIGH';
export type FinalStatus = 'VERIFIED' | 'SUSPICIOUS' | 'REQUIRES_MANUAL_REVIEW';
export type AIMode = 'DEMO_MODE' | 'REAL_MODE' | 'OLLAMA_AI' | 'HYBRID_AI';

export interface OllamaStatus {
  connected: boolean;
  baseUrl: string;
  activeModel: string;
  availableModels: string[];
  version?: string;
  error?: string;
}

export interface AIChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp?: string;
}

export interface AIForensicAnalysis {
  model: string;
  timestamp: string;
  executiveSummary: string;
  threatAssessment: string;
  anomalyAnalysis: string[];
  interviewQuestions: string[];
  recommendedProtocol: string;
  confidenceScore: number;
}

export interface ImageQualityMetric {
  score: number; // 0-100
  status: 'PASS' | 'WARNING' | 'FAIL';
  label: string;
  message: string;
}

export interface ImageQualityResult {
  overallScore: number;
  status: 'GOOD' | 'ACCEPTABLE' | 'POOR';
  metrics: {
    resolution: ImageQualityMetric & { width: number; height: number };
    sharpness: ImageQualityMetric;
    brightness: ImageQualityMetric;
    contrast: ImageQualityMetric;
    glare: ImageQualityMetric;
  };
  issues: string[];
  passed: boolean;
}

export interface OCRField {
  name: string;
  label: string;
  value: string;
  confidence: number; // 0-100
  validated: boolean;
  mismatch?: boolean;
}

export interface OCRResult {
  confidence: number;
  fields: {
    fullName: OCRField;
    documentNumber: OCRField;
    countryCode: OCRField;
    nationality: OCRField;
    dateOfBirth: OCRField;
    gender: OCRField;
    issueDate: OCRField;
    expiryDate: OCRField;
  };
  rawText: string;
  mrzLines?: string[];
}

export interface MRZChecksum {
  name: string;
  field: string;
  expected: string;
  computed: string;
  valid: boolean;
}

export interface MRZFieldMatch {
  field: string;
  ocrValue: string;
  mrzValue: string;
  matches: boolean;
}

export interface MRZResult {
  detected: boolean;
  format: 'TD3 (Passport)' | 'TD1 (ID Card)' | 'TD2' | 'UNKNOWN';
  mrzLines: string[];
  documentType: string;
  issuingState: string;
  documentNumber: string;
  nationality: string;
  dateOfBirth: string;
  gender: string;
  expiryDate: string;
  optionalData?: string;
  checksums: MRZChecksum[];
  fieldMatches: MRZFieldMatch[];
  overallStatus: 'PASSED' | 'FAILED' | 'WARNING';
}

export interface TamperingIndicator {
  name: string;
  category: 'PHOTO_BORDER' | 'COMPRESSION_ANOMALY' | 'COLOR_TEMPERATURE' | 'FONT_CONSISTENCY' | 'METADATA';
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
  description: string;
  detected: boolean;
  score: number; // 0-100 anomaly level
}

export interface TamperingResult {
  detected: boolean;
  confidence: number;
  type: 'NONE' | 'PHOTO_REPLACEMENT' | 'TEXT_ALTERATION' | 'SPECIMEN_FORGERY';
  indicators: TamperingIndicator[];
  summary: string;
  highlightCoordinates?: { x: number; y: number; width: number; height: number };
}

export interface FaceVerificationResult {
  consistency: 'LIKELY_MATCH' | 'POSSIBLE_MISMATCH' | 'DEFINITE_MISMATCH' | 'NO_FACE_DETECTED';
  similarityScore: number; // 0-100
  confidence: number;
  extractedFaceUrl?: string;
  databaseFaceUrl?: string;
  landmarksMatch: boolean;
  expressionNeutrality: number;
  pitchYawRoll: { pitch: number; yaw: number; roll: number };
  summary: string;
  rotationDetected?: number;
  uprightedDocUrl?: string;
}

export interface DatabaseVerificationResult {
  recordFound: boolean;
  status: DocumentStatus | 'NOT_FOUND';
  matchedDocument?: DocumentRecord;
  photoUrl?: string;
  nameMatch: boolean;
  dobMatch: boolean;
  expiryMatch: boolean;
  multipleIdentityAlert: boolean;
  watchlistFlag: boolean;
  blacklistReason?: string;
  summary: string;
}

export interface RiskFactor {
  id: string;
  name: string;
  category: 'TAMPERING' | 'FACE' | 'DATABASE' | 'MRZ' | 'DOCUMENT' | 'QUALITY';
  weight: number; // percentage e.g. 30
  penaltyScore: number; // 0-100
  contribution: number; // penaltyScore * (weight / 100)
  description: string;
  severity: 'LOW' | 'MEDIUM' | 'HIGH';
}

export interface ExplainableWhySuspicious {
  title: string;
  checksPassed: string[];
  flagsDetected: string[];
  conclusion: string;
  investigationGuidance: string[];
}

export interface RiskAssessment {
  score: number; // 0-100
  level: RiskLevel;
  status: FinalStatus;
  factors: RiskFactor[];
  recommendedAction: string;
  rationale: string[];
  whySuspicious?: ExplainableWhySuspicious;
}

export interface VerificationResult {
  id: string; // e.g. VER-2026-84920
  timestamp: string;
  officerId: number;
  officerName: string;
  officerBadge?: string;
  documentType: DocumentType;
  documentImage: string;
  documentNumber: string;
  holderName: string;
  aiMode: AIMode;
  scenarioDetected: 'GENUINE_PASSPORT' | 'PHOTO_REPLACEMENT' | 'UNKNOWN';
  imageQuality: ImageQualityResult;
  ocr: OCRResult;
  mrz: MRZResult;
  tampering: TamperingResult;
  faceVerification: FaceVerificationResult;
  databaseVerification: DatabaseVerificationResult;
  risk: RiskAssessment;
  processingTimeMs: number;
  ollamaAnalysis?: AIForensicAnalysis;
  aiExecutiveSummary?: string;
  notes?: string;
}

export interface RiskConfig {
  id: number;
  tamperingWeight: number;
  faceMismatchWeight: number;
  databaseWeight: number;
  mrzWeight: number;
  docValidWeight: number;
  qualityWeight: number;
  lowThreshold: number;
  mediumThreshold: number;
  highThreshold: number;
  updatedAt: string;
  updatedBy?: string;
}

export interface AuditLog {
  id: number;
  userId: number;
  userName: string;
  userRole: UserRole;
  action: string;
  entityType: string;
  entityId: string;
  details: string;
  ipAddress: string;
  createdAt: string;
}

export interface DashboardMetrics {
  totalScreened: number;
  verifiedCount: number;
  suspiciousCount: number;
  highRiskCount: number;
  tamperingCount: number;
  faceMismatchCount: number;
  avgProcessingTimeMs: number;
  lowRiskPercentage: number;
  mediumRiskPercentage: number;
  highRiskPercentage: number;
  dailyTrends: Array<{
    date: string;
    total: number;
    lowRisk: number;
    mediumRisk: number;
    highRisk: number;
  }>;
  riskDistribution: Array<{
    name: string;
    value: number;
    color: string;
  }>;
  documentTypeDistribution: Array<{
    type: string;
    count: number;
  }>;
  recentVerifications: VerificationResult[];
  latestHighRiskCases: VerificationResult[];
}
