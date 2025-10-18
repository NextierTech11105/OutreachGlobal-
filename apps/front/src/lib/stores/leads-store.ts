import { create } from "zustand";

export interface Lead {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  company?: string;
  title?: string;
  industry?: string;
  status: string;
  source?: string;
  score?: number;
  tags?: string[];
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  notes?: string;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
}

export interface LeadsFilters {
  search?: string;
  status?: string[];
  source?: string[];
  industry?: string[];
  scoreRange?: [number, number];
  dateRange?: [string, string];
  tags?: string[];
}

export interface PaginatedLeads {
  items: Lead[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

interface LeadsState {
  leads: Lead[];
  selectedLeads: string[];
  currentLead: Lead | null;
  filters: LeadsFilters;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
  view: "table" | "kanban" | "map";
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface LeadsActions {
  setLeads: (leads: PaginatedLeads) => void;
  addLead: (lead: Lead) => void;
  updateLead: (id: string, updates: Partial<Lead>) => void;
  removeLead: (id: string) => void;
  setCurrentLead: (lead: Lead | null) => void;
  setSelectedLeads: (leadIds: string[]) => void;
  toggleSelectedLead: (leadId: string) => void;
  selectAllLeads: () => void;
  clearSelectedLeads: () => void;
  setFilters: (filters: Partial<LeadsFilters>) => void;
  clearFilters: () => void;
  setPagination: (page: number, pageSize?: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setView: (view: "table" | "kanban" | "map") => void;
  setSorting: (sortBy: string, sortOrder: "asc" | "desc") => void;
  refreshLeads: () => void;
}

export const useLeadsStore = create<LeadsState & LeadsActions>((set, get) => ({
  // State
  leads: [],
  selectedLeads: [],
  currentLead: null,
  filters: {},
  pagination: {
    page: 1,
    pageSize: 25,
    total: 0,
    totalPages: 0,
  },
  isLoading: false,
  error: null,
  view: "table",
  sortBy: "createdAt",
  sortOrder: "desc",

  // Actions
  setLeads: (paginatedLeads: PaginatedLeads) => {
    set({
      leads: paginatedLeads.items,
      pagination: {
        page: paginatedLeads.page,
        pageSize: paginatedLeads.pageSize,
        total: paginatedLeads.total,
        totalPages: paginatedLeads.totalPages,
      },
      error: null,
    });
  },

  addLead: (lead: Lead) => {
    set((state) => ({
      leads: [lead, ...state.leads],
      pagination: {
        ...state.pagination,
        total: state.pagination.total + 1,
      },
    }));
  },

  updateLead: (id: string, updates: Partial<Lead>) => {
    set((state) => ({
      leads: state.leads.map((lead) =>
        lead.id === id ? { ...lead, ...updates } : lead,
      ),
      currentLead:
        state.currentLead?.id === id
          ? { ...state.currentLead, ...updates }
          : state.currentLead,
    }));
  },

  removeLead: (id: string) => {
    set((state) => ({
      leads: state.leads.filter((lead) => lead.id !== id),
      selectedLeads: state.selectedLeads.filter((leadId) => leadId !== id),
      currentLead: state.currentLead?.id === id ? null : state.currentLead,
      pagination: {
        ...state.pagination,
        total: Math.max(0, state.pagination.total - 1),
      },
    }));
  },

  setCurrentLead: (lead: Lead | null) => {
    set({ currentLead: lead });
  },

  setSelectedLeads: (leadIds: string[]) => {
    set({ selectedLeads: leadIds });
  },

  toggleSelectedLead: (leadId: string) => {
    set((state) => ({
      selectedLeads: state.selectedLeads.includes(leadId)
        ? state.selectedLeads.filter((id) => id !== leadId)
        : [...state.selectedLeads, leadId],
    }));
  },

  selectAllLeads: () => {
    set((state) => ({
      selectedLeads: state.leads.map((lead) => lead.id),
    }));
  },

  clearSelectedLeads: () => {
    set({ selectedLeads: [] });
  },

  setFilters: (newFilters: Partial<LeadsFilters>) => {
    set((state) => ({
      filters: { ...state.filters, ...newFilters },
      pagination: { ...state.pagination, page: 1 }, // Reset to first page
    }));
  },

  clearFilters: () => {
    set({
      filters: {},
      pagination: { ...get().pagination, page: 1 },
    });
  },

  setPagination: (page: number, pageSize?: number) => {
    set((state) => ({
      pagination: {
        ...state.pagination,
        page,
        ...(pageSize && { pageSize }),
      },
    }));
  },

  setLoading: (isLoading: boolean) => {
    set({ isLoading });
  },

  setError: (error: string | null) => {
    set({ error, isLoading: false });
  },

  setView: (view: "table" | "kanban" | "map") => {
    set({ view });
  },

  setSorting: (sortBy: string, sortOrder: "asc" | "desc") => {
    set({ sortBy, sortOrder });
  },

  refreshLeads: () => {
    // This will be used to trigger a refetch in components
    set({ isLoading: true });
  },
}));

// Helper hooks
export const useSelectedLeads = () =>
  useLeadsStore((state) => state.selectedLeads);
export const useCurrentLead = () => useLeadsStore((state) => state.currentLead);
export const useLeadsFilters = () => useLeadsStore((state) => state.filters);
export const useLeadsPagination = () =>
  useLeadsStore((state) => state.pagination);
export const useLeadsLoading = () => useLeadsStore((state) => state.isLoading);
export const useLeadsError = () => useLeadsStore((state) => state.error);
export const useLeadsView = () => useLeadsStore((state) => state.view);
