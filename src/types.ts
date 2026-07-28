export type ModuleType = 'generic' | 'auto' | 'document' | 'split' | 'single-expense' | 'wallet' | 'gallery' | 'travel' | 'transport' | 'recipes' | 'furniture' | 'installments' | 'fitness' | 'study';
export type FuelType = 'benzina' | 'diesel' | 'gpl' | 'metano' | 'ibrida' | 'elettrica';

export interface Folder {
  id: string;
  name: string;
  isSensitive?: boolean;
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
  isSensitive?: boolean;
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
  lastKmUpdatedAt?: string;
  registrationYear?: string;

  lastInsurance?: string;
  lastRevision?: string;
  lastServiceKm?: string;
  tiresKm?: string;
  tiresSuggestedOffsetKm?: number;
  tiresKmSnoozeUntil?: string; // km a cui il prossimo controllo deve essere ricordato (eccezione/posticipo)
  battery12vWarranty?: string;
  battery12vExpiryDate?: string;
  lastTax?: string;

  hybridBatteryWarranty?: string;       // km per prossimo controllo batteria
  hybridBatteryExpiryDate?: string;     // data scadenza revisione/controllo batteria
  hybridBatteryWarrantyDate?: string;   // data scadenza garanzia batteria ibrida

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
  budget?: number;
  participants: SplitParticipant[];
  expenses: SplitExpense[];
}

export interface TransportModule extends BaseModule {
  type: 'transport';
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
  totalAmount: number;
  dueDate: string; // ISO date YYYY-MM-DD
  savedAmount: number;
  installmentAmount?: number; // Importo singola rata
  installmentsCount?: number; // Numero di rate
}

export interface GalleryImage {
  id: string;
  image: string;
  filterName?: string;
  createdAt: string;
}

export interface GalleryModule extends BaseModule {
  type: 'gallery';
  images: GalleryImage[];
  // Legacy support
  image?: string;
  filterName?: string;
}

export interface TravelNation {
  id: string;
  name: string;
  createdAt: string;
}

export interface TravelCountryGroup {
  id: string;
  countryName: string;
  emoji?: string;
  nationId?: string;
  createdAt: string;
}

export interface TravelDestination {
  id: string;
  name: string;
  lat: number;
  lng: number;
  type: 'itinerary' | 'place';
  notes?: string;
  emoji?: string;
  countryGroupId?: string;
  nation?: string;
  city?: string;
  createdAt: string;
}

export interface TravelModule extends BaseModule {
  type: 'travel';
  nations?: TravelNation[];
  countryGroups?: TravelCountryGroup[];
  destinations: TravelDestination[];
}

export interface InstallmentPayment {
  id: string;
  amount: number;
  dueDate: string; // ISO date YYYY-MM-DD
  isPaid: boolean;
  paidDate?: string;
}

export interface InstallmentsModule extends BaseModule {
  type: 'installments';
  targetAmount: number;
  finalDueDate: string; // ISO date YYYY-MM-DD
  payments: InstallmentPayment[];
}

export interface FitnessProfile {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  level: 'beginner' | 'intermediate' | 'advanced';
  goal: 'mass' | 'cut' | 'strength' | 'endurance' | 'tone';
  daysPerWeek: number;
  equipment: 'gym' | 'home' | 'bodyweight';
}

export interface WorkoutDay {
  dayLabel: string;
  focus: string;
  exercises: any[];
  isCompleted: boolean;
}

export interface DietProfile {
  gender: 'male' | 'female';
  age: number;
  height: number;
  weight: number;
  activityLevel: 'sedentary' | 'light' | 'active' | 'very_active';
  goal: 'cut' | 'maintain' | 'bulk';
  restrictions: string[];
  mealsPerDay: number;
}

export interface MealDay {
  meals: any[];
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFat: number;
}

export interface FitnessModule extends BaseModule {
  type: 'fitness';
  fitnessProfile?: import('./components/FitnessScreen').FitnessProfile;
  workoutPlan?: import('./components/FitnessScreen').WorkoutDay[];
  dietProfile?: import('./components/FitnessScreen').DietProfile;
  mealPlan?: import('./components/FitnessScreen').MealDay; // deprecated, use mealPlanWeekly
  mealPlanWeekly?: import('./components/FitnessScreen').MealDay[];
  bmr?: number;
  tdee?: number;
  targetCalories?: number;
}

export interface StudyModule extends BaseModule {
  type: 'study';
  status: 'wizard' | 'study';
  targetSubject?: string;
  level?: string;
  teacherIntro?: string;
  topics: any[];
  x: number;
  y: number;
  w: number;
  h: number;
}

export type Module = GenericModule | AutoModule | DocumentModule | SplitModule | SingleExpenseModule | WalletModule | GalleryModule | TravelModule | TransportModule | FurnitureModule | InstallmentsModule | FitnessModule | StudyModule;

export interface DashboardState {
  modules: Module[];
}

export interface ProfileConfig {
  id: string;
  username: string;
  passwordHash: string;
  salt: string;
  isBiometricEnabled: boolean;
  biometricServerKey?: string;
  credentialId?: string; // For WebAuthn
  encryptedMasterKey?: string; // Master key encrypted for biometric recovery
  bioSalt?: string;
  avatar?: string; // Base64 encoded or URL for custom avatar
  requirePasswordForPublic?: boolean; // false (default) = direct homepage access, protection only for sensitive items
  pinnedCategoryIds?: string[]; // IDs of categories pinned to home
  pinnedToolIds?: string[]; // IDs of tools pinned to home
}

export interface FurnitureItem {
  id: string;
  title: string;
  price?: string;
  imageUrl?: string;
  description?: string;
  link: string;
  width?: number;       // in cm
  depth?: number;       // in cm
  height?: number;      // in cm
  x?: number;           // in cm relative to room (floor)
  y?: number;           // in cm relative to room (floor)
  category?: string;    // e.g. "Sedie & Poltrone", "Tavoli & Scrivanie", etc.
  color?: string;       // Custom hex/css color
  manualUrl?: string;   // URL to manual (PDF)
}

export interface FurnitureRoom {
  id: string;
  name: string;
  items: FurnitureItem[];
  width?: number;       // in cm
  length?: number;      // in cm
  height?: number;      // in cm
  roomType?: string;    // 'Cucina' | 'Salone' | 'Camera da letto' | 'Bagno' | 'Altro'
}

export interface FurnitureModule extends BaseModule {
  type: 'furniture';
  rooms: FurnitureRoom[];
}
