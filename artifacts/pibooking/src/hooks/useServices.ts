import { useState, useEffect, useCallback } from 'react';
import { Service } from '../types';
import { serviceService } from '../services/serviceService';

export function useServices() {
  const [services, setServices] = useState<Service[]>(() => serviceService.getServicesLocal());
  const [loading, setLoading] = useState<boolean>(true);

  const fetchServices = useCallback(async () => {
    setLoading(true);
    const data = await serviceService.getServicesAsync();
    setServices(data);
    setLoading(false);
  }, []);

  useEffect(() => {
    fetchServices();
  }, [fetchServices]);

  const addService = useCallback(async (newServiceData: Omit<Service, 'id'>) => {
    await serviceService.addService(newServiceData);
    const fresh = await serviceService.getServicesAsync();
    setServices(fresh);
    return fresh;
  }, []);

  const updateService = useCallback(async (serviceId: string, updates: Partial<Service>) => {
    const updatedList = await serviceService.updateService(serviceId, updates);
    setServices(updatedList);
    return updatedList;
  }, []);

  const deleteService = useCallback(async (serviceId: string) => {
    const updatedList = await serviceService.deleteService(serviceId);
    setServices(updatedList);
    return updatedList;
  }, []);

  return {
    services,
    loading,
    addService,
    updateService,
    deleteService,
    refreshServices: fetchServices,
  };
}
