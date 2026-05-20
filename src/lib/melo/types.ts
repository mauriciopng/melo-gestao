export interface FinanceEntry {
  id: string;
  type: 'income' | 'expense';
  amount: number;
  category: string;
  description: string;
  date: string;
  client: string;
  createdAt: string;
  source?: 'form' | 'chat';
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  time: string;
  duration: number;
  type: 'meeting' | 'delivery' | 'shoot' | 'call' | 'edit' | 'other';
  client: string;
  notes: string;
  status: 'pending' | 'confirmed' | 'completed' | 'cancelled';
  createdAt: string;
}

export interface ServiceStage {
  id: string;
  name: string;
  description: string;
  status: 'pendente' | 'em_andamento' | 'concluido';
  order: number;
  createdAt: string;
  completedAt?: string;
}

export interface ServiceComment {
  id: string;
  text: string;
  isPublic: boolean;
  createdAt: string;
}

export interface Service {
  id: string;
  name: string;
  client: string;
  clientPhone?: string;
  clientEmail?: string;
  address?: string;
  type: 'design' | 'filming' | 'web' | 'photo' | 'construction' | 'other';
  status: 'proposal' | 'in_progress' | 'review' | 'completed' | 'cancelled';
  value: number;
  startDate: string;
  deadline: string;
  progress: number;
  currentStep?: number;
  notes: string;
  createdAt: string;
  clientToken: string;
  stages: ServiceStage[];
  comments: ServiceComment[];
  // Forma de pagamento
  paymentType?: 'total' | 'sinal';
  signalValue?: number;           // valor do sinal recebido
  signalDate?: string;            // data do sinal
  remainingValue?: number;        // valor a receber
  remainingDate?: string;         // data prevista para receber
  remainingReceived?: boolean;    // true quando restante foi confirmado
  remainingReceivedDate?: string; // data real do recebimento confirmado
}

export interface Reminder {
  id: string;
  type: 'manual' | 'agenda' | 'service' | 'finance';
  title: string;
  body: string;
  datetime: string;
  relatedId?: string;
  sent: boolean;
  createdAt: string;
}

export interface MeloDocument {
  id: string;
  name: string;
  type: 'orcamento' | 'contrato' | 'relatorio' | 'outro';
  clientName: string;
  serviceId?: string;
  content: DocumentContent;
  status: 'rascunho' | 'confirmado' | 'enviado';
  oneDriveId?: string;
  oneDrivePath?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DocumentContent {
  number: string;
  clientName: string;
  clientAddress: string;
  clientPhone: string;
  serviceName: string;
  description: string;
  items: DocumentItem[];
  totalValue: number;
  deadline: string;
  paymentTerms: string;
  validity: string;
  notes: string;
}

export interface DocumentItem {
  description: string;
  quantity: number;
  unitValue: number;
  total: number;
}

export interface DashboardSummary {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  activeServices: number;
  pendingServices: number;
  completedServices: number;
  upcomingEvents: AgendaEvent[];
  recentFinances: FinanceEntry[];
  activeServicesList: Service[];
}
