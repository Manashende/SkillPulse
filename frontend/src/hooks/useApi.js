import { useState, useCallback } from 'react';
import toast from 'react-hot-toast';

const useApi = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const request = useCallback(async (apiCall, { onSuccess, onError, successMsg } = {}) => {
    setLoading(true);
    setError(null);
    try {
      const response = await apiCall();
      if (successMsg) toast.success(successMsg);
      if (onSuccess) onSuccess(response.data);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong';
      setError(msg);
      toast.error(msg);
      if (onError) onError(msg);
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  return { loading, error, request };
};

export default useApi;