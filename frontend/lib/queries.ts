import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import api from "./api";
import Cookies from "js-cookie";
import type {
  User,
  PurchaseRequest,
  PaginatedResponse,
  CreatePurchaseRequestData,
  UpdatePurchaseRequestData,
  Statistics,
} from "./types";

// Auth queries
export const useLogin = () => {
  const queryClient = useQueryClient();

  return useMutation<User, Error, { email: string; password: string }>({
    mutationFn: async (data: { email: string; password: string }) => {
      // Use a separate axios instance for login to avoid interceptor issues
      const loginApi = api;
      const response = await loginApi.post<
        { access: string; user: User } | { detail: string }
      >("/auth/login/", data, {
        // Don't retry on login failures
        validateStatus: (status) => status < 500,
      });

      if (response.status >= 400) {
        const errorData = response.data as { detail?: string };
        throw new Error(errorData?.detail || "Login failed");
      }

      const successData = response.data as { access: string; user: User };
      Cookies.set("access_token", successData.access);
      // Invalidate and refetch user data
      queryClient.setQueryData(["user"], successData.user);
      return successData.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(["user"], user);
    },
  });
};

export const useLogout = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await api.post("/auth/logout/");
    },
    onSuccess: () => {
      Cookies.remove("access_token");
      Cookies.remove("refresh_token");
      queryClient.clear();
    },
  });
};

export const useMe = () => {
  return useQuery<User>({
    queryKey: ["user"],
    queryFn: async () => {
      const response = await api.get<User>("/auth/me/");
      return response.data;
    },
    enabled: !!Cookies.get("access_token"),
    retry: 1, // Only retry once on failure
    retryOnMount: false, // Don't retry when component mounts if query failed
    refetchOnWindowFocus: false, // Don't refetch on window focus
    staleTime: 5 * 60 * 1000, // Consider data fresh for 5 minutes
  });
};

// Purchase Request queries
export const usePurchaseRequests = (filters?: {
  status?: string;
  date_from?: string;
  date_to?: string;
  amount_min?: string;
  amount_max?: string;
  search?: string;
  page?: number;
}) => {
  return useQuery<PaginatedResponse<PurchaseRequest>>({
    queryKey: ["purchase-requests", filters],
    queryFn: async () => {
      const response = await api.get<PaginatedResponse<PurchaseRequest>>(
        "/requests/",
        { params: filters }
      );
      return response.data;
    },
  });
};

export const usePurchaseRequest = (id: string) => {
  return useQuery<PurchaseRequest>({
    queryKey: ["purchase-request", id],
    queryFn: async () => {
      const response = await api.get<PurchaseRequest>(`/requests/${id}/`);
      return response.data;
    },
    enabled: !!id,
  });
};

export const useCreatePurchaseRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<PurchaseRequest, Error, CreatePurchaseRequestData>({
    mutationFn: async (data: CreatePurchaseRequestData) => {
      const response = await api.post<PurchaseRequest>("/requests/", data);
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
    },
  });
};

export const useUpdatePurchaseRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<
    PurchaseRequest,
    Error,
    { id: string; data: UpdatePurchaseRequestData }
  >({
    mutationFn: async ({
      id,
      data,
    }: {
      id: string;
      data: UpdatePurchaseRequestData;
    }) => {
      const response = await api.put<PurchaseRequest>(`/requests/${id}/`, data);
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-request", variables.id],
      });
    },
  });
};

export const useApproveRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { id: string; comments?: string }>({
    mutationFn: async ({ id, comments }) => {
      const response = await api.patch(`/requests/${id}/approve/`, {
        comments: comments || "",
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-request", variables.id],
      });
    },
    onError: (error) => {
      console.error("Approve request failed:", error);
    },
  });
};

export const useRejectRequest = () => {
  const queryClient = useQueryClient();

  return useMutation<unknown, Error, { id: string; comments: string }>({
    mutationFn: async ({ id, comments }) => {
      const response = await api.patch(`/requests/${id}/reject/`, { comments });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({ queryKey: ["statistics"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-request", variables.id],
      });
    },
    onError: (error) => {
      console.error("Reject request failed:", error);
    },
  });
};

export const useSubmitReceipt = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      receipt_file_url,
    }: {
      id: string;
      receipt_file_url: string;
    }) => {
      const response = await api.post(`/requests/${id}/submit-receipt/`, {
        receipt_file_url,
      });
      return response.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["purchase-requests"] });
      queryClient.invalidateQueries({
        queryKey: ["purchase-request", variables.id],
      });
    },
  });
};

// Statistics query
export const useStatistics = () => {
  return useQuery<Statistics>({
    queryKey: ["statistics"],
    queryFn: async () => {
      const response = await api.get<Statistics>("/requests/statistics/");
      return response.data;
    },
  });
};
