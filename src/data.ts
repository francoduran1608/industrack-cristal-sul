export interface PreRegisteredVehicle {
  plate: string;
  vehicleType: 'carreta' | 'truck' | 'toco' | '3/4';
  model: string;
}

export const PRE_REGISTERED_VEHICLES: PreRegisteredVehicle[] = [
  { plate: 'ABC-1234', vehicleType: 'carreta', model: 'Scania R450 (Carreta)' },
  { plate: 'XYZ-5678', vehicleType: 'truck', model: 'Volvo FH 540 (Truck)' },
  { plate: 'MNO-9012', vehicleType: 'toco', model: 'Mercedes-Benz Atego (Toco)' },
  { plate: 'QWE-3456', vehicleType: '3/4', model: 'VW Delivery 11.180 (3/4)' },
];

export const COMPANY_DRIVERS: string[] = [
  'José Almeida',
  'Marcos Vinícius',
  'Manoel Ferreira',
  'Fábio Santos',
  'Ademar Lopes',
  'Carlos Eduardo'
];
