import { useState, useEffect, useCallback } from 'react';
import { pricingService } from '../services/pricingService';

export function useExchangeRate() {
  const [exchangeRateNGN, setExchangeRateNGN] = useState<number>(3500);
  const [loading, setLoading] = useState<boolean>(true);

  const fetchExchangeRate = useCallback(async () => {
    setLoading(true);
    const rate = await pricingService.getExchangeRateNGNAsync();
    setExchangeRateNGN(rate);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchExchangeRate();
  }, [fetchExchangeRate]);

  const updateExchangeRate = useCallback(async (newRate: number) => {
    const updated = await pricingService.setExchangeRateNGNAsync(newRate);
    setExchangeRateNGN(updated);
    return updated;
  }, []);

  return {
    exchangeRateNGN,
    loading,
    updateExchangeRate,
    refreshExchangeRate: fetchExchangeRate,
  };
}
