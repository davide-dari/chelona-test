export type ModuleType = 'generic' | 'auto' | 'document' | 'split' | 'single-expense' | 'wallet';
export type FuelType = 'benzina' | 'diesel' | 'gpl' | 'metano' | 'ibrida' | 'elettrica';

export interface Folder {
  id: string;
  name: string;
}

export interface BaseModule {
  id: string;
  type: ModuleType;
  title: string;
  x: number;
  y: number;
  w: number;
  h: number;
  folderId?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface GenericModule extends BaseModule {
  type: 'generic';
  content: string;
  date?: string;
  color?: string;
  template?: 'identity' | 'expense' | 'tax-code' | 'none';
}

export interface DocumentModule extends BaseModule {
  type: 'document';
  documentType: 'identity' | 'driving_license' | 'tax_code' | 'generic' | string;
  number?: string;
  issueDate?: string;
  expiryDate?: string;
  issuedBy?: string;
  pdfAttachment?: string; // base64 encoded PDF
  selfDestructAt?: number; // timestamp in ms
}

export interface AutoModule extends BaseModule {
  type: 'auto';
  driverName: string;
  brand: string;
  model: string;
  plate: string;
  fuelType: FuelType;
  currentKm?: string;
  registrationYear?: string;

  lastInsurance?: string;
  lastRevision?: string;
  lastServiceKm?: string;
  tiresKm?: string;
  tiresKmSnoozeUntil?: string; // km a cui il prossimo controllo deve essere ricordato (eccezione/posticipo)
  battery12vWarranty?: string;
  battery12vExpiryDate?: string;
  lastTax?: string;

  hybridBatteryWarranty?: string;
  hybridBatteryExpiryDate?: string;
  lastGplCylinder?: string;
  lastMethaneCylinder?: string;
  methaneType?: 'standard' | 'r110';

  // Allegati documenti (base64 PDFs)
  insuranceDoc?: string;
  taxDoc?: string;
  revisionDoc?: string;
  serviceDoc?: string;
  tireDoc?: string;
  battery12vDoc?: string;
  hybridBatteryDoc?: string;
}

export interface SplitParticipant {
  id: string;
  name: string;
  avatar?: string;
}

export type SplitType = 'equal' | 'exact' | 'percentage' | 'shares';

export interface SplitExpense {
  id: string;
  title: string;
  amount: number;
  date: string;
  paidById: string;
  splitType: SplitType;
  participants: {
    participantId: string;
    value?: number; // Depending on splitType: exact amount, percentage value, or number of shares
  }[];
  categoryId?: string;
  receiptAttachment?: string; // base64 encoded PDF from scanner
}

export interface SplitModule extends BaseModule {
  type: 'split';
  currency: string;
  participants: SplitParticipant[];
  expenses: SplitExpense[];
}

export interface SingleExpenseModule extends BaseModule {
  type: 'single-expense';
  amount: number;
  date: string;
  expiryDate?: string; // Optional expiry/due date
  category: string;
  description: string;
  attachment?: string; // base64 PDF/Image
  currency: string;
}

export interface ScheduledPayment {
  id: string;
  name: string;
  totalAmount: number;
  dueDate: string; // ISO date YYYY-MM-DD
  category?: string;
  isPaid?: boolean;
  savedAmount?: number;
}

export interface WalletModule extends BaseModule {
  type: 'wallet';
  balance: number;
  currency: string;
  payments: ScheduledPayment[];
}

export type Module = GenericModule | AutoModule | DocumentModule | SplitModule | SingleExpenseModule | WalletModule;

export interface DashboardState {
  modules: Module[];
}

export interface ProfileConfig {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  isBiometricEnabled: boolean;
  credentialId?: string; // For WebAuthn
  encryptedMasterKey?: string; // Master key encrypted for biometric recovery
  bioSalt?: string;
  avatar?: string; // Base64 encoded or URL for custom avatar
  pinnedCategoryIds?: string[]; // IDs of categories pinned to home
  pinnedToolIds?: string[]; // IDs of tools pinned to home
}
