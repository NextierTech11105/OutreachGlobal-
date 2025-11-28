import { create } from "zustand";

export interface Campaign {
  id: string;
  name: string;
  description?: string;
  type: string;
  status: string;
  startDate?: string;
  endDate?: string;
  leadCount: number;
  sentCount: number;
  openCount: number;
  clickCount: number;
  replyCount: number;
  settings?: any;
  cadence?: any;
  metadata?: any;
  createdAt: string;
  updatedAt: string;
  createdBy?: {
    id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
}

export interface CampaignFilters {
  search?: string;
  status?: string[];
  type?: string[];
  dateRange?: [string, string];
  performance?: "high" | "medium" | "low";
}

export interface PaginatedCampaigns {
  items: Campaign[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface CampaignExecutionStatus {
  queuedCount: number;
  processingCount: number;
  sentCount: number;
  failedCount: number;
  completedCount: number;
  nextExecution?: string;
  isActive: boolean;
  errors?: Array<{
    message: string;
    count: number;
    lastOccurred: string;
  }>;
}

interface CampaignsState {
  campaigns: Campaign[];
  selectedCampaigns: string[];
  currentCampaign: Campaign | null;
  executionStatus: Record<string, CampaignExecutionStatus>;
  filters: CampaignFilters;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
    totalPages: number;
  };
  isLoading: boolean;
  error: string | null;
  view: "table" | "kanban" | "calendar";
  sortBy: string;
  sortOrder: "asc" | "desc";
}

interface CampaignsActions {
  setCampaigns: (campaigns: PaginatedCampaigns) => void;
  addCampaign: (campaign: Campaign) => void;
  updateCampaign: (id: string, updates: Partial<Campaign>) => void;
  removeCampaign: (id: string) => void;
  setCurrentCampaign: (campaign: Campaign | null) => void;
  setSelectedCampaigns: (campaignIds: string[]) => void;
  toggleSelectedCampaign: (campaignId: string) => void;
  selectAllCampaigns: () => void;
  clearSelectedCampaigns: () => void;
  setExecutionStatus: (
    campaignId: string,
    status: CampaignExecutionStatus,
  ) => void;
  setFilters: (filters: Partial<CampaignFilters>) => void;
  clearFilters: () => void;
  setPagination: (page: number, pageSize?: number) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setView: (view: "table" | "kanban" | "calendar") => void;
  setSorting: (sortBy: string, sortOrder: "asc" | "desc") => void;
  refreshCampaigns: () => void;
}

export const useCampaignsStore = create<CampaignsState & CampaignsActions>(
  (set, get) => ({
    // State
    campaigns: [],
    selectedCampaigns: [],
    currentCampaign: null,
    executionStatus: {},
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
    setCampaigns: (paginatedCampaigns: PaginatedCampaigns) => {
      set({
        campaigns: paginatedCampaigns.items,
        pagination: {
          page: paginatedCampaigns.page,
          pageSize: paginatedCampaigns.pageSize,
          total: paginatedCampaigns.total,
          totalPages: paginatedCampaigns.totalPages,
        },
        error: null,
      });
    },

    addCampaign: (campaign: Campaign) => {
      set((state) => ({
        campaigns: [campaign, ...state.campaigns],
        pagination: {
          ...state.pagination,
          total: state.pagination.total + 1,
        },
      }));
    },

    updateCampaign: (id: string, updates: Partial<Campaign>) => {
      set((state) => ({
        campaigns: state.campaigns.map((campaign) =>
          campaign.id === id ? { ...campaign, ...updates } : campaign,
        ),
        currentCampaign:
          state.currentCampaign?.id === id
            ? { ...state.currentCampaign, ...updates }
            : state.currentCampaign,
      }));
    },

    removeCampaign: (id: string) => {
      set((state) => ({
        campaigns: state.campaigns.filter((campaign) => campaign.id !== id),
        selectedCampaigns: state.selectedCampaigns.filter(
          (campaignId) => campaignId !== id,
        ),
        currentCampaign:
          state.currentCampaign?.id === id ? null : state.currentCampaign,
        executionStatus: Object.fromEntries(
          Object.entries(state.executionStatus).filter(([key]) => key !== id),
        ),
        pagination: {
          ...state.pagination,
          total: Math.max(0, state.pagination.total - 1),
        },
      }));
    },

    setCurrentCampaign: (campaign: Campaign | null) => {
      set({ currentCampaign: campaign });
    },

    setSelectedCampaigns: (campaignIds: string[]) => {
      set({ selectedCampaigns: campaignIds });
    },

    toggleSelectedCampaign: (campaignId: string) => {
      set((state) => ({
        selectedCampaigns: state.selectedCampaigns.includes(campaignId)
          ? state.selectedCampaigns.filter((id) => id !== campaignId)
          : [...state.selectedCampaigns, campaignId],
      }));
    },

    selectAllCampaigns: () => {
      set((state) => ({
        selectedCampaigns: state.campaigns.map((campaign) => campaign.id),
      }));
    },

    clearSelectedCampaigns: () => {
      set({ selectedCampaigns: [] });
    },

    setExecutionStatus: (
      campaignId: string,
      status: CampaignExecutionStatus,
    ) => {
      set((state) => ({
        executionStatus: {
          ...state.executionStatus,
          [campaignId]: status,
        },
      }));
    },

    setFilters: (newFilters: Partial<CampaignFilters>) => {
      set((state) => ({
        filters: { ...state.filters, ...newFilters },
        pagination: { ...state.pagination, page: 1 },
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

    setView: (view: "table" | "kanban" | "calendar") => {
      set({ view });
    },

    setSorting: (sortBy: string, sortOrder: "asc" | "desc") => {
      set({ sortBy, sortOrder });
    },

    refreshCampaigns: () => {
      set({ isLoading: true });
    },
  }),
);

// Helper hooks
export const useSelectedCampaigns = () =>
  useCampaignsStore((state) => state.selectedCampaigns);
export const useCurrentCampaign = () =>
  useCampaignsStore((state) => state.currentCampaign);
export const useCampaignFilters = () =>
  useCampaignsStore((state) => state.filters);
export const useCampaignsPagination = () =>
  useCampaignsStore((state) => state.pagination);
export const useCampaignsLoading = () =>
  useCampaignsStore((state) => state.isLoading);
export const useCampaignsError = () =>
  useCampaignsStore((state) => state.error);
export const useCampaignsView = () => useCampaignsStore((state) => state.view);
export const useCampaignExecutionStatus = (campaignId: string) =>
  useCampaignsStore((state) => state.executionStatus[campaignId]);
