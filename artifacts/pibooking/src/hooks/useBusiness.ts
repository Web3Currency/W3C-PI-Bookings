import { useState, useEffect, useCallback } from 'react';
import { BusinessProfile } from '../types';
import { businessService } from '../services/businessService';

export function useBusiness() {
  const [business, setBusiness] = useState<BusinessProfile>(() => businessService.getBusinessProfileLocal());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchBusinessProfile = useCallback(async () => {
    setLoading(true);
    const profile = await businessService.getBusinessProfileAsync();
    setBusiness(profile);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchBusinessProfile();
  }, [fetchBusinessProfile]);

  const updateBusiness = useCallback(async (updates: Partial<BusinessProfile>) => {
    const updated = await businessService.updateBusinessProfileAsync(updates);
    setBusiness(updated);
    return updated;
  }, []);

  return {
    business,
    loading,
    updateBusiness,
    refreshBusiness: fetchBusinessProfile,
  };
}
