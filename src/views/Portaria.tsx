import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Movement, VehicleType, OwnerType, Checklist, RegisteredVehicle, RegisteredClient } from '../types';
import { Check, AlertCircle, HelpCircle, Truck, UserCheck, CheckSquare, RefreshCw, X, Boxes } from 'lucide-react';
import { InlineClientEditor } from '../components/InlineClientEditor';
import { OrderPhotoSelector } from '../components/OrderPhotoSelector';

export const Portaria: React.FC = () => {
  const { 
    addMovement, 
    deleteMovement,
    movements, 
    registerExit, 
    updateMovementDetails,
    registerGateTemporaryExit,
    registerGateTemporaryReturn,
    currentUser, 
    registeredVehicles = [], 
    registeredDrivers = [],
    registeredClients = [],
    customVehicleCategories = [],
    customEntryPurposes = [],
    supplies = [],
    addRegisteredVehicle,
    addRegisteredDriver,
    updateRegisteredVehicle,
    addRegisteredClient,
    updateRegisteredClient,
    driverSettlements = []
  } = useStore();
  const isReadOnly = currentUser?.role === 'visualizador' || currentUser?.role === 'supervisor';
  const [view, setView] = useState<'entrada' | 'saida'>('entrada');

  const isSettlementDone = React.useCallback((movementId: string) => {
    const mov = movements.find(m => m.id === movementId);
    if (!mov) return false;
    if (mov.ownerType !== 'proprio') return true;

    // 1. Direct settlement check
    const directSettled = driverSettlements.some(ds => {
      if (ds.status !== 'completed') return false;
      return ds.movementId === mov.id || ds.movementId === `settled-${mov.id}`;
    });
    if (directSettled) return true;

    // 2. Preceding saida check
    const plate = mov.plate.toLowerCase();
    const entryTime = new Date(mov.timestamp).getTime();
    
    const correspondingSaida = movements
      .filter(m => m.type === 'saida' && m.plate.toLowerCase() === plate && new Date(m.timestamp).getTime() < entryTime)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())[0];

    if (!correspondingSaida) {
      return true;
    }

    return driverSettlements.some(ds => {
      if (ds.status !== 'completed') return false;
      return ds.movementId === correspondingSaida.id || ds.movementId === `settled-${correspondingSaida.id}`;
    });
  }, [movements, driverSettlements]);

  // Form State
  const [plate, setPlate] = useState('');
  const [driver, setDriver] = useState('');
  const [ownerType, setOwnerType] = useState<OwnerType>('terceiro');
  const [vehicleType, setVehicleType] = useState<VehicleType>('carreta');
  const [odometer, setOdometer] = useState<number | ''>('');
  const [client, setClient] = useState('');
  const [avgVasilhames, setAvgVasilhames] = useState<number | ''>('');
  
  // Shortcuts search filter state
  const [filterClient, setFilterClient] = useState('');

  // Non-production & Entry Purpose
  const [entryPurpose, setEntryPurpose] = useState<string>('producao');
  const [bypassProduction, setBypassProduction] = useState(false);

  // Sync default vehicleType/entryPurpose when mounting
  React.useEffect(() => {
    if (customVehicleCategories.length > 0 && !customVehicleCategories.some(c => c.id === vehicleType)) {
      setVehicleType(customVehicleCategories[0].id);
    }
  }, [customVehicleCategories]);

  React.useEffect(() => {
    if (customEntryPurposes.length > 0 && !customEntryPurposes.some(p => p.id === entryPurpose)) {
      setEntryPurpose(customEntryPurposes[0].id);
    }
  }, [customEntryPurposes]);

  // Auto-calculate bypass based on category, purpose, or specific pre-registered vehicle configurations
  React.useEffect(() => {
    const matchedVehicle = (registeredVehicles || []).find(v => (v?.plate || '').toUpperCase() === (plate || '').toUpperCase().trim());
    
    if (matchedVehicle && matchedVehicle.bypassProductionDefault !== undefined) {
      setBypassProduction(matchedVehicle.bypassProductionDefault);
    } else {
      const matchedCategory = customVehicleCategories.find(c => c.id === vehicleType);
      const matchedPurpose = customEntryPurposes.find(p => p.id === entryPurpose);
      
      const shouldBypass = 
        (matchedCategory?.bypassProductionDefault || false) || 
        (matchedPurpose?.bypassProductionDefault || false);
        
      setBypassProduction(shouldBypass);
    }
  }, [plate, vehicleType, entryPurpose, customVehicleCategories, customEntryPurposes, registeredVehicles]);

  // Searching / Filtering corporate shortcuts
  const [filterPlate, setFilterPlate] = useState('');
  const [filterDriver, setFilterDriver] = useState('');

  // Searching / Filtering active yard list
  const [searchPlate, setSearchPlate] = useState('');
  const [searchDriver, setSearchDriver] = useState('');

  // UI state for alerts and confirmations
  const [notification, setNotification] = useState<{ type: 'success' | 'info' | 'error'; message: string } | null>(null);
  const [exitConfirmId, setExitConfirmId] = useState<string | null>(null);
  const [exitOrderPhoto, setExitOrderPhoto] = useState<string | null>(null);
  const [earlyExitReason, setEarlyExitReason] = useState<string>('');
  const [exitDriverName, setExitDriverName] = useState<string>('');
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [deleteReason, setDeleteReason] = useState<string>('');

  // Temporary Exit / Return states with driver selection
  const [tempExitTargetId, setTempExitTargetId] = useState<string | null>(null);
  const [tempExitType, setTempExitType] = useState<'almoco' | 'oficina' | null>(null);
  const [tempExitDriver, setTempExitDriver] = useState<string>('');

  const [tempReturnTargetId, setTempReturnTargetId] = useState<string | null>(null);
  const [tempReturnDriver, setTempReturnDriver] = useState<string>('');

  const activeVehicles = useMemo(() => movements.filter(m => 
    (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
    m.status !== 'saida' && 
    m.gateStatus !== 'ausente_almoco' && 
    m.gateStatus !== 'ausente_oficina'
  ), [movements, currentUser?.unit]);

  const filteredActiveVehicles = useMemo(() => activeVehicles.filter(v => 
    v.plate.toUpperCase().includes(searchPlate.toUpperCase().trim()) &&
    v.driver.toLowerCase().includes(searchDriver.toLowerCase().trim())
  ), [activeVehicles, searchPlate, searchDriver]);

  const getDeletionBlockReason = React.useCallback((v: Movement) => {
    if (v.status === 'concluido' || v.status === 'saida') {
      return 'O veículo já concluiu a estadia ou realizou a saída.';
    }
    if (v.status === 'em_atendimento') {
      return 'O veículo está em atendimento/operação no pátio.';
    }
    const hasSupply = (supplies || []).some(s => s.movementId === v.id);
    if (hasSupply) {
      return 'Este veículo já realizou abastecimento nesta estadia.';
    }
    const startedKanban = v.kanbanStep && v.kanbanStep !== 'aguardando_descarregamento';
    if (startedKanban) {
      return `Processo de produção já foi iniciado (Etapa atual: ${
        v.kanbanStep === 'descarregamento' ? 'Descarregamento' :
        v.kanbanStep === 'aguardando_carregamento' ? 'Aguardando Carregamento' :
        v.kanbanStep === 'carregamento' ? 'Carregamento' :
        v.kanbanStep === 'concluido' ? 'Concluído' : v.kanbanStep
      }).`;
    }
    const hasProductionControl = v.productionControl && (
      (v.productionControl.descarregadoQty !== undefined && v.productionControl.descarregadoQty > 0) ||
      (v.productionControl.totalCarregado !== undefined && v.productionControl.totalCarregado > 0) ||
      (v.productionControl.avariasDescarregamento && v.productionControl.avariasDescarregamento.length > 0) ||
      (v.productionControl.avariasCarregamento && v.productionControl.avariasCarregamento.length > 0)
    );
    if (hasProductionControl) {
      return 'Já há lançamentos de mercadorias, avarias ou vasilhames vinculados a esta entrada.';
    }
    return null;
  }, [supplies]);

  const temporaryExitedVehicles = useMemo(() => {
    return movements.filter(m => 
      (m.unit || 'matriz') === (currentUser?.unit || 'matriz') &&
      m.status !== 'saida' && 
      (m.gateStatus === 'ausente_almoco' || m.gateStatus === 'ausente_oficina')
    );
  }, [movements, currentUser?.unit]);

  const handleConfirmTempExit = (movementId: string, type: 'almoco' | 'oficina', driverName: string) => {
    if (isReadOnly) {
      showToast('error', 'Acesso Restrito: Usuários com perfil de visualização não podem realizar registros.');
      return;
    }
    const cleanDriver = driverName.trim();
    if (!cleanDriver) {
      showToast('error', 'Por favor, selecione o condutor.');
      return;
    }
    const movement = movements.find(m => m.id === movementId);
    if (movement) {
      if (cleanDriver.toLowerCase() !== movement.driver.toLowerCase()) {
        updateMovementDetails(movementId, { driver: cleanDriver });
      }
      registerGateTemporaryExit(movementId, type, currentUser?.name || 'Portaria');
      showToast('success', `Saída para ${type === 'almoco' ? 'Almoço' : 'Oficina'} registrada com sucesso!`);
    }
    setTempExitTargetId(null);
    setTempExitType(null);
    setTempExitDriver('');
  };

  const handleConfirmTempReturn = (movementId: string, driverName: string) => {
    if (isReadOnly) {
      showToast('error', 'Acesso Restrito: Usuários com perfil de visualização não podem realizar registros.');
      return;
    }
    const cleanDriver = driverName.trim();
    if (!cleanDriver) {
      showToast('error', 'Por favor, selecione o condutor.');
      return;
    }
    const movement = movements.find(m => m.id === movementId);
    if (movement) {
      if (cleanDriver.toLowerCase() !== movement.driver.toLowerCase()) {
        updateMovementDetails(movementId, { driver: cleanDriver });
      }
      registerGateTemporaryReturn(movementId, currentUser?.name || 'Portaria');
      showToast('success', `Retorno de ${movement.gateStatus === 'ausente_almoco' ? 'Almoço' : 'Oficina'} concluído!`);
    }
    setTempReturnTargetId(null);
    setTempReturnDriver('');
  };

  const filteredPreRegistered = useMemo(() => registeredVehicles.filter(pv => 
    pv.plate.toUpperCase().includes(filterPlate.toUpperCase().trim())
  ), [registeredVehicles, filterPlate]);

  const filteredCompanyDrivers = useMemo(() => registeredDrivers.filter(cd => 
    cd.name.toLowerCase().includes(filterDriver.toLowerCase().trim())
  ), [registeredDrivers, filterDriver]);

  const filteredCompanyClients = useMemo(() => registeredClients
    .filter(cc => !!cc.comprasNaEmpresa)
    .filter(cc => cc.name.toLowerCase().includes(filterClient.toLowerCase().trim()))
    .sort((a, b) => {
      const codeA = parseInt(a.codigo || '', 10);
      const codeB = parseInt(b.codigo || '', 10);
      const isANum = !isNaN(codeA) && /^\d+$/.test((a.codigo || '').trim());
      const isBNum = !isNaN(codeB) && /^\d+$/.test((b.codigo || '').trim());
      if (isANum && isBNum) {
        return codeA - codeB;
      }
      if (isANum) return -1;
      if (isBNum) return 1;
      const valA = a.codigo || '';
      const valB = b.codigo || '';
      if (valA || valB) {
        return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
      }
      return a.name.localeCompare(b.name);
    }), [registeredClients, filterClient]);

  const showToast = (type: 'success' | 'info' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => setNotification(null), 5000);
  };

  const handlePlateChange = (val: string) => {
    setPlate(val);

    // If matches a pre-registered vehicle, pre-fill its category and ownerType
    const matched = (registeredVehicles || []).find(pv => (pv?.plate || '').toUpperCase() === (val || '').toUpperCase().trim());
    if (matched) {
      setOwnerType(matched.ownerType);
      handleVehicleTypeChange(matched.vehicleType);
      setAvgVasilhames(matched.averageVasilhames !== undefined ? matched.averageVasilhames : '');
      if (matched.defaultPurposeId) {
        setEntryPurpose(matched.defaultPurposeId);
      }

      let foundDriverName = '';
      let foundClientName = '';

      // If driver is linked to this vehicle, auto grab it
      if (matched.defaultDriverId) {
        const foundDriver = registeredDrivers.find(d => d.id === matched.defaultDriverId);
        if (foundDriver) {
          setDriver(foundDriver.name);
          foundDriverName = foundDriver.name;
        }
      }

      // Check if there is a client linked to this vehicle
      const linkedClient = registeredClients.find(c => c.defaultVehicleId === matched.id || c.vehicleIds?.includes(matched.id));
      if (linkedClient) {
        setClient(linkedClient.name);
        foundClientName = linkedClient.name;
      } else {
        setClient('');
      }

      if (foundDriverName && foundClientName) {
        showToast('info', `Veículo identificado. Motorista "${foundDriverName}" e Cliente "${foundClientName}" auto-vinculados.`);
      } else if (foundDriverName) {
        showToast('info', `Veículo identificado. Motorista "${foundDriverName}" pré-vinculado.`);
      } else if (foundClientName) {
        showToast('info', `Veículo identificado. Cliente "${foundClientName}" pré-vinculado.`);
      } else {
        showToast('info', `Veículo identificado. Preencha o cliente manualmente.`);
      }
    } else {
      setAvgVasilhames('');
    }
  };

  const selectPreRegistered = (p: string, type: VehicleType, owType: OwnerType) => {
    setPlate(p);
    setOwnerType(owType);
    handleVehicleTypeChange(type);

    const matched = registeredVehicles.find(v => v.plate === p);
    if (matched) {
      setAvgVasilhames(matched.averageVasilhames !== undefined ? matched.averageVasilhames : '');
      if (matched.defaultPurposeId) {
        setEntryPurpose(matched.defaultPurposeId);
      }
      let foundDriverName = '';
      let foundClientName = '';

      if (matched.defaultDriverId) {
        const foundDriver = registeredDrivers.find(d => d.id === matched.defaultDriverId);
        if (foundDriver) {
          setDriver(foundDriver.name);
          foundDriverName = foundDriver.name;
        }
      }

      const linkedClient = registeredClients.find(c => c.defaultVehicleId === matched.id || c.vehicleIds?.includes(matched.id));
      if (linkedClient) {
        setClient(linkedClient.name);
        foundClientName = linkedClient.name;
      } else {
        setClient('');
      }

      if (foundDriverName && foundClientName) {
        showToast('info', `Veículo ${p} carregado com o motorista ${foundDriverName} e cliente ${foundClientName}.`);
      } else if (foundDriverName) {
        showToast('info', `Veículo ${p} carregado com o motorista ${foundDriverName}.`);
      } else if (foundClientName) {
        showToast('info', `Veículo ${p} carregado com o cliente ${foundClientName}.`);
      } else {
        showToast('info', `Veículo ${p} carregado. Preencha o cliente manualmente.`);
      }
    } else {
      setAvgVasilhames('');
    }
  };

  const handleDriverChange = (val: string) => {
    setDriver(val);

    const matchedDriver = (registeredDrivers || []).find(d => (d?.name || '').toLowerCase() === (val || '').toLowerCase().trim());
    if (matchedDriver) {
      let foundPlate = '';
      let foundClientName = '';

      // 1. Find vehicle linked to this driver
      const matchedVeh = registeredVehicles.find(v => v.defaultDriverId === matchedDriver.id);
      if (matchedVeh) {
        setPlate(matchedVeh.plate);
        setOwnerType(matchedVeh.ownerType);
        handleVehicleTypeChange(matchedVeh.vehicleType);
        setAvgVasilhames(matchedVeh.averageVasilhames !== undefined ? matchedVeh.averageVasilhames : '');
        if (matchedVeh.defaultPurposeId) {
          setEntryPurpose(matchedVeh.defaultPurposeId);
        }
        foundPlate = matchedVeh.plate;
      }

      // 2. Find client linked to this driver or the found vehicle
      const linkedClient = registeredClients.find(c => 
        c.defaultDriverId === matchedDriver.id || 
        c.driverIds?.includes(matchedDriver.id) ||
        (matchedVeh && (c.defaultVehicleId === matchedVeh.id || c.vehicleIds?.includes(matchedVeh.id)))
      );

      if (linkedClient) {
        setClient(linkedClient.name);
        foundClientName = linkedClient.name;
      } else {
        setClient('');
      }

      // If we didn't find a vehicle via the driver directly, but the linked client has a default vehicle, prefill it!
      if (!matchedVeh && linkedClient) {
        const defaultVehicleId = linkedClient.defaultVehicleId || (linkedClient.vehicleIds && linkedClient.vehicleIds.length === 1 ? linkedClient.vehicleIds[0] : undefined);
        if (defaultVehicleId) {
          const clientVeh = registeredVehicles.find(v => v.id === defaultVehicleId);
          if (clientVeh) {
            setPlate(clientVeh.plate);
            setOwnerType(clientVeh.ownerType);
            handleVehicleTypeChange(clientVeh.vehicleType);
            setAvgVasilhames(clientVeh.averageVasilhames !== undefined ? clientVeh.averageVasilhames : '');
            if (clientVeh.defaultPurposeId) {
              setEntryPurpose(clientVeh.defaultPurposeId);
            }
            foundPlate = clientVeh.plate;
          }
        }
      }

      // Show toast message with auto-fill info
      if (foundPlate && foundClientName) {
        showToast('info', `Motorista "${matchedDriver.name}" selecionado. Placa "${foundPlate}" e Cliente "${foundClientName}" auto-vinculados.`);
      } else if (foundPlate) {
        showToast('info', `Motorista "${matchedDriver.name}" selecionado. Placa "${foundPlate}" auto-vinculada.`);
      } else if (foundClientName) {
        showToast('info', `Motorista "${matchedDriver.name}" selecionado. Cliente "${foundClientName}" auto-vinculado.`);
      } else {
        showToast('info', `Motorista "${matchedDriver.name}" selecionado.`);
      }
    }
  };

  const selectDriver = (name: string) => {
    handleDriverChange(name);
  };

  const selectClient = (cli: typeof registeredClients[0]) => {
    setClient(cli.name);
    let extraMsg = '';

    // If client has a default vehicle, pre-fill
    const defaultVehicleId = cli.defaultVehicleId || (cli.vehicleIds && cli.vehicleIds.length === 1 ? cli.vehicleIds[0] : undefined);
    let vehicleToUse = null;
    if (defaultVehicleId) {
      const foundVeh = registeredVehicles.find(v => v.id === defaultVehicleId);
      if (foundVeh) {
        setPlate(foundVeh.plate);
        setOwnerType(foundVeh.ownerType);
        handleVehicleTypeChange(foundVeh.vehicleType);
        if (foundVeh.defaultPurposeId) {
          setEntryPurpose(foundVeh.defaultPurposeId);
        }
        extraMsg += `${extraMsg ? ' e' : ''} veículo ${foundVeh.plate}`;
        vehicleToUse = foundVeh;
      }
    } else {
      // If there's already a plate entered, use it for auto-filling from vehicle
      const curPlate = plate.toUpperCase().trim();
      if (curPlate) {
        vehicleToUse = registeredVehicles.find(v => v.plate.toUpperCase() === curPlate);
        if (vehicleToUse && vehicleToUse.defaultPurposeId) {
          setEntryPurpose(vehicleToUse.defaultPurposeId);
        }
      }
    }

    // Determine driver to set: vehicle default driver takes priority, then client default driver
    let driverNameToSet = '';
    if (vehicleToUse && vehicleToUse.defaultDriverId) {
      const foundDriver = registeredDrivers.find(d => d.id === vehicleToUse.defaultDriverId);
      if (foundDriver) {
        driverNameToSet = foundDriver.name;
      }
    }

    if (!driverNameToSet) {
      const defaultDriverId = cli.defaultDriverId || (cli.driverIds && cli.driverIds.length === 1 ? cli.driverIds[0] : undefined);
      if (defaultDriverId) {
        const foundDriver = registeredDrivers.find(d => d.id === defaultDriverId);
        if (foundDriver) {
          driverNameToSet = foundDriver.name;
        }
      }
    }

    if (driverNameToSet) {
      setDriver(driverNameToSet);
      extraMsg += ` condutor ${driverNameToSet}`;
    }

    showToast('info', `Cliente "${cli.name}" selecionado${extraMsg ? ` (${extraMsg.trim()})` : ''}.`);
  };

  const handlePurposeChange = (purpose: string) => {
    setEntryPurpose(purpose);
    const matchedPurp = customEntryPurposes.find(p => p.id === purpose);
    if (matchedPurp) {
      setBypassProduction(matchedPurp.bypassProductionDefault);
    } else if (purpose === 'linha_descartavel') {
      setBypassProduction(true);
    }
  };

  const handleVehicleTypeChange = (type: VehicleType) => {
    setVehicleType(type);
  };

  const handleEntradaSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) {
      showToast('error', 'Acesso Restrito: Usuários com perfil de visualização não podem realizar registros.');
      return;
    }
    if (!plate || !driver) return;

    const formattedPlate = plate.toUpperCase().trim();

    // Check if vehicle is already inside the yard
    const isAlreadyInYard = activeVehicles.some(
      m => m.plate.toUpperCase().trim() === formattedPlate
    );

    if (isAlreadyInYard) {
      showToast('error', `REGISTRO RECUSADO: O veículo com placa ${formattedPlate} já está dentro do pátio.`);
      return;
    }

    // Standard checklist will be performed during fueling at Posto Interno. Save a default structure for now.
    const defaultChecklist: Checklist = { 
      brakes: false, 
      tires: false, 
      lights: false, 
      leaks: false, 
      passed: false 
    };

    const genProdCode = `PRD-${new Date().getFullYear()}${(new Date().getMonth() + 1).toString().padStart(2, '0')}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`;

    const newMovement: Movement = {
      id: crypto.randomUUID ? crypto.randomUUID() : 'mov-' + Date.now().toString(36),
      productionCode: genProdCode,
      plate: formattedPlate,
      driver: driver.trim(),
      ownerType,
      vehicleType,
      odometer: ownerType === 'proprio' && odometer !== '' ? Number(odometer) : undefined,
      type: 'entrada',
      timestamp: new Date().toISOString(),
      entryTimestamp: new Date().toISOString(),
      checklist: defaultChecklist,
      status: 'na_fila',
      createdBy: currentUser?.name || 'Sistema',
      purpose: entryPurpose,
      bypassProduction: bypassProduction,
      kanbanStep: bypassProduction ? undefined : 'aguardando_descarregamento',
      client: client.trim() !== '' ? client.trim() : undefined,
      unit: currentUser?.unit || 'matriz'
    };

    // Auto-registration in backup (master data)
    let autoRegisteredMsg = '';

    // 1. Check or create driver
    let driverId = '';
    const normalizedDriverName = driver.trim().toLowerCase();
    const foundDriver = registeredDrivers.find(d => d.name.toLowerCase() === normalizedDriverName);
    if (foundDriver) {
      driverId = foundDriver.id;
    } else {
      driverId = crypto.randomUUID ? crypto.randomUUID() : 'drv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      addRegisteredDriver({
        id: driverId,
        name: driver.trim(),
        driverType: ownerType === 'proprio' ? 'interno' : 'cliente',
        unit: currentUser?.unit || 'matriz'
      });
      autoRegisteredMsg += 'motorista';
    }

    // 2. Check or create vehicle & update averageVasilhames & defaultDriverId
    let vehicleId = '';
    const foundVehicle = registeredVehicles.find(v => v.plate.toUpperCase() === formattedPlate);
    const hasVasilhamesValue = avgVasilhames !== '';
    const vasilhamesNum = hasVasilhamesValue ? Number(avgVasilhames) : undefined;

    if (foundVehicle) {
      vehicleId = foundVehicle.id;
      // Update vehicle properties if they changed or were not set
      const updates: Partial<RegisteredVehicle> = {};
      let needsUpdate = false;
      if (foundVehicle.defaultDriverId !== driverId) {
        updates.defaultDriverId = driverId;
        needsUpdate = true;
      }
      if (hasVasilhamesValue && foundVehicle.averageVasilhames !== vasilhamesNum) {
        updates.averageVasilhames = vasilhamesNum;
        needsUpdate = true;
      }
      if (foundVehicle.bypassProductionDefault !== bypassProduction) {
        updates.bypassProductionDefault = bypassProduction;
        needsUpdate = true;
      }
      if (foundVehicle.defaultPurposeId !== entryPurpose) {
        updates.defaultPurposeId = entryPurpose;
        needsUpdate = true;
      }
      if (needsUpdate) {
        updateRegisteredVehicle(vehicleId, updates);
      }
    } else {
      vehicleId = crypto.randomUUID ? crypto.randomUUID() : 'veh-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
      addRegisteredVehicle({
        id: vehicleId,
        plate: formattedPlate,
        vehicleType,
        ownerType,
        defaultDriverId: driverId, // Automatically link the driver here!
        averageVasilhames: vasilhamesNum,
        bypassProductionDefault: bypassProduction,
        defaultPurposeId: entryPurpose,
        unit: currentUser?.unit || 'matriz'
      });
      autoRegisteredMsg += autoRegisteredMsg ? ' e veículo' : 'veículo';
    }

    // 3. Check or create client and link vehicle & driver
    const clientNameTrimmed = client.trim();
    if (clientNameTrimmed) {
      const clientObj = registeredClients.find(c => c.name.toLowerCase() === clientNameTrimmed.toLowerCase());
      if (!clientObj) {
        const clientId = crypto.randomUUID ? crypto.randomUUID() : 'cli-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4);
        addRegisteredClient({
          id: clientId,
          name: clientNameTrimmed,
          defaultVehicleId: vehicleId,
          defaultDriverId: driverId,
          vehicleIds: [vehicleId],
          driverIds: [driverId],
          unit: currentUser?.unit || 'matriz',
          comprasNaEmpresa: true
        });
        autoRegisteredMsg += autoRegisteredMsg ? ' e cliente' : 'cliente';
      } else {
        // update existing client's links
        const currentVehicles = clientObj.vehicleIds || [];
        const currentDrivers = clientObj.driverIds || [];
        const updatedUpdates: Partial<RegisteredClient> = {};
        let updated = false;

        if (!clientObj.comprasNaEmpresa) {
          updatedUpdates.comprasNaEmpresa = true;
          updated = true;
        }
        if (!currentVehicles.includes(vehicleId)) {
          updatedUpdates.vehicleIds = [...currentVehicles, vehicleId];
          if (!clientObj.defaultVehicleId) {
            updatedUpdates.defaultVehicleId = vehicleId;
          }
          updated = true;
        }
        if (!currentDrivers.includes(driverId)) {
          updatedUpdates.driverIds = [...currentDrivers, driverId];
          if (!clientObj.defaultDriverId) {
            updatedUpdates.defaultDriverId = driverId;
          }
          updated = true;
        }

        if (updated) {
          updateRegisteredClient(clientObj.id, updatedUpdates);
        }
      }
    }

    if (autoRegisteredMsg) {
      autoRegisteredMsg = ` (${autoRegisteredMsg} cadastrado(s) e vinculado(s) automaticamente no pré-cadastro)`;
    }

    addMovement(newMovement);
    
    setPlate(''); 
    setDriver(''); 
    setOdometer('');
    setClient('');
    setAvgVasilhames('');
    setEntryPurpose('producao');
    setBypassProduction(false);
    
    showToast('success', bypassProduction 
      ? `Entrada autorizada! (Desvio de fila de produção ativado)${autoRegisteredMsg}` 
      : `Entrada autorizada! Veículo na fila.${autoRegisteredMsg}`
    );
  };

  const triggerSaidaConfirmation = (id: string) => {
    const target = movements.find(m => m.id === id);
    setExitConfirmId(id);
    setExitOrderPhoto(null);
    setEarlyExitReason('');
    setExitDriverName(target ? target.driver : '');
  };

  const activeExitTarget = movements.find(m => m.id === exitConfirmId);
  
  // Own fleet check: Refueling and Inspection checklistEvaluator
  const hasRefueling = activeExitTarget ? (supplies || []).some(s => s.movementId === activeExitTarget.id) : false;
  const hasInspected = activeExitTarget ? !!activeExitTarget.checklistEvaluator : false;
  
  const isOwnFleet = useMemo(() => {
    if (!activeExitTarget) return false;
    if (activeExitTarget.ownerType === 'proprio') return true;
    const cleanPlate = activeExitTarget.plate.replace(/[^A-Za-z0-9]/g, '').toLowerCase();
    const matchedVeh = registeredVehicles.find(v => v.plate.replace(/[^A-Za-z0-9]/g, '').toLowerCase() === cleanPlate);
    if (matchedVeh && matchedVeh.ownerType === 'proprio') return true;
    return false;
  }, [activeExitTarget, registeredVehicles]);

  const ownFleetMissingRefuelOrInspection = isOwnFleet && (!hasRefueling || !hasInspected);

  const needsEarlyExitReason = !!(activeExitTarget && !activeExitTarget.bypassProduction && activeExitTarget.kanbanStep !== 'concluido');
  const needsOwnFleetBypassReason = !!(activeExitTarget && ownFleetMissingRefuelOrInspection);
  const needsReason = needsEarlyExitReason || needsOwnFleetBypassReason;

  const isSettlementCompleted = useMemo(() => {
    if (!activeExitTarget) return false;
    return isSettlementDone(activeExitTarget.id);
  }, [activeExitTarget, isSettlementDone]);

  const executeSaida = () => {
    if (isReadOnly) {
      showToast('error', 'Acesso Restrito: Usuários com perfil de visualização não podem realizar registros.');
      return;
    }
    if (exitConfirmId && activeExitTarget) {
      const cleanDriverName = exitDriverName.trim();
      if (!cleanDriverName) {
        showToast('error', 'Por favor, informe o nome do motorista/condutor na saída.');
        return;
      }

      if (isOwnFleet && !isSettlementCompleted) {
        showToast('error', 'Saída não autorizada! O acerto de viagem (prestação de contas) deste veículo da frota própria precisa ser finalizado antes da saída.');
        return;
      }
      if (needsReason && earlyExitReason.trim() === '') {
        showToast('error', isOwnFleet ? 'Por favor, informe uma observação justificando a saída da frota própria sem abastecimento/vistoria.' : 'Por favor, informe o motivo da saída antecipada.');
        return;
      }

      // If driver changed, update movement and optionally register driver
      if (cleanDriverName.toLowerCase() !== activeExitTarget.driver.toLowerCase()) {
        const foundDriver = registeredDrivers.find(d => d.name.toLowerCase() === cleanDriverName.toLowerCase());
        if (!foundDriver) {
          addRegisteredDriver({
            id: crypto.randomUUID ? crypto.randomUUID() : 'drv-' + Date.now().toString(36) + '-' + Math.random().toString(36).substr(2, 4),
            name: cleanDriverName,
            driverType: isOwnFleet ? 'interno' : 'cliente',
            unit: currentUser?.unit || 'matriz'
          });
        }
        updateMovementDetails(exitConfirmId, { driver: cleanDriverName });
      }

      registerExit(
        exitConfirmId, 
        new Date().toISOString(), 
        currentUser?.name || 'Sistema', 
        exitOrderPhoto || undefined,
        needsReason ? earlyExitReason.trim() : undefined
      );
      setExitConfirmId(null);
      setExitOrderPhoto(null);
      setEarlyExitReason('');
      setExitDriverName('');
      showToast('success', 'Saída efetivada com sucesso!');
    }
  };

  return (
    <div className="h-full flex flex-col gap-4 w-full relative">
      
      {/* State-driven Toaster Alert */}
      {notification && (
        <div className={`fixed top-4 right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-lg shadow-lg border animate-in fade-in slide-in-from-top duration-300 ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : notification.type === 'error'
            ? 'bg-rose-50 border-rose-200 text-rose-800'
            : 'bg-blue-50 border-blue-200 text-blue-800'
        }`}>
          <div className="p-1 rounded-full bg-white shadow-sm">
            {notification.type === 'error' ? (
              <AlertCircle size={16} className="text-rose-600" />
            ) : (
              <Check size={16} className={notification.type === 'success' ? 'text-emerald-600' : 'text-blue-600'} />
            )}
          </div>
          <span className="text-xs font-bold uppercase tracking-tight">{notification.message}</span>
          <button onClick={() => setNotification(null)} className="ml-2 text-slate-400 hover:text-slate-600">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Confirmation Modal for Exit */}
      {exitConfirmId && activeExitTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
          <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
              <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                <AlertCircle className="text-amber-500" size={16} /> Confirmar Liberação
              </span>
              <button onClick={() => setExitConfirmId(null)} className="text-slate-400 hover:text-slate-600">
                <X size={16} />
              </button>
            </div>
            <div className="p-5 text-center">
              <p className="text-sm font-medium text-slate-600 mb-2">Deseja efetivar a saída física deste veículo do pátio?</p>
              
              <div className="bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 mb-4 text-left">
                <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Veículo / Placa</p>
                <p className="text-lg font-mono font-bold text-slate-850 tracking-wider mb-3">{activeExitTarget.plate}</p>
                
                <label className="block text-[10px] font-extrabold text-slate-500 uppercase mb-1">
                  Motorista na Saída (Selecione um motorista próprio cadastrado) *
                </label>
                <select
                  value={exitDriverName}
                  onChange={(e) => setExitDriverName(e.target.value)}
                  className="w-full bg-white border border-slate-300 rounded text-xs p-2.5 outline-none focus:border-blue-450 focus:ring-1 focus:ring-blue-450 shadow-3xs font-semibold text-slate-700"
                >
                  <option value="">-- Selecione o Motorista Próprio --</option>
                  {activeExitTarget.driver && !registeredDrivers.some(d => d.name.toLowerCase() === activeExitTarget.driver.toLowerCase() && d.driverType === 'interno') && (
                    <option value={activeExitTarget.driver}>{activeExitTarget.driver} (Atual)</option>
                  )}
                  {registeredDrivers
                    .filter(d => d.driverType === 'interno')
                    .sort((a, b) => a.name.localeCompare(b.name))
                    .map(d => (
                      <option key={d.id} value={d.name}>
                        {d.name}
                      </option>
                    ))
                  }
                </select>
              </div>
              
              {isOwnFleet && !isSettlementCompleted && (
                <div className="bg-rose-50 border border-rose-200 text-rose-800 rounded-lg p-3.5 text-left mb-4 flex gap-2.5 items-start">
                  <AlertCircle size={18} className="text-rose-600 shrink-0 mt-0.5" />
                  <div className="flex flex-col gap-1 font-sans">
                    <span className="text-xs font-black uppercase tracking-wider text-rose-950">Acerto de Viagem Pendente</span>
                    <p className="text-slate-600 text-[11px] leading-relaxed font-medium">
                      Este veículo pertence à <strong className="text-slate-900 font-bold">Frota Própria</strong>. A saída física é <strong className="text-rose-950 font-bold">bloqueada</strong> até que a prestação de contas (acerto de viagem) seja finalizada pelo motorista ou operador.
                    </p>
                    <span className="text-[10px] text-rose-900 font-bold">Por favor, realize o acerto em "Prestação de Contas" primeiro.</span>
                  </div>
                </div>
              )}

              <div className="mb-4">
                <OrderPhotoSelector 
                  onPhotoSelected={setExitOrderPhoto} 
                  selectedPhoto={exitOrderPhoto} 
                  label={
                    <>
                      Foto do Veículo / Comprovante de Saída <span className="text-slate-400 font-normal italic">(Opcional)</span>
                    </>
                  }
                  previewLabel="Foto de Saída Carregada"
                />
              </div>

               {needsReason && (
                <div className={`${needsOwnFleetBypassReason ? 'bg-rose-50 border border-rose-200 text-rose-800' : 'bg-amber-50 border border-amber-200 text-amber-800'} rounded-lg p-3.5 text-left mb-4`}>
                  <div className="flex gap-2 items-center text-xs font-bold uppercase tracking-wider mb-1.5 font-sans">
                    <AlertCircle size={15} className={needsOwnFleetBypassReason ? 'text-rose-600 shrink-0' : 'text-amber-600 shrink-0'} />
                    <span>
                      {needsOwnFleetBypassReason ? 'Aviso Importante: Frota Própria Pendente' : 'Aviso: Produção Não Concluída'}
                    </span>
                  </div>
                  
                  {needsOwnFleetBypassReason ? (
                    <div className="text-slate-650 text-[11px] leading-relaxed mb-3 space-y-1 font-sans font-medium">
                      <p>Este veículo pertence à <strong className="text-slate-900 font-bold">Frota Própria</strong> e possui as seguintes pendências de saída:</p>
                      <ul className="list-disc pl-4 font-bold text-rose-950 space-y-0.5">
                        {!hasRefueling && <li>❌ Abastecimento obrigatório pendente neste pátio</li>}
                        {!hasInspected && <li>❌ Conferência/Inspeção/Vistoria física regulamentar não realizada</li>}
                      </ul>
                      <p className="mt-2 text-slate-600 font-normal">Para autorizar esta liberação de saída pendente, é <strong className="text-rose-900 font-extrabold">obrigatório registrar uma observação/justificativa detalhada</strong> abaixo.</p>
                    </div>
                  ) : (
                    <p className="text-slate-600 text-[11px] leading-relaxed mb-3 font-sans font-medium">
                      Este veículo está na fila de recepção/produção e o processo não foi concluído.
                      <strong> É obrigatório informar o motivo da saída antecipada</strong> para prosseguir.
                    </p>
                  )}

                  <label className={`block text-[9px] font-extrabold uppercase tracking-wider mb-1 ${needsOwnFleetBypassReason ? 'text-rose-900 font-black' : 'text-slate-500'}`}>
                    {needsOwnFleetBypassReason ? 'Observação/Justificativa de Saída da Frota (Obrigatório) *' : 'Motivo da Saída Antecipada (Obrigatório) *'}
                  </label>
                  <textarea
                    rows={3}
                    value={earlyExitReason}
                    onChange={(e) => setEarlyExitReason(e.target.value)}
                    placeholder={needsOwnFleetBypassReason ? "Informe a justificativa/autorizador/motivo pelo qual o veículo está saindo sem abastecer ou sem vistoria..." : "Informe o motivo da liberação sem conclusão do processo..."}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-slate-500 focus:outline-none focus:ring-1 focus:ring-slate-500 font-sans"
                  />
                </div>
              )}

              <p className="text-[10px] text-slate-400 uppercase font-bold">Esta ação registrará o timestamp de saída e liberará a vaga.</p>
            </div>
            <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
              <button 
                onClick={() => setExitConfirmId(null)} 
                className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
              >
                Cancelar
              </button>
              <button 
                onClick={executeSaida} 
                disabled={(needsReason && earlyExitReason.trim() === '') || (isOwnFleet && !isSettlementCompleted)}
                className={`px-5 py-2 rounded text-xs font-bold uppercase tracking-widest shadow-sm transition-colors ${
                  (needsReason && earlyExitReason.trim() === '') || (isOwnFleet && !isSettlementCompleted)
                    ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                    : 'bg-slate-900 hover:bg-slate-800 text-white cursor-pointer'
                }`}
              >
                Efetivar Saída
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirmation Modal for Deletion */}
      {deleteConfirmId && (() => {
        const target = movements.find(m => m.id === deleteConfirmId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="text-rose-600" size={16} /> Confirmar Exclusão de Registro
                </span>
                <button 
                  onClick={() => {
                    setDeleteConfirmId(null);
                    setDeleteReason('');
                  }} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm font-medium text-slate-600 mb-3 text-center">
                  Tem certeza de que deseja <strong className="text-rose-700 font-extrabold">excluir permanentemente</strong> a entrada deste veículo?
                </p>
                
                <div className="bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Veículo / Placa</p>
                  <p className="text-lg font-mono font-bold text-slate-800 tracking-wider mb-2">{target.plate}</p>
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Motorista</p>
                  <p className="text-xs font-bold text-slate-700">{target.driver}</p>
                </div>

                <div className="space-y-1.5 text-left mb-4">
                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider">
                    Motivo da Exclusão (Obrigatório) *
                  </label>
                  <textarea
                    rows={3}
                    value={deleteReason}
                    onChange={(e) => setDeleteReason(e.target.value)}
                    placeholder="Informe detalhadamente a justificativa para excluir este registro (ex: erro de digitação de placa, cancelamento de viagem, duplicidade)..."
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-rose-500 focus:outline-none focus:ring-1 focus:ring-rose-500 font-semibold text-slate-700"
                  />
                </div>

                <p className="text-[10px] text-slate-400 font-semibold text-center uppercase tracking-wider leading-relaxed">
                  ⚠️ ATENÇÃO: Esta ação é irreversível e removerá o veículo de todas as filas e painéis de controle.
                </p>
              </div>
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                <button 
                  onClick={() => {
                    setDeleteConfirmId(null);
                    setDeleteReason('');
                  }} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => {
                    if (deleteReason.trim() === '') {
                      showToast('error', 'Por favor, informe o motivo da exclusão.');
                      return;
                    }
                    deleteMovement(target.id, deleteReason.trim());
                    showToast('success', `Registro do veículo ${target.plate} excluído com sucesso!`);
                    setDeleteConfirmId(null);
                    setDeleteReason('');
                  }} 
                  disabled={deleteReason.trim() === ''}
                  className={`px-5 py-2 rounded text-xs font-bold uppercase tracking-widest shadow-sm transition-colors ${
                    deleteReason.trim() === ''
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-rose-600 hover:bg-rose-700 text-white cursor-pointer'
                  }`}
                >
                  Confirmar Exclusão
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Temporary Exit Modal (Almoço / Oficina) */}
      {tempExitTargetId && tempExitType && (() => {
        const target = movements.find(m => m.id === tempExitTargetId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="text-blue-600" size={16} /> Saída Temporária ({tempExitType === 'almoco' ? 'Almoço 🍽️' : 'Oficina 🔧'})
                </span>
                <button 
                  onClick={() => {
                    setTempExitTargetId(null);
                    setTempExitType(null);
                    setTempExitDriver('');
                  }} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm font-medium text-slate-600 mb-3 text-center font-sans">
                  Confirme a saída temporária do veículo para <strong className="text-blue-700 font-extrabold">{tempExitType === 'almoco' ? 'Almoço' : 'Oficina'}</strong>.
                </p>
                
                <div className="bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Veículo / Placa</p>
                  <p className="text-lg font-mono font-bold text-slate-800 tracking-wider mb-2">{target.plate}</p>
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Condutor Atual</p>
                  <p className="text-xs font-bold text-slate-700 mb-3">{target.driver}</p>

                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Selecionar Motorista para esta Ação *
                  </label>
                  <select
                    value={tempExitDriver}
                    onChange={(e) => setTempExitDriver(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 font-semibold text-slate-700"
                  >
                    <option value="">-- Selecione o Motorista --</option>
                    {target.driver && !registeredDrivers.some(d => d.name.toLowerCase() === target.driver.toLowerCase()) && (
                      <option value={target.driver}>{target.driver} (Atual)</option>
                    )}
                    {registeredDrivers
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(d => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.driverType === 'interno' ? 'Frota/Próprio' : 'Cliente'})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <p className="text-[10px] text-slate-400 font-semibold text-center uppercase tracking-wider leading-relaxed">
                  💡 Se outra pessoa for levar o veículo, altere o motorista acima para que fique devidamente vinculado a esta movimentação.
                </p>
              </div>
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                <button 
                  onClick={() => {
                    setTempExitTargetId(null);
                    setTempExitType(null);
                    setTempExitDriver('');
                  }} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleConfirmTempExit(target.id, tempExitType, tempExitDriver)} 
                  disabled={!tempExitDriver.trim()}
                  className={`px-5 py-2 rounded text-xs font-bold uppercase tracking-widest shadow-sm transition-colors ${
                    !tempExitDriver.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-blue-600 hover:bg-blue-700 text-white cursor-pointer'
                  }`}
                >
                  Confirmar Saída
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Temporary Return Modal (Almoço / Oficina) */}
      {tempReturnTargetId && (() => {
        const target = movements.find(m => m.id === tempReturnTargetId);
        if (!target) return null;
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm">
            <div className="bg-white border border-slate-200 rounded-xl shadow-2xl max-w-md w-full overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-2">
                  <AlertCircle className="text-emerald-600" size={16} /> Confirmar Retorno ({target.gateStatus === 'ausente_almoco' ? 'Almoço 🍽️' : 'Oficina 🔧'})
                </span>
                <button 
                  onClick={() => {
                    setTempReturnTargetId(null);
                    setTempReturnDriver('');
                  }} 
                  className="text-slate-400 hover:text-slate-600"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="p-5">
                <p className="text-sm font-medium text-slate-600 mb-3 text-center font-sans">
                  Confirme o retorno do veículo do <strong className="text-emerald-700 font-extrabold">{target.gateStatus === 'ausente_almoco' ? 'Almoço' : 'Oficina'}</strong> ao pátio.
                </p>
                
                <div className="bg-slate-50 border border-slate-200 rounded-lg py-3 px-4 mb-4">
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Veículo / Placa</p>
                  <p className="text-lg font-mono font-bold text-slate-800 tracking-wider mb-2">{target.plate}</p>
                  
                  <p className="text-[10px] font-bold text-slate-400 uppercase mb-1">Último Condutor Registrado</p>
                  <p className="text-xs font-bold text-slate-700 mb-3">{target.driver}</p>

                  <label className="block text-[10px] font-extrabold text-slate-500 uppercase tracking-wider mb-1">
                    Selecionar Motorista para o Retorno *
                  </label>
                  <select
                    value={tempReturnDriver}
                    onChange={(e) => setTempReturnDriver(e.target.value)}
                    className="w-full text-xs p-2.5 bg-white border border-slate-300 rounded focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 font-semibold text-slate-700"
                  >
                    <option value="">-- Selecione o Motorista --</option>
                    {target.driver && !registeredDrivers.some(d => d.name.toLowerCase() === target.driver.toLowerCase()) && (
                      <option value={target.driver}>{target.driver} (Atual)</option>
                    )}
                    {registeredDrivers
                      .sort((a, b) => a.name.localeCompare(b.name))
                      .map(d => (
                        <option key={d.id} value={d.name}>
                          {d.name} ({d.driverType === 'interno' ? 'Frota/Próprio' : 'Cliente'})
                        </option>
                      ))
                    }
                  </select>
                </div>

                <p className="text-[10px] text-slate-400 font-semibold text-center uppercase tracking-wider leading-relaxed">
                  💡 Se outra pessoa estiver retornando com o veículo, altere o motorista acima para manter o registro correto no pátio.
                </p>
              </div>
              <div className="bg-slate-50 px-4 py-3 border-t border-slate-200 flex justify-end gap-2">
                <button 
                  onClick={() => {
                    setTempReturnTargetId(null);
                    setTempReturnDriver('');
                  }} 
                  className="px-4 py-2 text-xs font-bold text-slate-500 hover:text-slate-700 uppercase tracking-widest"
                >
                  Cancelar
                </button>
                <button 
                  onClick={() => handleConfirmTempReturn(target.id, tempReturnDriver)} 
                  disabled={!tempReturnDriver.trim()}
                  className={`px-5 py-2 rounded text-xs font-bold uppercase tracking-widest shadow-sm transition-colors ${
                    !tempReturnDriver.trim()
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed opacity-50'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                  }`}
                >
                  Confirmar Retorno
                </button>
              </div>
            </div>
          </div>
        );
      })()}

      {/* Tabs */}
      <div className="flex bg-slate-200/80 rounded border border-slate-200 self-start p-1 shrink-0 overflow-x-auto max-w-full">
        <button
          className={`px-4 py-1.5 text-xs font-bold uppercase rounded-sm transition-colors whitespace-nowrap ${view === 'entrada' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setView('entrada')}
        >
          REGISTRAR ENTRADA
        </button>
        <button
          className={`px-4 py-1.5 text-xs font-bold uppercase rounded-sm transition-colors whitespace-nowrap ${view === 'saida' ? 'bg-white shadow text-slate-800' : 'text-slate-500 hover:text-slate-700'}`}
          onClick={() => setView('saida')}
        >
          REGISTRAR SAÍDA
        </button>
      </div>

      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 rounded-lg text-xs font-semibold flex items-center gap-2 shrink-0">
          <AlertCircle size={16} className="text-amber-600 shrink-0" />
          <span><strong>Perfil de Visualização:</strong> Você não possui permissão para efetivar entradas, saídas ou autorizar o trânsito temporário de veículos.</span>
        </div>
      )}

      {view === 'entrada' ? (
        <section className="bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm shrink-0">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex justify-between items-center">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Formulário de Entrada & Inspeção Rápida</h2>
          </div>
          <div className="p-4">
            <form onSubmit={handleEntradaSubmit} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                
                <div className="space-y-4 col-span-1 md:col-span-2">
                  <div className="flex gap-2 border-b border-slate-100 pb-2">
                    <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Dados do Veículo & Frota</span>
                  </div>
                  
                  {/* Quick-Select Helpers for Pre-Registered Own Fleet & Drivers */}
                  <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 space-y-2.5 shadow-xs">
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest flex items-center gap-1.5">
                        <Truck size={12} className="text-blue-500" /> Atalhos Pré-Cadastrados
                      </span>
                    </div>

                    {/* Integrated Search Inputs */}
                    <div className="grid grid-cols-3 gap-2 pb-1.5 border-b border-slate-200">
                      <div>
                        <input 
                          type="text" 
                          placeholder="Filtro Placa..." 
                          value={filterPlate} 
                          onChange={e => setFilterPlate(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded text-[10px] p-1 outline-none font-mono focus:border-blue-400 shadow-xs"
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          placeholder="Filtro Motorista..." 
                          value={filterDriver} 
                          onChange={e => setFilterDriver(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded text-[10px] p-1 outline-none focus:border-blue-400 shadow-xs"
                        />
                      </div>
                      <div>
                        <input 
                          type="text" 
                          placeholder="Filtro Cliente..." 
                          value={filterClient} 
                          onChange={e => setFilterClient(e.target.value)}
                          className="w-full bg-white border border-slate-200 rounded text-[10px] p-1 outline-none focus:border-blue-400 shadow-xs"
                        />
                      </div>
                    </div>

                    <div className="space-y-2">
                      <div>
                        <span className="block text-[8px] font-bold text-slate-500 mb-1 uppercase text-slate-400">Atalhos de Veículos ({filteredPreRegistered.length}):</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto">
                          {filteredPreRegistered.map(pv => (
                            <button
                              key={pv.id}
                              type="button"
                              onClick={() => selectPreRegistered(pv.plate, pv.vehicleType, pv.ownerType)}
                              className="text-[9px] bg-white border border-slate-200 hover:border-blue-400 font-mono font-bold text-slate-700 px-2 py-0.5 rounded transition-all shadow-xs"
                              title={pv.model ? `${pv.model} (${pv.ownerType === 'proprio' ? 'Próprio' : 'Terceiro'})` : `(${pv.ownerType === 'proprio' ? 'Próprio' : 'Terceiro'})`}
                            >
                              {pv.plate}
                            </button>
                          ))}
                          {filteredPreRegistered.length === 0 && (
                            <span className="text-[9px] text-slate-400 italic">Nenhum veículo próprio encontrado.</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold text-slate-500 mb-1 uppercase text-slate-400">Motoristas Corporativos ({filteredCompanyDrivers.length}):</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto animate-in">
                          {filteredCompanyDrivers.map(cd => (
                            <button
                              key={cd.id}
                              type="button"
                              onClick={() => selectDriver(cd.name)}
                              className="text-[9px] bg-white border border-slate-200 hover:border-blue-400 font-medium text-slate-600 px-2 py-0.5 rounded transition-all shadow-xs"
                            >
                              + {cd.name.split(' ')[0]}
                            </button>
                          ))}
                          {filteredCompanyDrivers.length === 0 && (
                            <span className="text-[9px] text-slate-400 italic">Nenhum motorista corporativo encontrado.</span>
                          )}
                        </div>
                      </div>
                      <div>
                        <span className="block text-[8px] font-bold text-slate-500 mb-1 uppercase text-slate-400">Clientes Cadastrados ({filteredCompanyClients.length}):</span>
                        <div className="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto animate-in">
                          {filteredCompanyClients.map(cli => (
                            <button
                              key={cli.id}
                              type="button"
                              onClick={() => selectClient(cli)}
                              className="text-[9px] bg-white border border-slate-200 hover:border-blue-400 font-medium text-slate-650 px-2 py-0.5 rounded transition-all shadow-xs"
                            >
                              + {cli.name.split(' ')[0]}
                            </button>
                          ))}
                          {filteredCompanyClients.length === 0 && (
                            <span className="text-[9px] text-slate-400 italic">Nenhum cliente pré-cadastrado.</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PLACA</label>
                      <input 
                        required 
                        placeholder="ABC-1234" 
                        value={plate} 
                        onChange={e => handlePlateChange(e.target.value)} 
                        list="registered-plates"
                        className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 uppercase font-mono shadow-sm" 
                      />
                      {(() => {
                        const matchedVeh = (registeredVehicles || []).find(v => (v?.plate || '').toUpperCase() === (plate || '').toUpperCase().trim());
                        const isAlreadyActive = (plate || '').trim() !== '' && (activeVehicles || []).some(m => (m?.plate || '').toUpperCase().trim() === (plate || '').toUpperCase().trim());
                        
                        return (
                          <div className="flex flex-col gap-1 mt-1">
                            {matchedVeh && matchedVeh.model && matchedVeh.model.trim() && (
                              <span className="text-[10px] text-blue-600 font-bold bg-blue-50 px-2 py-0.5 rounded border border-blue-100 uppercase self-start">
                                Modelo: {matchedVeh.model}
                              </span>
                            )}
                            {isAlreadyActive && (
                              <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-2 py-1 rounded border border-rose-100 uppercase flex items-center gap-1.5 self-start shadow-xs animate-pulse">
                                <AlertCircle size={12} />
                                Já está no pátio (Entrada Bloqueada)
                              </span>
                            )}
                          </div>
                        );
                      })()}
                      <datalist id="registered-plates">
                        {registeredVehicles.map(v => (
                          <option key={v.id} value={v.plate}>
                            {v.model && v.model.trim() ? v.model : ''}
                          </option>
                        ))}
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CONDUTOR</label>
                      <input 
                        required 
                        placeholder="Nome do Motorista" 
                        value={driver} 
                        onChange={e => handleDriverChange(e.target.value)} 
                        list="company-drivers"
                        className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm" 
                      />
                      <datalist id="company-drivers">
                        {registeredDrivers.map(d => (
                          <option key={d.id} value={d.name} />
                        ))}
                      </datalist>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">PROPRIEDADE</label>
                      <select value={ownerType} onChange={e => setOwnerType(e.target.value as OwnerType)} className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm">
                        <option value="terceiro">Terceiro (Transportador)</option>
                        <option value="proprio">Frota Própria (Empresa)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CATEGORIA</label>
                      <select value={vehicleType} onChange={e => handleVehicleTypeChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm">
                        {customVehicleCategories.map(cat => (
                          <option key={cat.id} value={cat.id}>
                            {cat.name} {cat.bypassProductionDefault ? '(Desvia)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">FINALIDADE DA ENTRADA</label>
                      <select value={entryPurpose} onChange={e => handlePurposeChange(e.target.value)} className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm">
                        {customEntryPurposes.map(purp => (
                          <option key={purp.id} value={purp.id}>
                            {purp.name} {purp.bypassProductionDefault ? '(Desvia)' : ''}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">DESVIO DE FILA</label>
                      <div className="flex items-center h-9 bg-slate-50 border border-slate-200 rounded px-3.5 shadow-sm">
                        <input
                          type="checkbox"
                          id="bypass"
                          checked={bypassProduction}
                          onChange={e => setBypassProduction(e.target.checked)}
                          className="w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="bypass" className="ml-2.5 text-xs font-bold text-slate-700 select-none uppercase tracking-wide cursor-pointer">
                          Ignorar Fila de Produção
                        </label>
                      </div>
                    </div>
                  </div>

                  {entryPurpose === 'linha_descartavel' && (
                    <div className="p-3 bg-amber-50/90 border border-amber-200/90 rounded-xl text-xs text-amber-950 flex items-start gap-2.5 shadow-xs">
                      <Boxes size={18} className="text-amber-600 shrink-0 mt-0.5" />
                      <div className="space-y-0.5">
                        <p className="font-extrabold uppercase tracking-tight text-[11px] text-amber-900">📦 Finalidade: Apenas Linha Descartável</p>
                        <p className="text-[11px] text-amber-800 leading-relaxed font-medium">
                          Este veículo registrará entrada no pátio ativo da empresa para carregamento/expedição de produtos descartáveis, mas <strong>NÃO entrará na fila de produção de garrafões/retornável</strong>.
                        </p>
                      </div>
                    </div>
                  )}

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">CLIENTE (OPCIONAL)</label>
                      <input 
                        placeholder="Nome/Razão Social do Cliente" 
                        value={client} 
                        onChange={e => {
                          const val = e.target.value;
                          setClient(val);
                          const matchedCli = (registeredClients || []).find(c => (c?.name || '').toLowerCase() === (val || '').toLowerCase().trim());
                          if (matchedCli) {
                            selectClient(matchedCli);
                          }
                        }}
                        list="registered-clients"
                        className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm font-semibold text-slate-700" 
                      />
                      <datalist id="registered-clients">
                        {registeredClients
                          .filter(c => !!c.comprasNaEmpresa)
                          .sort((a, b) => {
                            const codeA = parseInt(a.codigo || '', 10);
                            const codeB = parseInt(b.codigo || '', 10);
                            const isANum = !isNaN(codeA) && /^\d+$/.test((a.codigo || '').trim());
                            const isBNum = !isNaN(codeB) && /^\d+$/.test((b.codigo || '').trim());
                            if (isANum && isBNum) {
                              return codeA - codeB;
                            }
                            if (isANum) return -1;
                            if (isBNum) return 1;
                            const valA = a.codigo || '';
                            const valB = b.codigo || '';
                            if (valA || valB) {
                              return valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
                            }
                            return a.name.localeCompare(b.name);
                          })
                          .map(c => (
                            <option key={c.id} value={c.name} />
                          ))}
                      </datalist>
                    </div>

                    {!bypassProduction && (
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">MÉDIA DE VASILHAMES (OPCIONAL)</label>
                        <input 
                          type="number" 
                          min="0"
                          placeholder="Média estimada para a fila (Ex: 50)" 
                          value={avgVasilhames} 
                          onChange={e => setAvgVasilhames(e.target.value !== '' ? Number(e.target.value) : '')} 
                          className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono shadow-sm" 
                        />
                        <span className="text-[9px] text-slate-400 block mt-1">
                          Média cadastrada para previsão de tempo na fila de produção.
                        </span>
                      </div>
                    )}
                  </div>

                  {ownerType === 'proprio' && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">ODÔMETRO (KM) (OPCIONAL)</label>
                        <input type="number" placeholder="Digite a KM atual (opcional)" value={odometer} onChange={e => setOdometer(e.target.value !== '' ? Number(e.target.value) : '')} className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 font-mono shadow-sm" />
                      </div>
                      <div className="hidden sm:block"></div>
                    </div>
                  )}
                </div>
              </div>

              <div className="pt-4 border-t border-slate-100 flex justify-end">
                <button
                  type="submit"
                  disabled={isReadOnly}
                  className={`text-white text-xs font-bold px-6 py-2.5 rounded shadow-sm transition-colors uppercase tracking-widest ${
                    isReadOnly 
                      ? 'bg-slate-300 cursor-not-allowed text-slate-500' 
                      : 'bg-blue-600 hover:bg-blue-700 cursor-pointer'
                  }`}
                >
                  Autorizar Entrada
                </button>
              </div>
            </form>
          </div>
        </section>
      ) : (
        <section className="bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm flex-1 min-h-[350px]">
          <div className="bg-slate-50 px-4 py-3 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2 shrink-0">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight">Controle de Saída - Pátio Ativo</h2>
            
            {/* Search active yard filters */}
            <div className="flex gap-2">
              <input 
                type="text" 
                placeholder="Filtrar Placa..." 
                value={searchPlate} 
                onChange={e => setSearchPlate(e.target.value)}
                className="bg-white border border-slate-200 font-mono text-[11px] px-2.5 py-1 rounded outline-none focus:border-blue-400 shadow-sm"
              />
              <input 
                type="text" 
                placeholder="Filtrar Motorista..." 
                value={searchDriver} 
                onChange={e => setSearchDriver(e.target.value)}
                className="bg-white border border-slate-200 text-[11px] px-2.5 py-1 rounded outline-none focus:border-blue-400 shadow-sm"
              />
            </div>
          </div>
          <div className="p-4 flex-1 overflow-auto flex flex-col gap-2">
            {filteredActiveVehicles.length === 0 ? (
              <div className="text-center py-12 text-xs font-bold uppercase tracking-widest text-slate-400 border border-dashed border-slate-200 bg-slate-50 rounded">
                Sem correspondências no pátio ativo
              </div>
            ) : (
              filteredActiveVehicles.map(v => (
                <div key={v.id} className="flex flex-col sm:flex-row items-center justify-between p-3 border rounded shadow-sm hover:border-blue-300 bg-white border-slate-200 transition-colors">
                  <div className="w-full sm:w-auto text-left mb-2 sm:mb-0">
                    <div className="flex gap-2 flex-wrap items-center mb-0.5">
                      <p className="font-bold text-sm text-slate-800 font-mono tracking-tight">{v.plate}</p>
                      <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                        v.ownerType === 'proprio' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-150 text-slate-700 border border-slate-200'
                      }`}>{v.ownerType === 'proprio' ? 'Própria' : 'Terceira'}</span>
                      {v.ownerType === 'proprio' && (
                        isSettlementDone(v.id) ? (
                          <span className="text-[9px] bg-emerald-50 text-emerald-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border border-emerald-200">
                            ✅ Acerto Realizado
                          </span>
                        ) : (
                          <span className="text-[9px] bg-rose-50 text-rose-700 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border border-rose-200 animate-pulse">
                            ⚠️ Acerto Pendente
                          </span>
                        )
                      )}
                      <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                        {customVehicleCategories.find(c => c.id === v.vehicleType)?.name || v.vehicleType}
                      </span>
                      {v.bypassProduction && (
                        <span className="text-[9px] bg-purple-100 text-purple-700 font-bold px-1.5 py-0.5 rounded uppercase tracking-widest border border-purple-200">
                          {v.purpose === 'producao' ? 'Visitante' : (customEntryPurposes.find(p => p.id === v.purpose)?.name || v.purpose)}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 line-clamp-1 col-span-2">Condutor: {v.driver} {v.odometer ? ` | KM: ${v.odometer}` : ''}</p>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider">Cliente:</span>
                      <InlineClientEditor vehicleId={v.id} initialClient={v.client || ''} />
                    </div>
                  </div>
                  <div className="w-full sm:w-auto flex flex-wrap items-center justify-between sm:justify-end gap-3 border-t border-slate-100 pt-2 sm:border-0 sm:pt-0">
                    <p className="text-[10px] font-bold tracking-widest uppercase text-slate-400">
                      STATUS: <span className="text-slate-600 font-extrabold uppercase">
                        {v.bypassProduction ? 'Visita/Serviço' : (v.kanbanStep ? v.kanbanStep.replace('_', ' ') : v.status.replace('_', ' '))}
                      </span>
                    </p>
                    
                    <div className="flex gap-1">
                      <button 
                        onClick={() => {
                          if (isReadOnly) {
                            showToast('error', 'Acesso Restrito: Usuários com perfil de visualização não podem realizar registros.');
                            return;
                          }
                          setTempExitTargetId(v.id);
                          setTempExitType('almoco');
                          setTempExitDriver(v.driver);
                        }}
                        disabled={isReadOnly}
                        className={`px-2 py-1.5 rounded text-[9px] font-extrabold transition-all uppercase tracking-wider flex items-center gap-0.5 ${
                          isReadOnly 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60' 
                            : 'bg-blue-50 text-blue-700 hover:bg-blue-100 border border-blue-200 cursor-pointer'
                        }`}
                        title="Registrar saída do pátio para almoço"
                      >
                        <span>🍽️ Almoço</span>
                      </button>
                      <button 
                        onClick={() => {
                          if (isReadOnly) {
                            showToast('error', 'Acesso Restrito: Usuários com perfil de visualização não podem realizar registros.');
                            return;
                          }
                          setTempExitTargetId(v.id);
                          setTempExitType('oficina');
                          setTempExitDriver(v.driver);
                        }}
                        disabled={isReadOnly}
                        className={`px-2 py-1.5 rounded text-[9px] font-extrabold transition-all uppercase tracking-wider flex items-center gap-0.5 ${
                          isReadOnly 
                            ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60' 
                            : 'bg-slate-50 text-slate-600 hover:bg-slate-100 border border-slate-200 cursor-pointer'
                        }`}
                        title="Registrar saída do pátio para oficina/manutenção"
                      >
                        <span>🔧 Oficina</span>
                      </button>

                      {(() => {
                        const blockReason = getDeletionBlockReason(v);
                        return (
                          <button 
                            onClick={() => {
                              if (blockReason) {
                                showToast('error', `Não é possível excluir: ${blockReason}`);
                                return;
                              }
                              setDeleteConfirmId(v.id);
                              setDeleteReason('');
                            }}
                            disabled={isReadOnly}
                            className={`px-2 py-1.5 rounded text-[9px] font-extrabold transition-all uppercase tracking-wider flex items-center gap-0.5 ${
                              isReadOnly
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                : blockReason
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed opacity-60'
                                : 'bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-200 cursor-pointer'
                            }`}
                            title={blockReason ? `Exclusão bloqueada: ${blockReason}` : "Excluir entrada do pátio (cancelar entrada)"}
                          >
                            <span>{blockReason ? '🔒 Bloqueado' : '🗑️ Excluir'}</span>
                          </button>
                        );
                      })()}
                    </div>

                    <button 
                      onClick={() => triggerSaidaConfirmation(v.id)} 
                      disabled={isReadOnly}
                      className={`px-4 py-2 rounded text-[10px] font-bold transition-all uppercase tracking-widest shadow-xs ${
                        isReadOnly 
                          ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                          : 'bg-slate-800 hover:bg-slate-700 text-white cursor-pointer'
                      }`}
                    >
                      Efetivar Saída
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </section>
      )}

      {/* Veículos em Trânsito Temporário (Aguardando Retorno - Almoço / Oficina) */}
      {view === 'saida' && (
        <section className="bg-white border border-slate-200 rounded-lg flex flex-col shadow-sm mt-4">
          <div className="bg-slate-55 bg-slate-50 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
            <h2 className="text-xs font-bold text-slate-700 uppercase tracking-tight flex items-center gap-1.5">
              <span>🚪 Veículos Fora do Pátio (Aguardando Retorno)</span>
              {temporaryExitedVehicles.length > 0 && (
                <span className="bg-blue-100 text-blue-800 text-[10px] font-extrabold px-2 py-0.5 rounded-full">
                  {temporaryExitedVehicles.length}
                </span>
              )}
            </h2>
          </div>
          <div className="p-4 flex flex-col gap-2">
            {temporaryExitedVehicles.length === 0 ? (
              <div className="text-center py-6 text-xs font-bold uppercase tracking-widest text-slate-400 border border-dashed border-slate-200 bg-slate-50 rounded">
                Nenhum veículo fora por almoço ou oficina no momento
              </div>
            ) : (
              temporaryExitedVehicles.map(v => {
                const isAlmoco = v.gateStatus === 'ausente_almoco';
                const activeEx = v.gateTemporaryExits && v.gateTemporaryExits.find(ex => !ex.returnedAt);
                const exitTime = activeEx ? activeEx.exitedAt : v.timestamp;
                return (
                  <div key={v.id} className="flex flex-col sm:flex-row items-center justify-between p-3 border border-slate-200 bg-slate-50/40 rounded shadow-xs hover:border-slate-300 transition-colors">
                    <div className="w-full sm:w-auto text-left mb-2 sm:mb-0">
                      <div className="flex gap-2 flex-wrap items-center mb-0.5">
                        <p className="font-bold text-sm text-slate-800 font-mono tracking-tight">{v.plate}</p>
                        <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded uppercase tracking-wider ${
                          v.ownerType === 'proprio' ? 'bg-blue-50 text-blue-700 border border-blue-100' : 'bg-slate-150 text-slate-700 border border-slate-200'
                        }`}>{v.ownerType === 'proprio' ? 'Própria' : 'Terceira'}</span>
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded uppercase tracking-wider">
                          {customVehicleCategories.find(c => c.id === v.vehicleType)?.name || v.vehicleType}
                        </span>
                        {isAlmoco ? (
                          <span className="text-[9px] bg-blue-100 text-blue-800 font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border border-blue-200 animate-pulse">
                            🍽️ Almoço
                          </span>
                        ) : (
                          <span className="text-[9px] bg-slate-600 text-white font-extrabold px-1.5 py-0.5 rounded uppercase tracking-wider border border-slate-650 animate-pulse">
                            🔧 Oficina
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 line-clamp-1">Condutor: {v.driver} {v.client ? ` | Cliente: ${v.client}` : ''}</p>
                      {exitTime && (
                        <p className="text-[10px] text-slate-400 font-mono mt-0.5">Saída às: {new Date(exitTime).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })}</p>
                      )}
                    </div>
                    <div className="w-full sm:w-auto flex items-center justify-between sm:justify-end gap-3">
                      <button 
                        onClick={() => {
                          if (isReadOnly) {
                            showToast('error', 'Acesso Restrito: Usuários com perfil de visualização não podem realizar registros.');
                            return;
                          }
                          setTempReturnTargetId(v.id);
                          setTempReturnDriver(v.driver);
                        }}
                        disabled={isReadOnly}
                        className={`px-4 py-2 rounded text-[10px] font-bold transition-all uppercase tracking-widest shadow-xs flex items-center gap-1 w-full sm:w-auto justify-center ${
                          isReadOnly 
                            ? 'bg-slate-200 text-slate-400 cursor-not-allowed' 
                            : 'bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer'
                        }`}
                        title="Registrar retorno do veículo"
                      >
                        <span>Confirmar Retorno ⏎</span>
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>
      )}
    </div>
  );
};

