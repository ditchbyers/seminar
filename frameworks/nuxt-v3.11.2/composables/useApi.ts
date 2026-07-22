export const useApi = () => {
  const config = useRuntimeConfig();
  const apiBase = config.public.apiBase as string;

  const getReviews = async (params: { table?: string; limit?: number; delay?: number } = {}) => {
    const { table = 'hotel_reviews', limit = 50, delay = 0 } = params;
    return $fetch<{ data: any[]; total: number }>(`${apiBase}/api/reviews?table=${table}&limit=${limit}&delay=${delay}`);
  };

  const getVideo = async (resolution: string) => {
    return $fetch<{ url: string; width: number; height: number; label: string }>(`${apiBase}/api/media/video/${resolution}`);
  };

  return { getReviews, getVideo, apiBase };
};
