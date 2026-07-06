import React, { useState } from 'react';
import { useStore, normalizeOccurrenceTypeName, cleanOccurrenceTypeName } from '../store';
import { RegisteredVehicle, RegisteredDriver, VehicleType, OwnerType, RegisteredClient } from '../types';
import { Plus, Trash2, Truck, UserCheck, Search, Tag, AlertCircle, Users, Briefcase, XCircle, Edit, Check, X } from 'lucide-react';

export const Cadastros: React.FC = () => {
  const {
    registeredVehicles = [],
    registeredDrivers = [],
    registeredClients = [],
    addRegisteredVehicle,
    removeRegisteredVehicle,
    addRegisteredDriver,
    removeRegisteredDriver,
    updateRegisteredDriver,
    addRegisteredClient,
    removeRegisteredClient,
    updateRegisteredClient,
    customVehicleCategories = [],
    customEntryPurposes = [],
    addCustomVehicleCategory,
    removeCustomVehicleCategory,
    addCustomEntryPurpose,
    removeCustomEntryPurpose,
    companyLogo,
    setCompanyLogo,
    clearDatabase,
    movements = [],
    updateRegisteredVehicleDriver,
    updateRegisteredVehicle,
    currentUser,
    customAvariaTypes = [],
    addCustomAvariaType,
    removeCustomAvariaType,
    updateCustomAvariaType,
  } = useStore();

  const isReadOnly = currentUser?.role === 'visualizador';

  // Custom Occurrence Form State (Avarias / +Compra)
  const [newOccurrenceName, setNewOccurrenceName] = useState('');
  const [newOccurrenceType, setNewOccurrenceType] = useState<'avaria' | 'compra'>('avaria');
  const [newOccurrenceClassification, setNewOccurrenceClassification] = useState<'descarregamento' | 'carregamento' | 'ambos'>('ambos');
  const [newOccurrenceOrigin, setNewOccurrenceOrigin] = useState<'frota_propria' | 'cliente'>('frota_propria');
  const [newOccurrenceDeductDriver, setNewOccurrenceDeductDriver] = useState<boolean>(true);
  const [activeOccurrenceTab, setActiveOccurrenceTab] = useState<'frota_propria' | 'cliente'>('frota_propria');

  // Inline Editing State for Occurrences
  const [editingOccurrenceId, setEditingOccurrenceId] = useState<string | null>(null);
  const [editingOccurrenceName, setEditingOccurrenceName] = useState('');
  const [editingOccurrenceClassification, setEditingOccurrenceClassification] = useState<'descarregamento' | 'carregamento' | 'ambos'>('ambos');

  // Vehicle Form State
  const [vehiclePlate, setVehiclePlate] = useState('');
  const [vehicleType, setVehicleType] = useState<VehicleType>('carreta');
  const [vehicleOwnerType, setVehicleOwnerType] = useState<OwnerType>('proprio');
  const [vehicleModel, setVehicleModel] = useState('');
  const [defaultDriverId, setDefaultDriverId] = useState('');
  const [vehicleAverageVasilhames, setVehicleAverageVasilhames] = useState('');

  // Fallback default vehicle type to first valid category if list exists
  React.useEffect(() => {
    if (customVehicleCategories.length > 0 && !customVehicleCategories.some(c => c.id === vehicleType)) {
      setVehicleType(customVehicleCategories[0].id);
    }
  }, [customVehicleCategories]);

  // Driver Form State
  const [driverName, setDriverName] = useState('');
  const [driverType, setDriverType] = useState<'interno' | 'cliente'>('interno');
  const [driverCommissionPercent, setDriverCommissionPercent] = useState<number>(8);
  const [driverDamageToleranceQty, setDriverDamageToleranceQty] = useState<number>(0);
  const [editingDriverId, setEditingDriverId] = useState<string>('');
  const [editingDriverName, setEditingDriverName] = useState<string>('');
  const [editingDriverCommissionPercent, setEditingDriverCommissionPercent] = useState<number>(8);
  const [editingDriverDamageToleranceQty, setEditingDriverDamageToleranceQty] = useState<number>(0);

  // Vehicle Editing State
  const [editingVehicleId, setEditingVehicleId] = useState<string>('');
  const [editingVehiclePlate, setEditingVehiclePlate] = useState<string>('');
  const [editingVehicleType, setEditingVehicleType] = useState<VehicleType>('carreta');

  // Client Form State
  const [clientName, setClientName] = useState('');
  const [clientVehicleIds, setClientVehicleIds] = useState<string[]>([]);
  const [clientDriverIds, setClientDriverIds] = useState<string[]>([]);
  const [editingClientId, setEditingClientId] = useState<string>('');
  const [editingClientName, setEditingClientName] = useState<string>('');

  // Expanded Client Form States
  const [clientCode, setClientCode] = useState('');
  const [clientApelido, setClientApelido] = useState('');
  const [clientPersonType, setClientPersonType] = useState<'fisica' | 'juridica'>('fisica');
  const [clientRgIe, setClientRgIe] = useState('');
  const [clientCpfCnpj, setClientCpfCnpj] = useState('');
  const [clientEndereco, setClientEndereco] = useState('');
  const [clientNumero, setClientNumero] = useState('');
  const [clientBairro, setClientBairro] = useState('');
  const [clientComplemento, setClientComplemento] = useState('');
  const [clientCidade, setClientCidade] = useState('');
  const [clientUf, setClientUf] = useState('');
  const [clientDdd, setClientDdd] = useState('');
  const [clientTelefone, setClientTelefone] = useState('');
  const [clientComprasNaEmpresa, setClientComprasNaEmpresa] = useState(false);

  // Editing Client detailed fields states
  const [editingClientCode, setEditingClientCode] = useState('');
  const [editingClientApelido, setEditingClientApelido] = useState('');
  const [editingClientPersonType, setEditingClientPersonType] = useState<'fisica' | 'juridica'>('fisica');
  const [editingClientRgIe, setEditingClientRgIe] = useState('');
  const [editingClientCpfCnpj, setEditingClientCpfCnpj] = useState('');
  const [editingClientEndereco, setEditingClientEndereco] = useState('');
  const [editingClientNumero, setEditingClientNumero] = useState('');
  const [editingClientBairro, setEditingClientBairro] = useState('');
  const [editingClientComplemento, setEditingClientComplemento] = useState('');
  const [editingClientCidade, setEditingClientCidade] = useState('');
  const [editingClientUf, setEditingClientUf] = useState('');
  const [editingClientDdd, setEditingClientDdd] = useState('');
  const [editingClientTelefone, setEditingClientTelefone] = useState('');
  const [editingClientComprasNaEmpresa, setEditingClientComprasNaEmpresa] = useState(false);

  // Config Expansion Panel State
  const [showConfigPanel, setShowConfigPanel] = useState(false);

  // Search/Filters State
  const [searchVehicleQuery, setSearchVehicleQuery] = useState('');
  const [searchDriverQuery, setSearchDriverQuery] = useState('');
  const [searchClientQuery, setSearchClientQuery] = useState('');
  const [filterOnlyCompanyClients, setFilterOnlyCompanyClients] = useState(false);

  // Form Warnings/Success State
  const [vehicleSuccess, setVehicleSuccess] = useState('');
  const [vehicleError, setVehicleError] = useState('');
  const [driverSuccess, setDriverSuccess] = useState('');
  const [driverError, setDriverError] = useState('');
  const [clientSuccess, setClientSuccess] = useState('');
  const [clientError, setClientError] = useState('');

  // Helpers for friendly types
  const getVehicleTypeLabel = (type: VehicleType) => {
    const found = customVehicleCategories.find(c => c.id === type);
    if (found) return found.name;
    switch (type) {
      case 'carreta': return 'Carreta';
      case 'truck': return 'Truck';
      case 'toco': return 'Toco';
      case '3/4': return 'Caminhão 3/4';
      case 'passeio': return 'Carro Passeio';
      case 'moto': return 'Motocicleta';
      case 'utilitario': return 'Utilitário / Van';
      default: return type;
    }
  };

  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setVehicleError('');
    setVehicleSuccess('');

    const formattedPlate = vehiclePlate.trim().toUpperCase();
    if (!formattedPlate) {
      setVehicleError('A placa do veículo é obrigatória.');
      return;
    }

    // Basic plate format length validation
    if (formattedPlate.length < 5) {
      setVehicleError('Insira uma placa de veículo válida.');
      return;
    }

    // Check duplicate
    const exists = registeredVehicles.some(v => v.plate.toUpperCase() === formattedPlate);
    if (exists) {
      setVehicleError(`O veículo de placa ${formattedPlate} já está pré-cadastrado.`);
      return;
    }

    if (defaultDriverId) {
      const alreadyLinked = registeredVehicles.some(v => v.defaultDriverId === defaultDriverId);
      if (alreadyLinked) {
        setVehicleError('Este motorista já está vinculado a outro veículo.');
        return;
      }
    }

    const avgVasilhames = vehicleAverageVasilhames.trim() ? parseInt(vehicleAverageVasilhames, 10) : undefined;
    if (avgVasilhames !== undefined && (isNaN(avgVasilhames) || avgVasilhames < 0)) {
      setVehicleError('A média de vasilhames deve ser um número inteiro válido maior ou igual a zero.');
      return;
    }

    const newVehicle: RegisteredVehicle = {
      id: 'veh-' + Date.now().toString(36),
      plate: formattedPlate,
      vehicleType,
      ownerType: vehicleOwnerType,
      model: vehicleModel.trim() || undefined,
      defaultDriverId: defaultDriverId || undefined,
      averageVasilhames: avgVasilhames
    };

    addRegisteredVehicle(newVehicle);
    setVehiclePlate('');
    setVehicleModel('');
    setDefaultDriverId('');
    setVehicleAverageVasilhames('');
    setVehicleSuccess('Veículo pré-cadastrado com sucesso!');
    setTimeout(() => setVehicleSuccess(''), 3000);
  };

  const handleCreateDriver = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setDriverError('');
    setDriverSuccess('');

    const formattedName = driverName.trim();
    if (!formattedName) {
      setDriverError('O nome do motorista é obrigatório.');
      return;
    }

    // Check duplicate
    const exists = registeredDrivers.some(d => d.name.toLowerCase() === formattedName.toLowerCase());
    if (exists) {
      setDriverError(`O motorista "${formattedName}" já está cadastrado.`);
      return;
    }

    const newDriver: RegisteredDriver = {
      id: 'drv-' + Date.now().toString(36),
      name: formattedName,
      driverType: driverType,
      commissionPercent: driverType === 'interno' ? driverCommissionPercent : undefined,
      damageToleranceQty: driverType === 'interno' ? driverDamageToleranceQty : undefined
    };

    addRegisteredDriver(newDriver);
    setDriverName('');
    setDriverCommissionPercent(8);
    setDriverDamageToleranceQty(0);
    setDriverSuccess('Motorista cadastrado com sucesso!');
    setTimeout(() => setDriverSuccess(''), 3000);
  };

  // Logo Settings State
  const [logoInput, setLogoInput] = useState(companyLogo || '');

  // Sync state if store updates
  React.useEffect(() => {
    if (companyLogo && companyLogo !== logoInput) {
      setLogoInput(companyLogo);
    }
  }, [companyLogo]);

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const img = new Image();
        img.onload = () => {
          // Calculate optimized dimensions preserving aspect ratio
          // Max width 350px, Max height 120px (perfect for reports and layouts)
          let width = img.width;
          let height = img.height;
          const maxWidth = 350;
          const maxHeight = 120;
          
          if (width > maxWidth) {
            height = Math.round((height * maxWidth) / width);
            width = maxWidth;
          }
          if (height > maxHeight) {
            width = Math.round((width * maxHeight) / height);
            height = maxHeight;
          }
          
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            
            // Compress image based on type (use PNG for transparent, JPEG for standard photos to maximize compression)
            const mimeType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
            const quality = mimeType === 'image/jpeg' ? 0.85 : undefined;
            const compressedBase64 = canvas.toDataURL(mimeType, quality);
            
            setLogoInput(compressedBase64);
            setCompanyLogo(compressedBase64);
          }
        };
        img.src = event.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSaveLogoLink = () => {
    if (isReadOnly) return;
    setCompanyLogo(logoInput);
  };

  const handleRemoveLogo = () => {
    if (isReadOnly) return;
    setLogoInput('');
    setCompanyLogo('');
  };

  // Custom Category Form State
  const [newCatName, setNewCatName] = useState('');
  const [newCatBypass, setNewCatBypass] = useState(false);

  // Custom Purpose Form State
  const [newPurpName, setNewPurpName] = useState('');
  const [newPurpBypass, setNewPurpBypass] = useState(false);

  // Clear Database confirm states
  const [showClearConfirm, setShowClearConfirm] = useState(false);
  const [clearConfirmText, setClearConfirmText] = useState('');

  const handleClearDatabase = () => {
    if (clearConfirmText.toUpperCase() === 'ZERAR') {
      clearDatabase();
      setShowClearConfirm(false);
      setClearConfirmText('');
      alert('Toda a base de movimentações e abastecimentos foi limpa com sucesso!');
    } else {
      alert('Por favor, digite ZERAR em letras maiúsculas para confirmar a limpeza.');
    }
  };

  const handleAddCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!newCatName.trim()) return;

    // Check duplicate
    const catName = newCatName.trim();
    if (customVehicleCategories.some(c => c.name.toLowerCase() === catName.toLowerCase())) {
      alert('Essa categoria de veículo já está registrada.');
      return;
    }

    const catId = 'cat-' + Date.now().toString(36);
    addCustomVehicleCategory({
      id: catId,
      name: catName,
      bypassProductionDefault: newCatBypass
    });
    setNewCatName('');
    setNewCatBypass(false);
  };

  const handleAddOccurrence = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    const name = newOccurrenceName.trim();
    if (!name) return;

    const finalName = cleanOccurrenceTypeName(name);

    if (customAvariaTypes.some(t => cleanOccurrenceTypeName(t.type).toLowerCase().trim() === finalName.toLowerCase().trim())) {
      alert('Esta ocorrência já está pré-cadastrada.');
      return;
    }

    const isDeduct = newOccurrenceOrigin === 'frota_propria' ? newOccurrenceDeductDriver : false;
    addCustomAvariaType(finalName, newOccurrenceClassification, newOccurrenceType, newOccurrenceOrigin, isDeduct);
    setNewOccurrenceName('');
    setNewOccurrenceClassification('ambos');
  };

  const handleAddPurpose = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    if (!newPurpName.trim()) return;

    // Check duplicate
    const purpName = newPurpName.trim();
    if (customEntryPurposes.some(p => p.name.toLowerCase() === purpName.toLowerCase())) {
      alert('Essa finalidade de entrada já está registrada.');
      return;
    }

    const purpId = 'purp-' + Date.now().toString(36);
    addCustomEntryPurpose({
      id: purpId,
      name: purpName,
      bypassProductionDefault: newPurpBypass
    });
    setNewPurpName('');
    setNewPurpBypass(false);
  };

  const handleCreateClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (isReadOnly) return;
    setClientError('');
    setClientSuccess('');

    const formattedName = clientName.trim();
    if (!formattedName) {
      setClientError('O nome do cliente é obrigatório.');
      return;
    }

    // Check duplicate
    const exists = registeredClients.some(c => c.name.toLowerCase() === formattedName.toLowerCase());
    if (exists) {
      setClientError(`O cliente "${formattedName}" já está cadastrado.`);
      return;
    }

    const newClient: RegisteredClient = {
      id: 'cli-' + Date.now().toString(36),
      name: formattedName,
      defaultVehicleId: clientVehicleIds[0] || undefined,
      defaultDriverId: clientDriverIds[0] || undefined,
      vehicleIds: clientVehicleIds,
      driverIds: clientDriverIds,
      codigo: clientCode.trim() || undefined,
      apelidoFantasia: clientApelido.trim() || undefined,
      personType: clientPersonType,
      rgIe: clientRgIe.trim() || undefined,
      cpfCnpj: clientCpfCnpj.trim() || undefined,
      endereco: clientEndereco.trim() || undefined,
      numero: clientNumero.trim() || undefined,
      bairro: clientBairro.trim() || undefined,
      complemento: clientComplemento.trim() || undefined,
      cidade: clientCidade.trim() || undefined,
      uf: clientUf.trim().toUpperCase() || undefined,
      ddd: clientDdd.trim() || undefined,
      telefone: clientTelefone.trim() || undefined,
      comprasNaEmpresa: clientComprasNaEmpresa
    };

    addRegisteredClient(newClient);
    
    // Reset Client Form States
    setClientName('');
    setClientVehicleIds([]);
    setClientDriverIds([]);
    setClientCode('');
    setClientApelido('');
    setClientPersonType('fisica');
    setClientRgIe('');
    setClientCpfCnpj('');
    setClientEndereco('');
    setClientNumero('');
    setClientBairro('');
    setClientComplemento('');
    setClientCidade('');
    setClientUf('');
    setClientDdd('');
    setClientTelefone('');
    setClientComprasNaEmpresa(false);

    setClientSuccess('Cliente pré-cadastrado com sucesso!');
    setTimeout(() => {
      setClientSuccess('');
    }, 3000);
  };

  // CSV Template Export for Import Guidance
  const handleDownloadCSVTemplate = () => {
    const headers = [
      'codigo',
      'nome',
      'apelido_fantasia',
      'tipo_pessoa',
      'cpf_cnpj',
      'rg_ie',
      'endereco',
      'numero',
      'bairro',
      'complemento',
      'cidade',
      'uf',
      'ddd',
      'telefone'
    ];
    const sampleRow1 = [
      '001',
      'CLIENTE EXEMPLO LTDA',
      'NOME FANTASIA EXEMPLO',
      'juridica',
      '12.345.678/0001-99',
      '123.456.789.110',
      'AVENIDA PRINCIPAL',
      '1500',
      'CENTRO',
      'SALA 12',
      'SAO PAULO',
      'SP',
      '11',
      '99999-9999'
    ];
    const sampleRow2 = [
      '002',
      'JOAO DA SILVA',
      'JOAO DA AGUA',
      'fisica',
      '123.456.789-00',
      '12.345.678-9',
      'RUA DAS FLORES',
      '123',
      'JARDINS',
      'BLOCO B',
      'RIO DE JANEIRO',
      'RJ',
      '21',
      '98888-8888'
    ];

    const csvContent = [headers, sampleRow1, sampleRow2]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', 'modelo_importacao_clientes.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // CSV Client List Export
  const handleExportClientsCSV = () => {
    const headers = [
      'codigo',
      'nome',
      'apelido_fantasia',
      'tipo_pessoa',
      'cpf_cnpj',
      'rg_ie',
      'endereco',
      'numero',
      'bairro',
      'complemento',
      'cidade',
      'uf',
      'ddd',
      'telefone'
    ];

    const rows = registeredClients.map(c => [
      c.codigo || '',
      c.name,
      c.apelidoFantasia || '',
      c.personType || 'fisica',
      c.cpfCnpj || '',
      c.rgIe || '',
      c.endereco || '',
      c.numero || '',
      c.bairro || '',
      c.complemento || '',
      c.cidade || '',
      c.uf || '',
      c.ddd || '',
      c.telefone || ''
    ]);

    const csvContent = [headers, ...rows]
      .map(e => e.map(val => `"${String(val).replace(/"/g, '""')}"`).join(';'))
      .join('\r\n');

    const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `clientes_cadastrados_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // JSON Client List Export
  const handleExportClientsJSON = () => {
    const jsonString = `data:text/json;charset=utf-8,${encodeURIComponent(
      JSON.stringify(registeredClients, null, 2)
    )}`;
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', jsonString);
    downloadAnchor.setAttribute('download', `clientes_cadastrados_${new Date().toISOString().split('T')[0]}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // JSON/CSV Client Batch Importer
  const handleImportClients = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        let importedCount = 0;
        let duplicateCount = 0;

        if (file.name.endsWith('.json')) {
          const data = JSON.parse(text);
          const clientsArray = Array.isArray(data) ? data : (data.registeredClients || []);
          
          if (Array.isArray(clientsArray)) {
            clientsArray.forEach((item: any) => {
              const name = (item.nome || item.name || '').trim();
              if (!name) return;

              const exists = registeredClients.some(c => c.name.toLowerCase() === name.toLowerCase());
              if (exists) {
                duplicateCount++;
                return;
              }

              const newClient: RegisteredClient = {
                id: 'cli-' + Math.random().toString(36).substr(2, 9),
                name: name,
                codigo: (item.codigo || item.code || '').toString().trim(),
                apelidoFantasia: (item.apelidoFantasia || item.apelido_fantasia || item.apelido || item.fantasyName || '').toString().trim(),
                personType: (item.personType || item.tipo_pessoa || item.tipo || 'fisica').toString().toLowerCase().includes('jur') ? 'juridica' : 'fisica',
                cpfCnpj: (item.cpfCnpj || item.cpf_cnpj || item.cpf || item.cnpj || '').toString().trim(),
                rgIe: (item.rgIe || item.rg_ie || item.rg || item.ie || '').toString().trim(),
                endereco: (item.endereco || item.address || '').toString().trim(),
                numero: (item.numero || item.number || '').toString().trim(),
                bairro: (item.bairro || item.neighborhood || '').toString().trim(),
                complemento: (item.complemento || item.complement || '').toString().trim(),
                cidade: (item.cidade || item.city || '').toString().trim(),
                uf: (item.uf || item.state || '').toString().trim().toUpperCase().slice(0, 2),
                ddd: (item.ddd || '').toString().trim(),
                telefone: (item.telefone || item.phone || '').toString().trim(),
                vehicleIds: [],
                driverIds: []
              };
              addRegisteredClient(newClient);
              importedCount++;
            });
          } else {
            alert('Formato JSON inválido. Deve ser uma lista de clientes.');
            return;
          }
        } else {
          // Parse CSV
          const lines = text.split(/\r?\n/);
          if (lines.length <= 1) {
            alert('Arquivo CSV sem dados suficientes.');
            return;
          }

          const firstLine = lines[0];
          const delimiter = firstLine.includes(';') ? ';' : ',';
          const headers = firstLine.toLowerCase().split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

          let idxCodigo = headers.indexOf('codigo');
          if (idxCodigo === -1) idxCodigo = headers.indexOf('code');
          let idxNome = headers.indexOf('nome');
          if (idxNome === -1) idxNome = headers.indexOf('name');
          if (idxNome === -1) idxNome = headers.indexOf('razao_social');
          let idxApelido = headers.indexOf('apelido_fantasia');
          if (idxApelido === -1) idxApelido = headers.indexOf('apelido');
          if (idxApelido === -1) idxApelido = headers.indexOf('fantasia');
          let idxTipo = headers.indexOf('tipo_pessoa');
          if (idxTipo === -1) idxTipo = headers.indexOf('tipo');
          let idxCpfCnpj = headers.indexOf('cpf_cnpj');
          if (idxCpfCnpj === -1) idxCpfCnpj = headers.indexOf('cpf');
          if (idxCpfCnpj === -1) idxCpfCnpj = headers.indexOf('cnpj');
          let idxRgIe = headers.indexOf('rg_ie');
          if (idxRgIe === -1) idxRgIe = headers.indexOf('rg');
          if (idxRgIe === -1) idxRgIe = headers.indexOf('ie');
          let idxEndereco = headers.indexOf('endereco');
          let idxNumero = headers.indexOf('numero');
          let idxBairro = headers.indexOf('bairro');
          let idxComplemento = headers.indexOf('complemento');
          let idxCidade = headers.indexOf('cidade');
          let idxUf = headers.indexOf('uf');
          let idxDdd = headers.indexOf('ddd');
          let idxTelefone = headers.indexOf('telefone');

          const useFallback = idxNome === -1;

          for (let i = 1; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            let cols: string[] = [];
            let insideQuotes = false;
            let currentColumn = '';
            for (let charIdx = 0; charIdx < line.length; charIdx++) {
              const char = line[charIdx];
              if (char === '"') {
                insideQuotes = !insideQuotes;
              } else if (char === delimiter && !insideQuotes) {
                cols.push(currentColumn.trim().replace(/^"|"$/g, ''));
                currentColumn = '';
              } else {
                currentColumn += char;
              }
            }
            cols.push(currentColumn.trim().replace(/^"|"$/g, ''));

            if (cols.length === 0) continue;
            
            const nameVal = useFallback ? cols[1] : cols[idxNome];
            if (!nameVal) continue;
            const name = nameVal.trim();
            if (!name) continue;

            const exists = registeredClients.some(c => c.name.toLowerCase() === name.toLowerCase());
            if (exists) {
              duplicateCount++;
              continue;
            }

            const getColVal = (idx: number, fallbackIdx: number) => {
              if (idx !== -1 && idx < cols.length) return cols[idx];
              if (useFallback && fallbackIdx < cols.length) return cols[fallbackIdx];
              return '';
            };

            const newClient: RegisteredClient = {
              id: 'cli-' + Math.random().toString(36).substr(2, 9),
              name: name,
              codigo: getColVal(idxCodigo, 0),
              apelidoFantasia: getColVal(idxApelido, 2),
              personType: getColVal(idxTipo, 3).toLowerCase().includes('jur') || getColVal(idxTipo, 3).toLowerCase().includes('pj') ? 'juridica' : 'fisica',
              cpfCnpj: getColVal(idxCpfCnpj, 4),
              rgIe: getColVal(idxRgIe, 5),
              endereco: getColVal(idxEndereco, 6),
              numero: getColVal(idxNumero, 7),
              bairro: getColVal(idxBairro, 8),
              complemento: getColVal(idxComplemento, 9),
              cidade: getColVal(idxCidade, 10),
              uf: getColVal(idxUf, 11).toUpperCase().slice(0, 2),
              ddd: getColVal(idxDdd, 12),
              telefone: getColVal(idxTelefone, 13),
              vehicleIds: [],
              driverIds: []
            };

            addRegisteredClient(newClient);
            importedCount++;
          }
        }

        alert(`Importação concluída com sucesso!\n\nImportados: ${importedCount}\nIgnorados (Já Existentes): ${duplicateCount}`);
      } catch (err) {
        console.error(err);
        alert('Falha ao importar arquivo. Certifique-se de que o modelo está correto e as colunas separadas por vírgula ou ponto-e-vírgula.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  // Filtered lists
  const filteredVehicles = registeredVehicles.filter(v => {
    const query = searchVehicleQuery.toLowerCase().trim();
    if (!query) return true;
    const matchesPlate = v.plate.toLowerCase().includes(query);
    const matchesModel = v.model ? v.model.toLowerCase().includes(query) : false;
    const linkedDrv = registeredDrivers.find(d => d.id === v.defaultDriverId);
    const matchesDriver = linkedDrv ? linkedDrv.name.toLowerCase().includes(query) : false;
    return matchesPlate || matchesModel || matchesDriver;
  });

  const availableDriversForNewVehicle = registeredDrivers.filter(d => {
    const matchesOwner =
      vehicleOwnerType === 'proprio'
        ? d.driverType === 'interno'
        : d.driverType === 'cliente';

    if (!matchesOwner) return false;

    // Filter out drivers already linked to a vehicle
    const isAlreadyLinked = registeredVehicles.some(v => v.defaultDriverId === d.id);
    return !isAlreadyLinked;
  });

  const getAvailableDriversForExistingVehicle = (v: RegisteredVehicle) => {
    return registeredDrivers.filter(d => {
      const matchesOwner =
        v.ownerType === 'proprio'
          ? d.driverType === 'interno'
          : d.driverType === 'cliente';

      if (!matchesOwner) return false;

      // Filter out drivers linked to other vehicles
      const isLinkedToOther = registeredVehicles.some(oth => oth.id !== v.id && oth.defaultDriverId === d.id);
      return !isLinkedToOther;
    });
  };

  const filteredDrivers = registeredDrivers.filter(d =>
    d.name.toLowerCase().includes(searchDriverQuery.toLowerCase().trim())
  );

  const filteredClients = registeredClients
    .filter(c => {
      if (filterOnlyCompanyClients && !c.comprasNaEmpresa) {
        return false;
      }
      const query = searchClientQuery.toLowerCase().trim();
      if (!query) return true;
      const nameMatch = c.name.toLowerCase().includes(query);
      const codeMatch = c.codigo ? c.codigo.toLowerCase().includes(query) : false;
      const fantasyMatch = c.apelidoFantasia ? c.apelidoFantasia.toLowerCase().includes(query) : false;
      return nameMatch || codeMatch || fantasyMatch;
    })
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
    });

  return (
    <div className="space-y-6">
      {isReadOnly && (
        <div className="bg-amber-50 border border-amber-200 text-amber-800 px-4 py-3 relative rounded-xl text-xs font-semibold flex items-center gap-2 mt-2 animate-in fade-in duration-200 select-none">
          <AlertCircle size={15} className="text-amber-600 shrink-0" />
          <span><strong>Módulos de Leitura:</strong> Você está conectado com um perfil de visualização e não possui permissões para salvar, alterar ou remover pré-cadastros ou configurações.</span>
        </div>
      )}

      {/* Title */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
        <h1 className="text-lg font-bold text-slate-800">Módulo de Pré-Cadastros de Apoio</h1>
        <p className="text-xs text-slate-500 mt-1">
          Gerencie o pré-cadastro de veículos próprios e terceiros, bem como a lista de motoristas corporativos. 
          Vincule motoristas aos veículos para acelerar o fluxo na Portaria.
        </p>
      </div>

      {/* Botão de Expansão de Configurações */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
        <button
          onClick={() => setShowConfigPanel(!showConfigPanel)}
          className="w-full flex items-center justify-between p-4 hover:bg-slate-50 transition-colors text-left"
        >
          <div className="flex items-center space-x-3">
            <span className="p-2 bg-slate-100 text-slate-700 rounded-lg">
              <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.1a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/></svg>
            </span>
            <div>
              <h3 className="text-sm font-bold text-slate-800">Parâmetros, Automações e Logomarca</h3>
              <p className="text-[11px] text-slate-500">Cadastre categorias de veículos, finalidades de entrada personalizadas, envie a logomarca da empresa ou zere a base</p>
            </div>
          </div>
          <span className={`text-slate-400 font-bold text-xs uppercase px-2 py-1 rounded bg-slate-50 border border-slate-100 ${showConfigPanel ? 'rotate-180' : ''}`}>
            {showConfigPanel ? 'Ocultar ↑' : 'Configurar e Gerenciar ↓'}
          </span>
        </button>

        {showConfigPanel && (
          <div className="p-5 border-t border-slate-100 bg-slate-50/50 space-y-6">
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">

              {/* COLUNA 1: LOGOMARCA & LIMPEZA */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
                <div className="border-b border-slate-100 pb-2 flex items-center space-x-1.5 text-slate-700">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><rect width="18" height="18" x="3" y="3" rx="2" ry="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.086-3.086a2 2 0 0 0-2.828 0L6 21"/></svg>
                  <h4 className="text-xs font-black uppercase tracking-wider">Logomarca da Empresa</h4>
                </div>
                
                {/* Logo Preview */}
                <div className="p-3 bg-slate-55 rounded border border-slate-200 flex flex-col items-center justify-center min-h-[100px] text-center bg-slate-50">
                  {companyLogo ? (
                    <div className="space-y-2">
                      <img src={companyLogo} alt="Logomarca salva" className="max-h-16 max-w-[180px] object-contain mx-auto rounded p-1 bg-white border border-slate-200 shadow-xs" referrerPolicy="no-referrer" />
                      <button
                        onClick={handleRemoveLogo}
                        className="text-[10px] font-bold text-red-600 hover:text-red-700 hover:underline block mx-auto uppercase"
                      >
                        Remover Logomarca
                      </button>
                    </div>
                  ) : (
                    <div className="text-slate-400 text-[11px] font-medium space-y-1">
                      <p>Nenhuma imagem cadastrada</p>
                      <p className="text-[9px] text-slate-400">(Aparecerá nos PDFs exportados)</p>
                    </div>
                  )}
                </div>

                {/* URL paste or file upload inputs */}
                <div className="space-y-3">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Upload de Imagem (JPEG, PNG, JPG)</label>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleLogoUpload}
                      className="w-full text-[11px] text-slate-500 file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:text-[10px] file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200 cursor-pointer"
                    />
                    <p className="text-[9px] text-emerald-600 font-medium mt-1">
                      ✓ Imagem otimizada automaticamente para carregamento rápido e sincronização segura em nuvem.
                    </p>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Ou Cole Link (URL da Imagem)</label>
                    <div className="flex gap-1.5">
                      <input
                        type="url"
                        placeholder="https://exemplo.com/logo.jpg"
                        value={logoInput}
                        onChange={e => setLogoInput(e.target.value)}
                        className="flex-1 bg-white border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                      />
                      <button
                        type="button"
                        onClick={handleSaveLogoLink}
                        className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase tracking-wider px-3 rounded shadow-xs"
                      >
                        Salvar
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* COLUNA 2: CADASTRO DE FINALIDADES DE ENTRADA */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                <div className="border-b border-slate-100 pb-2 flex items-center space-x-1.5 text-slate-700 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><circle cx="12" cy="12" r="10"/><polygon points="12 8 8 12 12 16 12 8"/></svg>
                  <h4 className="text-xs font-black uppercase tracking-wider">Finalidades de Entrada</h4>
                </div>

                <form onSubmit={handleAddPurpose} className="space-y-3 mb-4 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">Nome da Finalidade</label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Entrega de EPI, Manutenção"
                      value={newPurpName}
                      onChange={e => setNewPurpName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-blue-400"
                    />
                  </div>
                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="purpBypass"
                      checked={newPurpBypass}
                      onChange={e => setNewPurpBypass(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-400 w-3.5 h-3.5"
                    />
                    <label htmlFor="purpBypass" className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer select-none">
                      Desvia do Fluxo de Produção
                    </label>
                  </div>
                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase p-1.5 rounded tracking-wider flex items-center justify-center gap-1 shadow-sm transition-colors"
                  >
                    <Plus size={13} /> Adicionar Finalidade
                  </button>
                </form>

                <div className="flex-1 overflow-auto max-h-[220px]">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] font-bold">
                        <th className="pb-1">Nome</th>
                        <th className="pb-1">Comportamento</th>
                        <th className="pb-1 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {customEntryPurposes.map(purp => {
                        const isSystemDefault = purp.id === 'producao';
                        return (
                          <tr key={purp.id} className="hover:bg-slate-50/60">
                            <td className="py-2 text-slate-800 font-bold">{purp.name}</td>
                            <td className="py-2">
                              {purp.bypassProductionDefault ? (
                                <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1 py-0.5 font-bold uppercase">IGNORAR</span>
                              ) : (
                                <span className="text-[9px] bg-teal-100 text-teal-800 rounded px-1 py-0.5 font-bold uppercase">FILA ACT</span>
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {isSystemDefault ? (
                                <span className="text-[9px] text-slate-400 italic font-normal" title="Finalidade padrão do sistema">Bloqueado</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removeCustomEntryPurpose(purp.id)}
                                  className="text-red-500 hover:text-red-700 transition"
                                  title="Apagar finalidade"
                                >
                                  <Trash2 size={13} className="inline" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* COLUNA 3: CATEGORIAS DE VEÍCULOS */}
              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                <div className="border-b border-slate-100 pb-2 flex items-center space-x-1.5 text-slate-700 mb-3">
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className="text-blue-600"><rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/></svg>
                  <h4 className="text-xs font-black uppercase tracking-wider font-bold">Categorias de Veículos</h4>
                </div>

                <form onSubmit={handleAddCategory} className="space-y-3 mb-4 bg-slate-50 p-2.5 rounded border border-slate-200">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                      Nome da Categoria
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="Ex: Moto, Reboque"
                      value={newCatName}
                      onChange={e => setNewCatName(e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded text-xs p-1.5 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                    />
                  </div>

                  <div className="flex items-center space-x-2">
                    <input
                      type="checkbox"
                      id="catBypass"
                      checked={newCatBypass}
                      onChange={e => setNewCatBypass(e.target.checked)}
                      className="rounded border-slate-300 text-blue-600 focus:ring-blue-400 w-3.5 h-3.5 cursor-pointer"
                    />
                    <label htmlFor="catBypass" className="text-[10px] font-bold text-slate-600 uppercase cursor-pointer select-none">
                      Ignorar Fila de Produção
                    </label>
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-[10px] uppercase p-1.5 rounded tracking-wider flex items-center justify-center gap-1 shadow-sm transition-colors"
                  >
                    <Plus size={13} /> Salvar Categoria
                  </button>
                </form>

                <div className="flex-1 overflow-auto max-h-[220px]">
                  <table className="w-full text-left text-[11px]">
                    <thead>
                      <tr className="border-b border-slate-100 text-slate-400 uppercase text-[9px] font-bold">
                        <th className="pb-1">Nome</th>
                        <th className="pb-1">Comportamento</th>
                        <th className="pb-1 text-right">Ação</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-50 font-medium">
                      {customVehicleCategories.map(cat => {
                        const isSystemDefault = ['carreta', 'truck', 'toco', '3/4', 'passeio', 'moto', 'utilitario'].includes(cat.id);
                        return (
                          <tr key={cat.id} className="hover:bg-slate-50/60 font-semibold text-slate-700">
                            <td className="py-2 font-bold text-slate-800">{cat.name}</td>
                            <td className="py-2">
                              {cat.bypassProductionDefault ? (
                                <span className="text-[9px] bg-slate-100 text-slate-500 rounded px-1.5 py-0.5 font-bold uppercase">IGNORAR</span>
                              ) : (
                                <span className="text-[9px] bg-teal-100 text-teal-800 rounded px-1.5 py-0.5 font-bold uppercase">FILA ACT</span>
                              )}
                            </td>
                            <td className="py-2 text-right">
                              {isSystemDefault ? (
                                <span className="text-[9px] text-slate-400 italic font-normal">Sistema</span>
                              ) : (
                                <button
                                  type="button"
                                  onClick={() => removeCustomVehicleCategory(cat.id)}
                                  className="text-red-500 hover:text-red-700 transition"
                                  title="Remover Categoria"
                                >
                                  <Trash2 size={13} className="inline" />
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

            </div>

            {/* SEGUNDA LINHA: PRÉ-CADASTRO DE OCORRÊNCIAS / COMPRAS */}
            <div className="grid grid-cols-1 xl:grid-cols-1 gap-6 mt-6 pt-6 border-t border-slate-200">
              <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col">
                <div className="border-b border-slate-100 pb-3 flex items-center space-x-1.5 text-slate-700 mb-4">
                  <Tag size={16} className="text-blue-600 animate-pulse" />
                  <h4 className="text-xs font-black uppercase tracking-wider font-bold">Ocorrências Personalizadas (Avarias ou +Compra)</h4>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  {/* Form */}
                  <form onSubmit={handleAddOccurrence} className="space-y-4 bg-slate-50 p-4 rounded-xl border border-slate-200 md:col-span-1">
                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Nome do Item (Ocorrência ou Compra)
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="Ex: risco no bocal, engradado extra..."
                        value={newOccurrenceName}
                        onChange={e => setNewOccurrenceName(e.target.value)}
                        className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm font-semibold"
                      />
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Origem da Ocorrência
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setNewOccurrenceOrigin('frota_propria');
                            setNewOccurrenceDeductDriver(true);
                          }}
                          className={`flex-1 text-[11px] uppercase tracking-wide font-bold py-2 px-3 rounded border transition ${
                            newOccurrenceOrigin === 'frota_propria'
                              ? 'bg-blue-50 border-blue-200 text-blue-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          🚚 Frota Própria
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setNewOccurrenceOrigin('cliente');
                            setNewOccurrenceDeductDriver(false);
                          }}
                          className={`flex-1 text-[11px] uppercase tracking-wide font-bold py-2 px-3 rounded border transition ${
                            newOccurrenceOrigin === 'cliente'
                              ? 'bg-amber-50 border-amber-200 text-amber-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          👤 Clientes
                        </button>
                      </div>
                    </div>

                    {newOccurrenceOrigin === 'frota_propria' && (
                      <div className="bg-blue-50/50 p-2.5 rounded-lg border border-blue-100 flex items-center justify-between">
                        <div className="pr-2">
                          <label className="block text-[10px] font-bold text-blue-950 uppercase">
                            Descontar do Motorista?
                          </label>
                          <span className="block text-[9px] text-blue-750 leading-tight">
                            Entra no cálculo do limite de avarias
                          </span>
                        </div>
                        <input
                          type="checkbox"
                          checked={newOccurrenceDeductDriver}
                          onChange={e => setNewOccurrenceDeductDriver(e.target.checked)}
                          className="h-4 w-4 text-blue-600 border-slate-300 rounded focus:ring-blue-400 cursor-pointer shrink-0"
                        />
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Tipo de Registro
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setNewOccurrenceType('avaria')}
                          className={`flex-1 text-[11px] uppercase tracking-wide font-bold py-2 px-3 rounded border transition ${
                            newOccurrenceType === 'avaria'
                              ? 'bg-red-50 border-red-200 text-red-650'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          ⚠️ Avaria / Perda
                        </button>
                        <button
                          type="button"
                          onClick={() => setNewOccurrenceType('compra')}
                          className={`flex-1 text-[11px] uppercase tracking-wide font-bold py-2 px-3 rounded border transition ${
                            newOccurrenceType === 'compra'
                              ? 'bg-emerald-50 border-emerald-200 text-emerald-700'
                              : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                          }`}
                        >
                          ➕ Compra
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                        Lançamento / Aplicação (Fase)
                      </label>
                      <select
                        value={newOccurrenceClassification}
                        onChange={e => setNewOccurrenceClassification(e.target.value as any)}
                        className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm font-semibold text-slate-700"
                      >
                        <option value="ambos">Ambos (Entrada e Saída)</option>
                        <option value="descarregamento">Descarregamento (Entrada)</option>
                        <option value="carregamento">Carregamento / Envase (Saída)</option>
                      </select>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase p-2.5 rounded tracking-wider flex items-center justify-center gap-1.5 shadow-sm transition-colors"
                    >
                      <Plus size={14} /> Pré-Cadastrar Item
                    </button>
                  </form>

                  {/* List / Table with tabs */}
                  <div className="md:col-span-2 flex flex-col h-full">
                    {/* Tabs */}
                    <div className="flex border-b border-slate-200 mb-4 gap-1">
                      <button
                        type="button"
                        onClick={() => setActiveOccurrenceTab('frota_propria')}
                        className={`py-2 px-4 text-xs font-bold transition-all border-b-2 rounded-t-lg ${
                          activeOccurrenceTab === 'frota_propria'
                            ? 'border-blue-600 text-blue-600 bg-blue-50/20'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                        }`}
                      >
                        🚚 Frota Própria ({customAvariaTypes.filter(t => t.origin !== 'cliente').length})
                      </button>
                      <button
                        type="button"
                        onClick={() => setActiveOccurrenceTab('cliente')}
                        className={`py-2 px-4 text-xs font-bold transition-all border-b-2 rounded-t-lg ${
                          activeOccurrenceTab === 'cliente'
                            ? 'border-amber-500 text-amber-600 bg-amber-50/20'
                            : 'border-transparent text-slate-500 hover:text-slate-700 hover:bg-slate-50/50'
                        }`}
                      >
                        👤 Clientes ({customAvariaTypes.filter(t => t.origin === 'cliente').length})
                      </button>
                    </div>

                    <div className="overflow-auto max-h-[350px] pr-1">
                      <table className="w-full text-left text-xs">
                        <thead>
                          <tr className="border-b border-slate-200 text-slate-400 uppercase text-[10px] font-black pb-2">
                            <th className="pb-2">Nome Pré-Cadastrado</th>
                            <th className="pb-2">Classificação</th>
                            {activeOccurrenceTab === 'frota_propria' && (
                              <th className="pb-2 text-center">Descontar do Motorista?</th>
                            )}
                            <th className="pb-2 text-right">Ação</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {customAvariaTypes.filter(t => activeOccurrenceTab === 'cliente' ? t.origin === 'cliente' : t.origin !== 'cliente').length > 0 ? (
                            customAvariaTypes
                              .filter(t => activeOccurrenceTab === 'cliente' ? t.origin === 'cliente' : t.origin !== 'cliente')
                              .map((item) => {
                                const isEditing = editingOccurrenceId === item.id;
                                const isPurchase = item.category === 'compra';
                                
                                if (isEditing) {
                                  return (
                                    <tr key={item.id} className="bg-blue-50/20 font-semibold text-slate-700">
                                      <td className="py-2">
                                        <input
                                          type="text"
                                          value={editingOccurrenceName}
                                          onChange={e => setEditingOccurrenceName(e.target.value)}
                                          className="w-full bg-white border border-slate-250 rounded text-xs p-1.5 font-bold outline-none text-slate-800 shadow-xs focus:border-blue-400"
                                          placeholder="Nome da ocorrência"
                                        />
                                      </td>
                                      <td className="py-2">
                                        <select
                                          value={editingOccurrenceClassification}
                                          onChange={e => setEditingOccurrenceClassification(e.target.value as any)}
                                          className="w-full bg-white border border-slate-250 rounded text-xs p-1.5 font-semibold outline-none text-slate-700 shadow-xs focus:border-blue-400"
                                        >
                                          <option value="ambos">Ambos (Fases)</option>
                                          <option value="descarregamento">Descarregamento (Entrada)</option>
                                          <option value="carregamento">Carregamento / Envase (Saída)</option>
                                        </select>
                                      </td>
                                      {activeOccurrenceTab === 'frota_propria' && (
                                        <td className="py-2 text-center">
                                          <input
                                            type="checkbox"
                                            checked={item.descontarMotorista !== false}
                                            onChange={e => {
                                              updateCustomAvariaType(item.id, {
                                                descontarMotorista: e.target.checked
                                              });
                                            }}
                                            className="h-3.5 w-3.5 text-blue-600 border-slate-300 rounded cursor-pointer"
                                          />
                                        </td>
                                      )}
                                      <td className="py-2 text-right">
                                        <div className="flex gap-2 justify-end">
                                          <button
                                            type="button"
                                            onClick={() => {
                                              const trimVal = editingOccurrenceName.trim();
                                              if (!trimVal) return;
                                              updateCustomAvariaType(item.id, {
                                                type: trimVal,
                                                classification: editingOccurrenceClassification
                                              });
                                              setEditingOccurrenceId(null);
                                            }}
                                            className="text-emerald-600 hover:text-emerald-800 p-1 bg-white rounded border border-emerald-100 shadow-xs hover:bg-emerald-50 transition"
                                            title="Salvar Alterações"
                                          >
                                            <Check size={14} />
                                          </button>
                                          <button
                                            type="button"
                                            onClick={() => setEditingOccurrenceId(null)}
                                            className="text-slate-500 hover:text-slate-700 p-1 bg-white rounded border border-slate-200 shadow-xs hover:bg-slate-50 transition"
                                            title="Cancelar"
                                          >
                                            <X size={14} />
                                          </button>
                                        </div>
                                      </td>
                                    </tr>
                                  );
                                }

                                return (
                                  <tr key={item.id} className="hover:bg-slate-50/60 font-semibold text-slate-700">
                                    <td className="py-2.5 text-slate-800 font-bold capitalize">{item.type}</td>
                                    <td className="py-2.5">
                                      <div className="flex flex-wrap gap-1.5 items-center">
                                        {isPurchase ? (
                                          <span className="text-[9px] bg-emerald-50 text-emerald-700 border border-emerald-100 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                                            ➕ Compra
                                          </span>
                                        ) : (
                                          <span className="text-[9px] bg-red-50 text-red-500 border border-red-150 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                                            ⚠️ Avaria
                                          </span>
                                        )}
                                        <span className="text-[9px] bg-indigo-50 text-indigo-700 border border-indigo-100 rounded px-1.5 py-0.5 font-bold uppercase tracking-wider">
                                          {item.classification === 'descarregamento' ? 'Descarregamento' : item.classification === 'carregamento' ? 'Carregamento' : 'Ambos'}
                                        </span>
                                      </div>
                                    </td>
                                    {activeOccurrenceTab === 'frota_propria' && (
                                      <td className="py-2.5 text-center">
                                        <button
                                          type="button"
                                          disabled={isReadOnly || isPurchase}
                                          onClick={() => {
                                            updateCustomAvariaType(item.id, {
                                              descontarMotorista: item.descontarMotorista === false ? true : false
                                            });
                                          }}
                                          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border transition ${
                                            isPurchase 
                                              ? 'bg-slate-50 text-slate-400 border-slate-200 cursor-not-allowed'
                                              : item.descontarMotorista !== false
                                                ? 'bg-red-50 text-red-650 border-red-250 hover:bg-red-100'
                                                : 'bg-slate-100 text-slate-500 border-slate-250 hover:bg-slate-200'
                                          }`}
                                        >
                                          {isPurchase ? 'N/A' : item.descontarMotorista !== false ? 'Sim (Descontar)' : 'Não Descontar'}
                                        </button>
                                      </td>
                                    )}
                                    <td className="py-2.5 text-right">
                                      <div className="flex gap-2 justify-end">
                                        <button
                                          type="button"
                                          onClick={() => {
                                            setEditingOccurrenceId(item.id);
                                            setEditingOccurrenceName(item.type);
                                            setEditingOccurrenceClassification(item.classification);
                                          }}
                                          className="text-blue-500 hover:text-blue-700 transition p-1 hover:bg-slate-100 rounded"
                                          title="Editar Cadastro"
                                        >
                                          <Edit size={14} className="inline" />
                                        </button>
                                        <button
                                          type="button"
                                          onClick={() => removeCustomAvariaType(item.id)}
                                          className="text-red-500 hover:text-red-700 transition p-1 hover:bg-slate-100 rounded"
                                          title="Remover Cadastro"
                                        >
                                          <Trash2 size={14} className="inline" />
                                        </button>
                                      </div>
                                    </td>
                                  </tr>
                                );
                              })
                          ) : (
                            <tr>
                              <td colSpan={activeOccurrenceTab === 'frota_propria' ? 4 : 3} className="py-8 text-center text-slate-400 italic text-xs">
                                Nenhuma ocorrência personalizada registrada nesta categoria.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>
            </div>

          </div>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">

        {/* 1. SECTION: MOTORISTAS DA EMPRESA */}
        <div className="space-y-6 flex flex-col">
          {/* Card Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
              <UserCheck size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Pré-Cadastro de Motoristas</h2>
            </div>

            <form onSubmit={handleCreateDriver} className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Nome Completo
                </label>
                <input
                  type="text"
                  required
                  value={driverName}
                  onChange={e => setDriverName(e.target.value)}
                  placeholder="Ex: Carlos Eduardo de Souza"
                  className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Vínculo / Tipo de Motorista
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setDriverType('interno')}
                    className={`p-2 rounded text-xs font-semibold border transition ${
                      driverType === 'interno'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Próprio / CLT da Empresa
                  </button>
                  <button
                    type="button"
                    onClick={() => setDriverType('cliente')}
                    className={`p-2 rounded text-xs font-semibold border transition ${
                      driverType === 'cliente'
                        ? 'border-blue-500 bg-blue-50 text-blue-700'
                        : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                    }`}
                  >
                    Cliente / Outros
                  </button>
                </div>
              </div>

              {driverType === 'interno' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Comissão (%)
                    </label>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.1"
                      required
                      value={driverCommissionPercent}
                      onChange={e => setDriverCommissionPercent(parseFloat(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm font-semibold"
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                      Limite de Avarias
                    </label>
                    <input
                      type="number"
                      min="0"
                      required
                      value={driverDamageToleranceQty}
                      onChange={e => setDriverDamageToleranceQty(parseInt(e.target.value) || 0)}
                      className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm font-semibold"
                      placeholder="Qtd permitida"
                    />
                  </div>
                </div>
              )}

              {driverError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded font-medium flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{driverError}</span>
                </div>
              )}

              {driverSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium">
                  {driverSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider p-2.5 rounded shadow transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={16} />
                Salvar Motorista
              </button>
            </form>
          </div>

          {/* List Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3 h-auto">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Lista de Motoristas Cadastrados</h2>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar motorista..."
                  value={searchDriverQuery}
                  onChange={e => setSearchDriverQuery(e.target.value)}
                  className="bg-slate-55 text-xs border border-slate-200 pl-8 pr-3 py-1.5 rounded outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-full sm:w-48"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-2 font-bold uppercase text-[10px]">Nome</th>
                    <th className="pb-2 font-bold uppercase text-[10px]">Vínculo</th>
                    <th className="pb-2 font-bold uppercase text-[10px]">Comissão</th>
                    <th className="pb-2 font-bold uppercase text-[10px]">Lim. Avarias</th>
                    <th className="pb-2 text-right font-bold uppercase text-[10px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {filteredDrivers.map(d => (
                    <tr key={d.id} className="hover:bg-slate-50">
                      <td className="py-2.5 text-slate-900 font-semibold">
                        {editingDriverId === d.id ? (
                          <input
                            type="text"
                            value={editingDriverName}
                            onChange={(e) => setEditingDriverName(e.target.value)}
                            className="bg-white border border-slate-300 rounded text-xs px-2 py-1 font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-full"
                            autoFocus
                          />
                        ) : (
                          d.name
                        )}
                      </td>
                      <td className="py-2.5">
                        <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                          d.driverType === 'interno' ? 'bg-cyan-100 text-cyan-700' : 'bg-emerald-100 text-emerald-700'
                        }`}>
                          {d.driverType === 'interno' ? 'Interno' : 'Cliente'}
                        </span>
                      </td>
                      <td className="py-2.5 font-bold text-slate-700">
                        {editingDriverId === d.id ? (
                          d.driverType === 'interno' ? (
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              value={editingDriverCommissionPercent}
                              onChange={(e) => setEditingDriverCommissionPercent(parseFloat(e.target.value) || 0)}
                              className="bg-white border border-slate-300 rounded text-xs px-2 py-1 font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-16"
                            />
                          ) : (
                            <span className="text-slate-400 italic text-[10px] font-normal">-</span>
                          )
                        ) : (
                          d.driverType === 'interno' ? `${d.commissionPercent ?? 8}%` : '-'
                        )}
                      </td>
                      <td className="py-2.5 font-bold text-slate-700">
                        {editingDriverId === d.id ? (
                          d.driverType === 'interno' ? (
                            <input
                              type="number"
                              min="0"
                              value={editingDriverDamageToleranceQty}
                              onChange={(e) => setEditingDriverDamageToleranceQty(parseInt(e.target.value) || 0)}
                              className="bg-white border border-slate-300 rounded text-xs px-2 py-1 font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-16"
                            />
                          ) : (
                            <span className="text-slate-400 italic text-[10px] font-normal">-</span>
                          )
                        ) : (
                          d.driverType === 'interno' ? `${d.damageToleranceQty ?? 0} un` : '-'
                        )}
                      </td>
                      <td className="py-2.5 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {editingDriverId === d.id ? (
                            <>
                              <button
                                onClick={() => {
                                  const nextVal = editingDriverName.trim();
                                  if (nextVal !== '') {
                                    updateRegisteredDriver(d.id, { 
                                      name: nextVal,
                                      commissionPercent: d.driverType === 'interno' ? editingDriverCommissionPercent : undefined,
                                      damageToleranceQty: d.driverType === 'interno' ? editingDriverDamageToleranceQty : undefined
                                    });
                                  }
                                  setEditingDriverId('');
                                  setEditingDriverName('');
                                }}
                                className="p-1 text-green-600 hover:text-green-800 transition cursor-pointer"
                                title="Salvar"
                              >
                                <Check size={14} />
                              </button>
                              <button
                                onClick={() => {
                                  setEditingDriverId('');
                                  setEditingDriverName('');
                                }}
                                className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer"
                                title="Cancelar"
                              >
                                <X size={14} />
                              </button>
                            </>
                          ) : (
                            <>
                              {!isReadOnly && (
                                <button
                                  onClick={() => {
                                    setEditingDriverId(d.id);
                                    setEditingDriverName(d.name);
                                    setEditingDriverCommissionPercent(d.commissionPercent ?? 8);
                                    setEditingDriverDamageToleranceQty(d.damageToleranceQty ?? 0);
                                  }}
                                  className="p-1 hover:text-blue-600 text-slate-400 transition cursor-pointer"
                                  title="Editar Nome/Comissão/Avarias do Motorista"
                                >
                                  <Edit size={14} />
                                </button>
                              )}
                              <button
                                onClick={() => removeRegisteredDriver(d.id)}
                                disabled={isReadOnly}
                                className="p-1 hover:text-red-600 text-slate-400 transition cursor-pointer disabled:opacity-50"
                                title="Remover Cadastro"
                              >
                                <Trash2 size={14} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredDrivers.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400 uppercase tracking-wide text-[10px]">
                        Nenhum motorista cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>


        {/* 2. SECTION: PRÉ-CADASTRO DE VEÍCULOS */}
        <div className="space-y-6 flex flex-col">
          {/* Card Form */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex-1">
            <div className="flex items-center space-x-2 border-b border-slate-100 pb-3 mb-4">
              <Truck size={18} className="text-blue-600" />
              <h2 className="text-sm font-bold text-slate-800 uppercase tracking-tight">Pré-Cadastro de Veículos</h2>
            </div>

            <form onSubmit={handleCreateVehicle} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Placa do Veículo
                  </label>
                  <input
                    type="text"
                    required
                    value={vehiclePlate}
                    onChange={e => setVehiclePlate(e.target.value)}
                    placeholder="Ex: ABC-1234, ABC1D23"
                    className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm uppercase font-mono tracking-widest font-semibold"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Proprietário
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setVehicleOwnerType('proprio')}
                      className={`p-2 rounded text-xs font-semibold border transition ${
                        vehicleOwnerType === 'proprio'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Frota Própria
                    </button>
                    <button
                      type="button"
                      onClick={() => setVehicleOwnerType('terceiro')}
                      className={`p-2 rounded text-xs font-semibold border transition ${
                        vehicleOwnerType === 'terceiro'
                          ? 'border-blue-500 bg-blue-50 text-blue-700'
                          : 'border-slate-200 bg-white text-slate-600 hover:bg-slate-50'
                      }`}
                    >
                      Terceiro / Cliente
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Tipo do Veículo
                  </label>
                  <select
                    value={vehicleType}
                    onChange={e => setVehicleType(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  >
                    {customVehicleCategories.map(cat => (
                      <option key={cat.id} value={cat.id}>
                        {cat.name} {cat.bypassProductionDefault ? '(Ignora Fila)' : '(Vai p/ Fila)'}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Modelo ou Descrição (Opcional)
                  </label>
                  <input
                    type="text"
                    value={vehicleModel}
                    onChange={e => setVehicleModel(e.target.value)}
                    placeholder="Ex: Scania R450 Vermelha"
                    className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Motorista Pré-Vinculado (Preenchimento Automático)
                  </label>
                  <select
                    value={defaultDriverId}
                    onChange={e => setDefaultDriverId(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  >
                    <option value="">Nenhum motorista pré-vinculado</option>
                    {availableDriversForNewVehicle.map(d => (
                      <option key={d.id} value={d.id}>
                        {d.name} ({d.driverType === 'interno' ? 'Frota' : 'Cliente'})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                    Média de Vasilhames / Carga (Cálculo Fila)
                  </label>
                  <input
                    type="number"
                    min="0"
                    placeholder="Ex: 50"
                    value={vehicleAverageVasilhames}
                    onChange={e => setVehicleAverageVasilhames(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-sm p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm font-semibold text-slate-700"
                  />
                </div>
              </div>
              <p className="text-[10px] text-slate-400 mt-1">
                A média de vasilhames serve como estimativa padrão para o cálculo de tempo de descarregamento antes da pesagem/registro definitivo. Isso melhora a precisão na fila de espera sem afetar os dados de produção.
              </p>

              {vehicleError && (
                <div className="p-2.5 bg-rose-50 text-rose-700 text-xs rounded font-medium flex items-center gap-2">
                  <AlertCircle size={14} />
                  <span>{vehicleError}</span>
                </div>
              )}

              {vehicleSuccess && (
                <div className="p-2.5 bg-emerald-50 text-emerald-700 text-xs rounded font-medium">
                  {vehicleSuccess}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider p-2.5 rounded shadow transition-colors flex items-center justify-center gap-1.5"
              >
                <Plus size={16} />
                Salvar Veículo
              </button>
            </form>
          </div>

          {/* List Card */}
          <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[400px]">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4 border-b border-slate-100 pb-3 h-auto">
              <h2 className="text-xs font-bold text-slate-600 uppercase tracking-wider">Lista de Veículos Cadastrados</h2>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Buscar veículo..."
                  value={searchVehicleQuery}
                  onChange={e => setSearchVehicleQuery(e.target.value)}
                  className="bg-slate-55 text-xs border border-slate-200 pl-8 pr-3 py-1.5 rounded outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-full sm:w-48"
                />
              </div>
            </div>

            <div className="flex-1 overflow-auto pr-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-400">
                    <th className="pb-2 font-bold uppercase text-[10px]">Placa / Tipo</th>
                    <th className="pb-2 font-bold uppercase text-[10px]">Proprietário</th>
                    <th className="pb-2 font-bold uppercase text-[10px]">Motorista Padrão</th>
                    <th className="pb-2 font-bold uppercase text-[10px]">Média Vasilhames</th>
                    <th className="pb-2 text-right font-bold uppercase text-[10px]">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50 font-medium">
                  {filteredVehicles.map(v => {
                    const linkedDrv = registeredDrivers.find(d => d.id === v.defaultDriverId);
                    return (
                      <tr key={v.id} className="hover:bg-slate-50">
                        <td className="py-2.5">
                          {editingVehicleId === v.id ? (
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={editingVehiclePlate}
                                onChange={e => setEditingVehiclePlate(e.target.value)}
                                onKeyDown={e => {
                                  if (e.key === 'Enter') {
                                    const nextPlate = editingVehiclePlate.trim().toUpperCase();
                                    if (nextPlate !== '') {
                                      const plateExists = registeredVehicles.some(oth => oth.id !== v.id && oth.plate.toUpperCase() === nextPlate.toUpperCase());
                                      if (plateExists) {
                                        alert(`O veículo com placa "${nextPlate}" já está cadastrado.`);
                                        return;
                                      }
                                      updateRegisteredVehicle(v.id, {
                                        plate: nextPlate,
                                        vehicleType: editingVehicleType
                                      });
                                    }
                                    setEditingVehicleId('');
                                    setEditingVehiclePlate('');
                                  } else if (e.key === 'Escape') {
                                    setEditingVehicleId('');
                                    setEditingVehiclePlate('');
                                  }
                                }}
                                className="bg-white border border-slate-300 rounded font-mono font-bold text-xs uppercase p-1 w-24 outline-none focus:border-blue-400"
                              />
                              <select
                                value={editingVehicleType}
                                onChange={e => setEditingVehicleType(e.target.value)}
                                className="bg-white border border-slate-300 rounded text-[10px] p-1 w-28 block mt-1 outline-none text-slate-700 font-semibold focus:border-blue-400"
                              >
                                {customVehicleCategories.map(cat => (
                                  <option key={cat.id} value={cat.id}>
                                    {cat.name}
                                  </option>
                                ))}
                              </select>
                            </div>
                          ) : (
                            <>
                              <div className="font-mono font-bold text-slate-900 tracking-wider uppercase text-xs">
                                {v.plate}
                              </div>
                              <div className="text-[10px] text-slate-500 font-normal">
                                {getVehicleTypeLabel(v.vehicleType)} {v.model ? `- ${v.model}` : ''}
                              </div>
                            </>
                          )}
                        </td>
                        <td className="py-2.5">
                          <span className={`px-1.5 py-0.5 rounded text-[9px] uppercase font-bold ${
                            v.ownerType === 'proprio' ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-150 text-slate-700 bg-slate-100'
                          }`}>
                            {v.ownerType === 'proprio' ? 'Próprio' : 'Terceiro'}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <div className="flex items-center gap-1.5">
                            <select
                              value={v.defaultDriverId || ''}
                              onChange={(e) => {
                                const drvId = e.target.value || undefined;
                                if (drvId) {
                                  const alreadyLinked = registeredVehicles.some(oth => oth.id !== v.id && oth.defaultDriverId === drvId);
                                  if (alreadyLinked) {
                                    alert('Este motorista já está vinculado a outro veículo.');
                                    return;
                                  }
                                }
                                updateRegisteredVehicleDriver(v.id, drvId);
                              }}
                              className="bg-slate-50 border border-slate-200 rounded text-xs p-1 font-semibold text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-full max-w-[130px]"
                            >
                              <option value="">Nenhum motorista</option>
                              {/* Filter drivers so only appropriate aligned type drivers are showing */}
                              {getAvailableDriversForExistingVehicle(v).map(drv => (
                                <option key={drv.id} value={drv.id}>
                                  {drv.name} ({drv.driverType === 'interno' ? 'Frota' : 'Cliente'})
                                </option>
                              ))}
                            </select>
                            {v.defaultDriverId && (
                              <button
                                onClick={() => updateRegisteredVehicleDriver(v.id, undefined)}
                                className="p-1 hover:text-red-650 hover:text-red-600 text-slate-400 transition cursor-pointer flex-shrink-0"
                                title="Remover motorista do veículo"
                              >
                                <XCircle size={14} />
                              </button>
                            )}
                          </div>
                        </td>
                        <td className="py-2.5">
                          <input
                            type="number"
                            min="0"
                            placeholder="Nenhum"
                            value={v.averageVasilhames !== undefined ? v.averageVasilhames : ''}
                            onChange={(e) => {
                              const inputVal = e.target.value;
                              const parsed = inputVal === '' ? undefined : parseInt(inputVal, 10);
                              updateRegisteredVehicle(v.id, {
                                averageVasilhames: (parsed !== undefined && !isNaN(parsed) && parsed >= 0) ? parsed : undefined
                              });
                            }}
                            className="bg-slate-50 border border-slate-200 rounded text-xs px-1.5 py-1 text-center font-bold text-slate-700 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 w-16"
                          />
                        </td>
                        <td className="py-2.5 text-right">
                          <div className="flex items-center justify-end gap-1.5 animate-in">
                            {editingVehicleId === v.id ? (
                              <>
                                <button
                                  onClick={() => {
                                    const nextPlate = editingVehiclePlate.trim().toUpperCase();
                                    if (nextPlate !== '') {
                                      const plateExists = registeredVehicles.some(oth => oth.id !== v.id && oth.plate.toUpperCase() === nextPlate.toUpperCase());
                                      if (plateExists) {
                                        alert(`O veículo com placa "${nextPlate}" já está cadastrado.`);
                                        return;
                                      }
                                      updateRegisteredVehicle(v.id, {
                                        plate: nextPlate,
                                        vehicleType: editingVehicleType
                                      });
                                    }
                                    setEditingVehicleId('');
                                    setEditingVehiclePlate('');
                                  }}
                                  className="p-1 text-green-600 hover:text-green-800 transition cursor-pointer font-bold"
                                  title="Salvar Observações"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingVehicleId('');
                                    setEditingVehiclePlate('');
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-600 transition cursor-pointer font-bold"
                                  title="Cancelar"
                                >
                                  <X size={14} />
                                </button>
                              </>
                            ) : (
                              <>
                                {!isReadOnly && (
                                  <button
                                    onClick={() => {
                                      setEditingVehicleId(v.id);
                                      setEditingVehiclePlate(v.plate);
                                      setEditingVehicleType(v.vehicleType);
                                    }}
                                    className="p-1 hover:text-blue-600 text-slate-400 transition cursor-pointer"
                                    title="Editar Placa / Tipo de Veículo"
                                  >
                                    <Edit size={14} />
                                  </button>
                                )}
                                <button
                                  onClick={() => removeRegisteredVehicle(v.id)}
                                  disabled={isReadOnly}
                                  className="p-1 hover:text-red-600 text-slate-400 transition cursor-pointer disabled:opacity-50"
                                  title="Remover Cadastro"
                                >
                                  <Trash2 size={14} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredVehicles.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 uppercase tracking-wide text-[10px]">
                        Nenhum veículo cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>

      {/* 3. SECTION: PRÉ-CADASTRO DE CLIENTES */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm mt-6">
        <div className="flex items-center justify-between border-b border-slate-150 pb-3.5 mb-5">
          <div className="flex items-center space-x-2.5">
            <Users size={20} className="text-blue-600 animate-pulse" />
            <h2 className="text-base font-bold text-slate-800 uppercase tracking-tight">Painel de Pré-Cadastro e Gestão de Clientes</h2>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* Left Column: Register Form & Import/Export */}
          <div className="lg:col-span-5 space-y-4">

            {/* Import / Export Panel */}
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3.5 mb-4 space-y-2.5">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-200 pb-1.5">
                📁 Importar & Exportar Clientes
              </h3>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleExportClientsCSV}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white text-[10px] font-bold uppercase py-2 px-1 rounded shadow transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Exportar base de clientes em formato CSV (separador ponto-e-vírgula)"
                >
                  📥 Exportar (CSV)
                </button>
                <button
                  type="button"
                  onClick={handleExportClientsJSON}
                  className="bg-blue-600 hover:bg-blue-700 text-white text-[10px] font-bold uppercase py-2 px-1 rounded shadow transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Exportar base de clientes em formato JSON"
                >
                  📥 Exportar (JSON)
                </button>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <label className="w-full bg-amber-50 hover:bg-amber-100 border border-amber-300 text-amber-800 text-[10px] font-bold uppercase py-2 px-1 rounded shadow transition flex items-center justify-center gap-1 cursor-pointer text-center">
                  📤 Importar CSV/JSON
                  <input
                    type="file"
                    accept=".csv,.json"
                    onChange={handleImportClients}
                    className="hidden"
                  />
                </label>
                <button
                  type="button"
                  onClick={handleDownloadCSVTemplate}
                  className="bg-slate-200 hover:bg-slate-300 text-slate-700 text-[10px] font-bold uppercase py-2 px-1 rounded shadow transition flex items-center justify-center gap-1 cursor-pointer"
                  title="Baixar planilha de exemplo para preencher e importar"
                >
                  📋 Modelo p/ Importação
                </button>
              </div>
              <p className="text-[9.5px] text-slate-450 leading-tight italic text-center text-slate-500">
                Evite duplicados. O importador mapeia cabeçalhos ou colunas em ordem padrão.
              </p>
            </div>

            <form onSubmit={handleCreateClient} className="space-y-3.5 mb-5 p-3.5 bg-slate-50/60 rounded-xl border border-slate-200 focus-within:border-blue-400 transition-colors">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider border-b border-slate-100 pb-1.5">
                Novo Cliente
              </h3>

              {/* Código, Nome, Apelido */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Código
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 105"
                    value={clientCode}
                    onChange={e => setClientCode(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Nome / Razão Social *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Comercial de Bebidas Silva"
                    value={clientName}
                    onChange={e => setClientName(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm font-semibold"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Apelido / Nome Fantasia
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Depósito Silva"
                    value={clientApelido}
                    onChange={e => setClientApelido(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Tipo de Pessoa
                  </label>
                  <div className="grid grid-cols-2 gap-1 bg-white p-0.5 rounded border border-slate-200 shadow-sm">
                    <button
                      type="button"
                      onClick={() => setClientPersonType('fisica')}
                      className={`py-1 rounded text-[11px] font-semibold transition ${
                        clientPersonType === 'fisica'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Física
                    </button>
                    <button
                      type="button"
                      onClick={() => setClientPersonType('juridica')}
                      className={`py-1 rounded text-[11px] font-semibold transition ${
                        clientPersonType === 'juridica'
                          ? 'bg-blue-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      Jurídica
                    </button>
                  </div>
                </div>
              </div>

              {/* CPF/CNPJ & RG/IE */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {clientPersonType === 'fisica' ? 'CPF *' : 'CNPJ *'}
                  </label>
                  <input
                    type="text"
                    placeholder={clientPersonType === 'fisica' ? 'Ex: 123.456.789-00' : 'Ex: 12.345.678/0001-99'}
                    value={clientCpfCnpj}
                    onChange={e => setClientCpfCnpj(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    {clientPersonType === 'fisica' ? 'RG' : 'Inscrição Estadual (IE)'}
                  </label>
                  <input
                    type="text"
                    placeholder={clientPersonType === 'fisica' ? 'Ex: 12.345.678-9' : 'Ex: 123.456.789.110'}
                    value={clientRgIe}
                    onChange={e => setClientRgIe(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
              </div>

              {/* DDD & Telefone */}
              <div className="grid grid-cols-4 gap-2">
                <div className="col-span-1">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">
                    DDD
                  </label>
                  <input
                    type="text"
                    maxLength={3}
                    placeholder="11"
                    value={clientDdd}
                    onChange={e => setClientDdd(e.target.value.replace(/\D/g, ''))}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm text-center font-semibold"
                  />
                </div>
                <div className="col-span-3">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Telefone
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 99999-9999"
                    value={clientTelefone}
                    onChange={e => setClientTelefone(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
              </div>

              {/* Endereço, Número, Bairro */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Endereço
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Rua das Flores"
                    value={clientEndereco}
                    onChange={e => setClientEndereco(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Número
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: 123"
                    value={clientNumero}
                    onChange={e => setClientNumero(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Bairro
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Centro"
                    value={clientBairro}
                    onChange={e => setClientBairro(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
              </div>

              {/* Complemento, Cidade, UF */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Complemento
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: Bloco A, Sala 5"
                    value={clientComplemento}
                    onChange={e => setClientComplemento(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Cidade
                  </label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo"
                    value={clientCidade}
                    onChange={e => setClientCidade(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    UF (Estado)
                  </label>
                  <select
                    value={clientUf}
                    onChange={e => setClientUf(e.target.value)}
                    className="w-full bg-white border border-slate-200 rounded text-xs p-2 outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-sm"
                  >
                    <option value="">Selecione...</option>
                    {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                      <option key={uf} value={uf}>{uf}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Compras na Empresa / Portaria */}
              <div className="bg-emerald-50/50 border border-emerald-150 p-3 rounded-lg flex items-center justify-between mt-3.5 shadow-3xs">
                <div className="space-y-0.5">
                  <label className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                    Compra na Empresa / Retira na Portaria?
                  </label>
                  <p className="text-[9.5px] text-emerald-600/90 leading-tight">
                    Se ativado, este cliente aparecerá na lista da portaria para liberação de entrada/saída.
                  </p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={clientComprasNaEmpresa}
                    onChange={e => setClientComprasNaEmpresa(e.target.checked)}
                    className="sr-only peer"
                  />
                  <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                </label>
              </div>

              {/* Linkings (Vehicles and Drivers) */}
              <div className="border-t border-slate-250 pt-3 mt-3 grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Veículos Vinculados (Múltiplos)
                  </label>
                  <div className="bg-white border border-slate-200 rounded p-2 max-h-36 overflow-y-auto space-y-1 shadow-sm">
                    {(() => {
                      const list = registeredVehicles.filter(v => 
                        clientVehicleIds.includes(v.id) || !registeredClients.some(c => (c.vehicleIds || []).includes(v.id) || c.defaultVehicleId === v.id)
                      );
                      if (list.length === 0) {
                        return <span className="text-slate-400 italic text-[10px] block p-1">Nenhum veículo disponível (já vinculados)</span>;
                      }
                      return list.map(v => {
                        const isChecked = clientVehicleIds.includes(v.id);
                        return (
                          <label key={v.id} className="flex items-center space-x-2 text-xs p-1 hover:bg-slate-50 rounded cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => {
                                if (isChecked) {
                                  setClientVehicleIds(clientVehicleIds.filter(id => id !== v.id));
                                } else {
                                  const nextVehs = [...clientVehicleIds, v.id];
                                  setClientVehicleIds(nextVehs);
                                  // Auto check its pre-linked driver if present and not already checked
                                  if (v.defaultDriverId && !clientDriverIds.includes(v.defaultDriverId)) {
                                    setClientDriverIds(prev => [...prev, v.defaultDriverId!]);
                                  }
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5"
                            />
                            <span className="font-mono font-bold text-slate-700">{v.plate}</span>
                            <span className="text-slate-400 text-[10px]/none">({v.model || getVehicleTypeLabel(v.vehicleType)})</span>
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                    Motoristas Vinculados (Múltiplos)
                  </label>
                  <div className="bg-white border border-slate-200 rounded p-2 max-h-36 overflow-y-auto space-y-1 shadow-sm">
                    {(() => {
                      const list = registeredDrivers.filter(d => 
                        clientDriverIds.includes(d.id) || !registeredClients.some(c => (c.driverIds || []).includes(d.id) || c.defaultDriverId === d.id)
                      );
                      if (list.length === 0) {
                        return <span className="text-slate-400 italic text-[10px] block p-1">Nenhum motorista disponível (já vinculados)</span>;
                      }
                      return list.map(d => {
                        const isChecked = clientDriverIds.includes(d.id);
                        const matchingVeh = registeredVehicles.find(veh => clientVehicleIds.includes(veh.id) && veh.defaultDriverId === d.id);
                        const isRequiredByVehicle = !!matchingVeh;
                        return (
                          <label key={d.id} className="flex items-center space-x-2 text-xs p-1 hover:bg-slate-50 rounded cursor-pointer select-none">
                            <input
                              type="checkbox"
                              checked={isChecked || isRequiredByVehicle}
                              disabled={isRequiredByVehicle}
                              onChange={() => {
                                if (isRequiredByVehicle) return;
                                if (isChecked) {
                                  setClientDriverIds(clientDriverIds.filter(id => id !== d.id));
                                } else {
                                  setClientDriverIds([...clientDriverIds, d.id]);
                                }
                              }}
                              className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3.5 w-3.5 disabled:opacity-50"
                            />
                            <span className="font-bold text-slate-700">{d.name}</span>
                            <span className="text-slate-400 text-[10px] uppercase font-semibold">({d.driverType === 'interno' ? 'Frota' : 'Cliente'})</span>
                            {isRequiredByVehicle && (
                              <span className="text-blue-600 text-[8.5px] font-bold uppercase ml-1 animate-pulse">
                                ({matchingVeh.plate})
                              </span>
                            )}
                          </label>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {clientSuccess && (
                <div className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded border border-emerald-200 uppercase">
                  {clientSuccess}
                </div>
              )}
              {clientError && (
                <div className="text-[11px] font-bold text-rose-600 bg-rose-50 px-2.5 py-1.5 rounded border border-rose-200 uppercase">
                  {clientError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase tracking-wider p-2.5 rounded shadow transition-colors flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Plus size={14} /> Salvar Cliente
              </button>
            </form>
          </div>

          {/* Right Column: Search & Registered Clients Table */}
          <div className="lg:col-span-7 space-y-4 flex flex-col bg-slate-50/40 p-4.5 rounded-xl border border-slate-200 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
              <div className="flex items-center space-x-2.5 bg-white px-3 py-2.5 rounded-xl border border-slate-250 shadow-xs flex-1">
                <Search size={15} className="text-blue-500 shrink-0" />
                <input
                  type="text"
                  placeholder="Pesquisar por nome, código ou nome fantasia..."
                  value={searchClientQuery}
                  onChange={e => setSearchClientQuery(e.target.value)}
                  className="w-full bg-transparent border-none text-xs outline-none text-slate-700 placeholder-slate-400 font-semibold"
                />
              </div>
              <label className="flex items-center space-x-2 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/60 px-3 py-2.5 rounded-xl text-xs font-bold text-emerald-800 cursor-pointer transition select-none self-start sm:self-auto shrink-0 shadow-3xs">
                <input
                  type="checkbox"
                  checked={filterOnlyCompanyClients}
                  onChange={e => setFilterOnlyCompanyClients(e.target.checked)}
                  className="rounded text-emerald-600 focus:ring-emerald-500 h-3.5 w-3.5 cursor-pointer accent-emerald-600"
                />
                <span>🏢 Compra na Empresa / Portaria</span>
              </label>
            </div>

            <div className="flex items-center justify-between border-b border-slate-150 pb-2">
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">Clientes Cadastrados ({filteredClients.length})</h3>
            </div>

            <div className="overflow-auto max-h-[580px] bg-white rounded-xl border border-slate-150 shadow-inner p-1">
              <table className="w-full text-left text-xs">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-200">
                    <th className="pb-2 font-bold uppercase text-[10px] text-slate-500">Razão Social / Cliente</th>
                    <th className="pb-2 font-bold uppercase text-[10px] text-slate-500 font-sans">Vínculos Padrão</th>
                    <th className="pb-2 text-right font-bold uppercase text-[10px] text-slate-500">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 font-medium">
                  {filteredClients.map(cli => {
                    // Gather linked vehicles and drivers
                    const vIds = cli.vehicleIds || (cli.defaultVehicleId ? [cli.defaultVehicleId] : []);
                    const dIds = cli.driverIds || (cli.defaultDriverId ? [cli.defaultDriverId] : []);

                    const cliVehicles = registeredVehicles.filter(v => vIds.includes(v.id));
                    const cliDrivers = registeredDrivers.filter(d => dIds.includes(d.id));

                    return (
                      <React.Fragment key={cli.id}>
                        <tr className="hover:bg-slate-50/60 font-semibold text-slate-700 border-b border-slate-100/60">
                          <td className="py-3 font-bold text-slate-800 pr-2">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {cli.codigo && (
                                <span className="bg-slate-200 text-slate-800 text-[9px] font-bold px-1.5 py-0.5 rounded font-mono">
                                  {cli.codigo}
                                </span>
                              )}
                              <span className="font-sans font-bold text-slate-900 uppercase text-xs">
                                {cli.name}
                              </span>
                              {cli.comprasNaEmpresa && (
                                <span className="bg-emerald-100 text-emerald-800 text-[9px] font-extrabold px-1.5 py-0.5 rounded uppercase flex items-center gap-0.5">
                                  🏢 Compra na Empresa
                                </span>
                              )}
                            </div>
                            {cli.apelidoFantasia && (
                              <div className="text-[10px] text-slate-500 font-medium italic mt-0.5">
                                Fantasia: {cli.apelidoFantasia}
                              </div>
                            )}
                            <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-[9px] text-slate-400 uppercase font-mono mt-1">
                              <span>ID: {cli.id}</span>
                              {cli.personType && (
                                <span className="text-blue-600 font-bold">
                                  ({cli.personType === 'fisica' ? 'Pessoa Física' : 'Pessoa Jurídica'})
                                </span>
                              )}
                              {cli.cpfCnpj && (
                                <span>{cli.personType === 'fisica' ? 'CPF' : 'CNPJ'}: {cli.cpfCnpj}</span>
                              )}
                              {cli.rgIe && (
                                <span>{cli.personType === 'fisica' ? 'RG' : 'IE'}: {cli.rgIe}</span>
                              )}
                            </div>
                            {(cli.endereco || cli.cidade || cli.telefone) && (
                              <div className="text-[10px] text-slate-500 font-medium mt-1.5 bg-slate-50/70 p-2 rounded border border-slate-100 max-w-sm space-y-0.5">
                                {cli.endereco && (
                                  <div>📍 {cli.endereco}, {cli.numero} {cli.bairro && `- ${cli.bairro}`} {cli.complemento && `(${cli.complemento})`}</div>
                                )}
                                {(cli.cidade || cli.uf) && (
                                  <div>🏙️ {cli.cidade}{cli.cidade && cli.uf && ', '}{cli.uf}</div>
                                )}
                                {cli.telefone && (
                                  <div>📞 {cli.ddd && `(${cli.ddd}) `}{cli.telefone}</div>
                                )}
                              </div>
                            )}
                          </td>
                          <td className="py-2.5">
                            <div className="space-y-2">
                              {/* List of Vehicles */}
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] uppercase text-slate-400 font-bold block">Veículos ({cliVehicles.length}):</span>
                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                  {cliVehicles.length === 0 ? (
                                    <span className="text-slate-400 italic text-[10px]">Apenas avulso</span>
                                  ) : (
                                    cliVehicles.map(v => (
                                      <span key={v.id} className="inline-flex items-center bg-blue-50 text-blue-700 text-[9px] font-bold font-mono px-1.5 py-0.5 rounded border border-blue-100">
                                        {v.plate}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>
                              
                              {/* List of Drivers */}
                              <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] uppercase text-slate-400 font-bold block font-sans">Motoristas ({cliDrivers.length}):</span>
                                <div className="flex flex-wrap gap-1 max-w-[220px]">
                                  {cliDrivers.length === 0 ? (
                                    <span className="text-slate-400 italic text-[10px]">Apenas avulso</span>
                                  ) : (
                                    cliDrivers.map(d => (
                                      <span key={d.id} className="inline-flex items-center bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded border border-emerald-100" title={d.name}>
                                        {d.name.split(' ')[0]}
                                      </span>
                                    ))
                                  )}
                                </div>
                              </div>

                              {!isReadOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    if (editingClientId === cli.id) {
                                      setEditingClientId('');
                                      setEditingClientName('');
                                    } else {
                                      setEditingClientId(cli.id);
                                      setEditingClientName(cli.name);
                                      setEditingClientCode(cli.codigo || '');
                                      setEditingClientApelido(cli.apelidoFantasia || '');
                                      setEditingClientPersonType(cli.personType || 'fisica');
                                      setEditingClientRgIe(cli.rgIe || '');
                                      setEditingClientCpfCnpj(cli.cpfCnpj || '');
                                      setEditingClientEndereco(cli.endereco || '');
                                      setEditingClientNumero(cli.numero || '');
                                      setEditingClientBairro(cli.bairro || '');
                                      setEditingClientComplemento(cli.complemento || '');
                                      setEditingClientCidade(cli.cidade || '');
                                      setEditingClientUf(cli.uf || '');
                                      setEditingClientDdd(cli.ddd || '');
                                      setEditingClientTelefone(cli.telefone || '');
                                      setEditingClientComprasNaEmpresa(cli.comprasNaEmpresa || false);
                                    }
                                  }}
                                  className="text-[9px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 hover:bg-blue-100 border border-blue-200 px-2.5 py-1.5 rounded transition mt-1.5 cursor-pointer block text-center max-w-[170px]"
                                >
                                  ⚙️ Editar Dados & Vínculos
                                </button>
                              )}
                            </div>
                          </td>
                          <td className="py-2.5 text-right font-bold">
                            <button
                              onClick={() => removeRegisteredClient(cli.id)}
                              className="text-red-500 hover:text-red-700 p-1.5 transition cursor-pointer"
                              title="Remover Cadastro de Cliente"
                            >
                              <Trash2 size={14} />
                            </button>
                          </td>
                        </tr>

                        {/* Expandable Vínculos Management Section */}
                        {editingClientId === cli.id && !isReadOnly && (
                          <tr className="bg-slate-100/70" key={`edit-${cli.id}`}>
                            <td colSpan={3} className="px-4 py-4 border-t border-b border-slate-300">
                              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                                  📝 Editar Informações do Cliente: <span className="text-blue-600">{cli.name}</span>
                                </h4>
                                
                                {/* Form fields for editing client */}
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Código
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientCode}
                                      onChange={e => setEditingClientCode(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Nome / Razão Social *
                                    </label>
                                    <input
                                      type="text"
                                      required
                                      value={editingClientName}
                                      onChange={e => setEditingClientName(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-750 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Apelido / Nome Fantasia
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientApelido}
                                      onChange={e => setEditingClientApelido(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Tipo de Pessoa
                                    </label>
                                    <div className="grid grid-cols-2 gap-1 bg-slate-100 p-0.5 rounded border border-slate-200 shadow-inner">
                                      <button
                                        type="button"
                                        onClick={() => setEditingClientPersonType('fisica')}
                                        className={`py-1 rounded text-xs font-semibold transition ${
                                          editingClientPersonType === 'fisica'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        Física
                                      </button>
                                      <button
                                        type="button"
                                        onClick={() => setEditingClientPersonType('juridica')}
                                        className={`py-1 rounded text-xs font-semibold transition ${
                                          editingClientPersonType === 'juridica'
                                            ? 'bg-blue-600 text-white shadow-xs'
                                            : 'text-slate-600 hover:bg-slate-50'
                                        }`}
                                      >
                                        Jurídica
                                      </button>
                                    </div>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      {editingClientPersonType === 'fisica' ? 'CPF' : 'CNPJ'}
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientCpfCnpj}
                                      onChange={e => setEditingClientCpfCnpj(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      {editingClientPersonType === 'fisica' ? 'RG' : 'Inscrição Estadual (IE)'}
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientRgIe}
                                      onChange={e => setEditingClientRgIe(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-4 gap-2">
                                  <div className="col-span-1">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1 text-center">
                                      DDD
                                    </label>
                                    <input
                                      type="text"
                                      maxLength={3}
                                      placeholder="11"
                                      value={editingClientDdd}
                                      onChange={e => setEditingClientDdd(e.target.value.replace(/\D/g, ''))}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 text-center shadow-xs"
                                    />
                                  </div>
                                  <div className="col-span-3">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Telefone
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientTelefone}
                                      onChange={e => setEditingClientTelefone(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Endereço
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientEndereco}
                                      onChange={e => setEditingClientEndereco(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Número
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientNumero}
                                      onChange={e => setEditingClientNumero(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Bairro
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientBairro}
                                      onChange={e => setEditingClientBairro(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                                  <div className="sm:col-span-2">
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Complemento
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientComplemento}
                                      onChange={e => setEditingClientComplemento(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      Cidade
                                    </label>
                                    <input
                                      type="text"
                                      value={editingClientCidade}
                                      onChange={e => setEditingClientCidade(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-1">
                                      UF (Estado)
                                    </label>
                                    <select
                                      value={editingClientUf}
                                      onChange={e => setEditingClientUf(e.target.value)}
                                      className="w-full bg-slate-50 border border-slate-200 rounded text-xs p-2 outline-none font-bold text-slate-700 focus:border-blue-400 focus:ring-1 focus:ring-blue-400 shadow-xs"
                                    >
                                      <option value="">Selecione...</option>
                                      {['AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO'].map(uf => (
                                        <option key={uf} value={uf}>{uf}</option>
                                      ))}
                                    </select>
                                  </div>
                                </div>

                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 border-t border-slate-100 pt-3">
                                  <div>
                                    <h5 className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                                      🚚 Veículos Vinculados
                                    </h5>
                                    <div className="bg-slate-50 border border-slate-200 rounded p-2 max-h-32 overflow-y-auto space-y-1 shadow-inner">
                                      {(() => {
                                        const list = registeredVehicles.filter(v => 
                                          vIds.includes(v.id) || !registeredClients.some(c => c.id !== cli.id && ((c.vehicleIds || []).includes(v.id) || c.defaultVehicleId === v.id))
                                        );
                                        if (list.length === 0) {
                                          return <span className="text-slate-400 italic text-[10px] block p-1">Nenhum veículo disponível</span>;
                                        }
                                        return list.map(v => {
                                          const isChecked = vIds.includes(v.id);
                                          return (
                                            <label key={v.id} className="flex items-center space-x-2 text-[11px] p-1 hover:bg-white rounded cursor-pointer select-none">
                                              <input
                                                type="checkbox"
                                                checked={isChecked}
                                                onChange={() => {
                                                  const nextIds = isChecked ? vIds.filter(id => id !== v.id) : [...vIds, v.id];
                                                  let nextDriverIds = [...dIds];
                                                  if (!isChecked && v.defaultDriverId && !nextDriverIds.includes(v.defaultDriverId)) {
                                                    nextDriverIds.push(v.defaultDriverId);
                                                  }
                                                  updateRegisteredClient(cli.id, {
                                                    vehicleIds: nextIds,
                                                    defaultVehicleId: nextIds[0] || undefined,
                                                    driverIds: nextDriverIds,
                                                    defaultDriverId: nextDriverIds[0] || undefined
                                                  });
                                                }}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3"
                                              />
                                              <span className="font-mono font-bold text-slate-700">{v.plate}</span>
                                              <span className="text-slate-400 text-[9px]">({v.model || getVehicleTypeLabel(v.vehicleType)})</span>
                                            </label>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>

                                  <div>
                                    <h5 className="text-[10px] font-bold uppercase text-slate-500 mb-1.5 flex items-center gap-1">
                                      👤 Motoristas Vinculados
                                    </h5>
                                    <div className="bg-slate-50 border border-slate-200 rounded p-2 max-h-32 overflow-y-auto space-y-1 shadow-inner">
                                      {(() => {
                                        const list = registeredDrivers.filter(d => 
                                          dIds.includes(d.id) || !registeredClients.some(c => c.id !== cli.id && ((c.driverIds || []).includes(d.id) || c.defaultDriverId === d.id))
                                        );
                                        if (list.length === 0) {
                                          return <span className="text-slate-400 italic text-[10px] block p-1">Nenhum motorista disponível</span>;
                                        }
                                        return list.map(d => {
                                          const isChecked = dIds.includes(d.id);
                                          const matchingVeh = registeredVehicles.find(veh => vIds.includes(veh.id) && veh.defaultDriverId === d.id);
                                          const isRequiredByVehicle = !!matchingVeh;
                                          return (
                                            <label key={d.id} className="flex items-center space-x-2 text-[11px] p-1 hover:bg-white rounded cursor-pointer select-none">
                                              <input
                                                type="checkbox"
                                                checked={isChecked || isRequiredByVehicle}
                                                disabled={isRequiredByVehicle}
                                                onChange={() => {
                                                  if (isRequiredByVehicle) return;
                                                  const nextIds = isChecked ? dIds.filter(id => id !== d.id) : [...dIds, d.id];
                                                  updateRegisteredClient(cli.id, {
                                                    driverIds: nextIds,
                                                    defaultDriverId: nextIds[0] || undefined
                                                  });
                                                }}
                                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500 h-3 w-3 disabled:opacity-50"
                                              />
                                              <span className="font-bold text-slate-700">{d.name}</span>
                                              <span className="text-slate-400 text-[9px] uppercase font-bold">({d.driverType === 'interno' ? 'Frota' : 'Cliente'})</span>
                                              {isRequiredByVehicle && (
                                                <span className="text-blue-600 text-[8.5px] font-bold uppercase ml-1">
                                                  ({matchingVeh.plate})
                                                </span>
                                              )}
                                            </label>
                                          );
                                        });
                                      })()}
                                    </div>
                                  </div>
                                </div>

                                {/* Compras na Empresa / Portaria Toggle */}
                                <div className="mt-4 bg-emerald-50 border border-emerald-150 p-3 rounded-lg flex items-center justify-between shadow-3xs">
                                  <div className="space-y-0.5">
                                    <label className="text-[11px] font-extrabold text-emerald-800 uppercase tracking-wider block">
                                      Compra na Empresa / Retira na Portaria?
                                    </label>
                                    <p className="text-[9.5px] text-emerald-600/90 leading-tight">
                                      Se ativado, este cliente aparecerá na portaria para registro de entrada e saída.
                                    </p>
                                  </div>
                                  <label className="relative inline-flex items-center cursor-pointer select-none">
                                    <input
                                      type="checkbox"
                                      checked={editingClientComprasNaEmpresa}
                                      onChange={e => setEditingClientComprasNaEmpresa(e.target.checked)}
                                      className="sr-only peer"
                                    />
                                    <div className="w-10 h-5 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:bg-emerald-600 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-4 after:w-4 after:transition-all"></div>
                                  </label>
                                </div>

                                <div className="flex items-center justify-between gap-3 pt-3">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      if (editingClientName.trim() === '') {
                                        alert('O Nome/Razão Social do cliente não pode ser em branco.');
                                        return;
                                      }
                                      updateRegisteredClient(cli.id, {
                                        codigo: editingClientCode.trim(),
                                        name: editingClientName.trim(),
                                        apelidoFantasia: editingClientApelido.trim(),
                                        personType: editingClientPersonType,
                                        rgIe: editingClientRgIe.trim(),
                                        cpfCnpj: editingClientCpfCnpj.trim(),
                                        endereco: editingClientEndereco.trim(),
                                        numero: editingClientNumero.trim(),
                                        bairro: editingClientBairro.trim(),
                                        complemento: editingClientComplemento.trim(),
                                        cidade: editingClientCidade.trim(),
                                        uf: editingClientUf,
                                        ddd: editingClientDdd.trim(),
                                        telefone: editingClientTelefone.trim(),
                                        comprasNaEmpresa: editingClientComprasNaEmpresa
                                      });
                                      setEditingClientId('');
                                      setEditingClientName('');
                                    }}
                                    className="bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs uppercase py-2 px-4 rounded shadow transition-colors flex items-center gap-1 cursor-pointer"
                                  >
                                    <Check size={14} /> Salvar Alterações
                                  </button>

                                  <button
                                    type="button"
                                    onClick={() => {
                                      setEditingClientId('');
                                      setEditingClientName('');
                                    }}
                                    className="px-3 py-2 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded text-xs font-bold uppercase cursor-pointer transition-colors"
                                  >
                                    Cancelar
                                  </button>
                                </div>
                              </div>
                            </td>
                          </tr>
                        )}
                      </React.Fragment>
                    );
                  })}
                  {filteredClients.length === 0 && (
                    <tr>
                      <td colSpan={3} className="py-8 text-center text-slate-400 uppercase tracking-wide text-[10px]">
                        Nenhum cliente pré-cadastrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
