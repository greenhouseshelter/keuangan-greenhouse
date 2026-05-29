export type Project = string;

export interface ProjectItem {
  id: string;
  name: string;
}

export type TransactionType = 'Inflow' | 'Outflow';

export type FinancialCategory = 'Operational' | 'Non-Operational';

export interface Transaction {
  id: string;
  date: string; // YYYY-MM-DD
  project: Project;
  type: TransactionType;
  category: FinancialCategory;
  amount: number;
  description: string;
  recordedBy: string; // username of the recorder
  createdAt: string; // ISO date-time
  account: string; // Name of the financial account/akun
  image?: string; // Google Drive url or base64 evidence
}

export type Role = 'Admin' | 'Pengelola' | 'Finance' | 'Accounting';

export interface User {
  role: Role;
  username: string;
  password: string;
}

export interface Account {
  id: string;
  name: string;
  type: 'Project' | 'All';
}

export interface DatabaseConfig {
  mode: 'local' | 'sheets';
  sheetsApiUrl: string; // Deprecated but kept as fallback/computed Web App URL
  webAppUrl: string;    // Modern Web App script URL
  spreadsheetId: string; // Google Sheets Spreadsheet ID
  driveFolderId?: string; // Optional Google Drive folder for image attachments
}

export interface ActivityLog {
  id: string;
  timestamp: string; // ISO Date-time
  username: string;
  role: string;
  action: string;
  details: string;
}

