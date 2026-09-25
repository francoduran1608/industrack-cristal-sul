import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import { initializeApp, setLogLevel as setAppLogLevel } from "firebase/app";
import { initializeFirestore, doc, getDoc, setDoc, onSnapshot, setLogLevel as setFirestoreLogLevel } from "firebase/firestore";
import { firebirdRouter } from "./server/firebird/routes.js";
import { FirebirdService } from "./server/firebird/service.js";
import { integrationRouter, notifyExternalSystem } from "./server/integration/routes.js";

try {
  setAppLogLevel('silent');
  setFirestoreLogLevel('silent');
} catch (e) {}

const cleanState = {
  movements: [],
  supplies: [],
  dieselPurchases: [],
  initialDieselStock: 0,
  arlaPurchases: [],
  initialArlaStock: 0,
  customChecklistItems: ['Cinto de Segurança', 'Nível do Óleo', 'Extintor de Incêndio', 'Vidros e Retrovisores'],
  systemUsers: [
    {
      id: 'user-admin',
      name: 'Administrador Geral',
      username: 'admin',
      password: '123456',
      role: 'admin',
      modules: {
        portaria: true,
        fila: true,
        abastecimento: true,
        relatorios: true,
        chat: true,
        config: true
      }
    },
    {
      id: 'user-portaria',
      name: 'Operador de Portaria',
      username: 'portaria',
      password: '123456',
      role: 'operador',
      modules: {
        portaria: true,
        fila: false,
        abastecimento: false,
        relatorios: false,
        chat: true,
        config: false
      }
    },
    {
      id: 'user-posto',
      name: 'Operador do Posto',
      username: 'posto',
      password: '123456',
      role: 'operador',
      modules: {
        portaria: false,
        fila: false,
        abastecimento: true,
        relatorios: false,
        chat: true,
        config: false
      }
    }
  ],
  registeredVehicles: [],
  registeredDrivers: [],
  registeredClients: [],
  companyLogo: '',
  customVehicleCategories: [
    { id: 'carreta', name: 'Carreta (Pesada)', bypassProductionDefault: false },
    { id: 'truck', name: 'Truck (Pesada)', bypassProductionDefault: false },
    { id: 'toco', name: 'Toco (Média)', bypassProductionDefault: false },
    { id: '3/4', name: '3/4 (Média)', bypassProductionDefault: false },
    { id: 'passeio', name: 'Passeio (Leve)', bypassProductionDefault: true },
    { id: 'moto', name: 'Moto', bypassProductionDefault: true },
    { id: 'utilitario', name: 'Utilitário / Van', bypassProductionDefault: true }
  ],
  customEntryPurposes: [
    { id: 'producao', name: 'Fluxo Normal de Produção (Fila)', bypassProductionDefault: false },
    { id: 'carga_descarga', name: 'Carga / Descarga de Mercadorias', bypassProductionDefault: true },
    { id: 'entrega_mercadoria', name: 'Entregas de Insumos / Encomendas', bypassProductionDefault: true },
    { id: 'visita_servico', name: 'Visita ou Prestação de Serviços', bypassProductionDefault: true }
  ],
  customStockProducts: [],
  initialStockLevels: {},
  initialDieselStocks: {},
  dieselTankCapacities: {},
  initialArlaStocks: {},
  arlaTankCapacities: {},
  deletedMovementsLogs: [],
  productionOpen: {},
  manualStockAdjustments: [],
  resolvedStockAlerts: [],
  verifiedScrapAlerts: [],
  scrapConferences: [],
  driverSettlements: [],
  bankTransactions: [],
  clearedAt: 0,
  deletedIds: []
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Shared state cloud database on server-side using local database file as fallback/baseline
  let sharedState: any = null;
  let activeDb: any = null;
  const dbPath = path.join(process.cwd(), "database.json");

  // Shared photos database file for backup of large split photos
  let sharedPhotos: Record<string, any> = {};
  const photosDbPath = path.join(process.cwd(), "database_photos.json");

  // Load photos from local file on start if exists
  try {
    const pExists = await fs.access(photosDbPath).then(() => true).catch(() => false);
    if (pExists) {
      const pData = await fs.readFile(photosDbPath, "utf-8");
      sharedPhotos = JSON.parse(pData);
      console.log("Loaded backup photos state from disk:", Object.keys(sharedPhotos).length, "records");
    }
  } catch (err) {
    console.error("Error reading database_photos.json", err);
  }

  // Load from local file on start if exists
  try {
    const exists = await fs.access(dbPath).then(() => true).catch(() => false);
    if (exists) {
      const data = await fs.readFile(dbPath, "utf-8");
      sharedState = JSON.parse(data);
      console.log("Shared database state loaded from disk:", !!sharedState);
    } else {
      sharedState = cleanState;
      await fs.writeFile(dbPath, JSON.stringify(sharedState, null, 2), "utf-8");
      console.log("Initial database.json created.");
    }
  } catch (err) {
    console.error("Error reading database.json", err);
    sharedState = cleanState;
  }

  let docRef: any = null;
  let isFirestoreLoaded = false;
  let isFirestoreQuotaExhausted = false;

  // Load initial state from Firestore if exists, or seed with default state
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const configExists = await fs.access(configPath).then(() => true).catch(() => false);
    if (!configExists) {
      console.log("No firebase-applet-config.json found. Operating in local fallback mode.");
      isFirestoreLoaded = true;
    } else {
      const configContent = await fs.readFile(configPath, "utf-8");
      const config = JSON.parse(configContent);
      
      const fbApp = initializeApp(config);
      const db = initializeFirestore(fbApp, {}, config.firestoreDatabaseId);
      activeDb = db;
      
      const firestoreState = await loadFullStateFromFirestore(db);
      
      if (firestoreState) {
        // Restore existing Firestore state into server's sharedState memory on boot
        sharedState = firestoreState;
        await fs.writeFile(dbPath, JSON.stringify(sharedState, null, 2), "utf-8");
        console.log("Existing Firestore database state loaded on startup successfully.");
      } else {
        // First-time load: seed Firestore with the default state
        await saveFullStateToFirestore(db, sharedState || cleanState);
        console.log("Firestore collection seeded with initial state or running on local fallback.");
      }
      isFirestoreLoaded = true;

      // Set up a server-side real-time listener on appState/main
      if (!isFirestoreQuotaExhausted) {
        const mainDocRef = doc(db, "appState", "main");
        onSnapshot(mainDocRef, async (snapshot: any) => {
          if (snapshot && snapshot.exists() && !isFirestoreQuotaExhausted) {
            const freshCloudState = await loadFullStateFromFirestore(db);
            if (freshCloudState) {
              sharedState = freshCloudState;
              fs.writeFile(dbPath, JSON.stringify(sharedState, null, 2), "utf-8").catch(() => {});
              console.log("Server sharedState updated dynamically in real-time from Firestore.");
            }
          }
        }, (err: any) => {
          if (err?.code === 'cancelled' || err?.message?.includes('CANCELLED') || err?.code === 1) {
            return;
          }
          if (err?.message?.includes('Quota exceeded') || err?.code === 'resource-exhausted' || err?.code === 8) {
            console.warn("Firestore listener quota exceeded on server. Falling back to local database.json storage.");
            isFirestoreQuotaExhausted = true;
          } else {
            console.error("Firestore onSnapshot subscription failed on server:", err);
          }
        });
      }
    }
  } catch (err: any) {
    if (err?.message?.includes('Quota exceeded') || err?.code === 'resource-exhausted' || err?.code === 8) {
      console.warn("Firestore quota exceeded on startup. Falling back to local database.json storage.");
      isFirestoreQuotaExhausted = true;
    } else {
      console.error("Error connecting or seeding state in Firestore on start:", err);
    }
    isFirestoreLoaded = true;
  }

  // Rotas de integração com Banco de Dados Firebird 5.0 e Stored Procedures
  app.use("/api/firebird", firebirdRouter);

  // Rotas de integração padronizada para sistemas externos (ERP, Fiscal, Estoque)
  app.use("/api/v1/integracao", integrationRouter);

  app.get("/api/state", async (req, res) => {
    try {
      res.json(sharedState || cleanState);
    } catch (err: any) {
      console.error("Error running fallback get:", err);
      res.status(500).json({ error: err.message });
    }
  });

  app.get("/api/photos/:id", (req, res) => {
    const { id } = req.params;
    res.json(sharedPhotos[id] || {});
  });

  app.post("/api/photos/:id", async (req, res) => {
    try {
      const { id } = req.params;
      sharedPhotos[id] = req.body;
      await fs.writeFile(photosDbPath, JSON.stringify(sharedPhotos, null, 2), "utf-8");
      res.json({ status: "success" });
    } catch (err: any) {
      console.error("Error saving photos file fallback:", err);
      res.status(500).json({ error: err.message });
    }
  });

function stripHeavyDataForServer(state: any): any {
  if (!state || typeof state !== "object") return state;

  const strippedMovements = (state.movements || []).map((m: any) => {
    if (!m) return m;
    let newM = m;
    let changed = false;

    if (m.orderPhoto && (m.orderPhoto.startsWith('data:') || m.orderPhoto.length > 200)) {
      if (!changed) { newM = { ...m }; changed = true; }
      newM.hasOrderPhoto = true;
      newM.orderPhoto = '';
    }

    if (m.productionControl) {
      let pcChanged = false;
      let newPC = m.productionControl;

      if (m.productionControl.avariasDescarregamentoPhoto && (m.productionControl.avariasDescarregamentoPhoto.startsWith('data:') || m.productionControl.avariasDescarregamentoPhoto.length > 200)) {
        if (!pcChanged) { newPC = { ...m.productionControl }; pcChanged = true; }
        newPC.hasAvariasDescarregamentoPhoto = true;
        newPC.avariasDescarregamentoPhoto = '';
      }

      if (m.productionControl.avariasCarregamentoPhoto && (m.productionControl.avariasCarregamentoPhoto.startsWith('data:') || m.productionControl.avariasCarregamentoPhoto.length > 200)) {
        if (!pcChanged) { newPC = { ...m.productionControl }; pcChanged = true; }
        newPC.hasAvariasCarregamentoPhoto = true;
        newPC.avariasCarregamentoPhoto = '';
      }

      if (pcChanged) {
        if (!changed) { newM = { ...m }; changed = true; }
        newM.productionControl = newPC;
      }
    }

    return newM;
  });

  const strippedExpeditions = (state.disposableExpeditions || []).map((exp: any) => {
    if (!exp) return exp;
    if (exp.attachmentUrl && (exp.attachmentUrl.startsWith('data:') || exp.attachmentUrl.length > 200)) {
      return { ...exp, hasAttachment: true, attachmentUrl: '' };
    }
    return exp;
  });

  const strippedInsumos = (state.disposableInsumoEntries || []).map((ins: any) => {
    if (!ins) return ins;
    if (ins.attachmentUrl && (ins.attachmentUrl.startsWith('data:') || ins.attachmentUrl.length > 200)) {
      return { ...ins, hasAttachment: true, attachmentUrl: '' };
    }
    return ins;
  });

  const strippedTripLoads = (state.driverTripLoads || []).map((load: any) => {
    if (!load) return load;
    if (load.attachmentUrl && (load.attachmentUrl.startsWith('data:') || load.attachmentUrl.length > 200)) {
      return { ...load, hasAttachment: true, attachmentUrl: '' };
    }
    return load;
  });

  const strippedTripDeliveries = (state.driverTripDeliveries || []).map((del: any) => {
    if (!del) return del;
    if (del.attachmentUrl && (del.attachmentUrl.startsWith('data:') || del.attachmentUrl.length > 200)) {
      return { ...del, hasAttachment: true, attachmentUrl: '' };
    }
    return del;
  });

  const strippedSettlements = (state.driverSettlements || []).map((ds: any) => {
    if (!ds) return ds;
    let changed = false;
    let newDs = ds;
    if (ds.attachmentUrl && (ds.attachmentUrl.startsWith('data:') || ds.attachmentUrl.length > 200)) {
      newDs = { ...newDs, hasAttachment: true, attachmentUrl: '' };
      changed = true;
    }
    return newDs;
  });

  const strippedPreSales = (state.preSales || []).map((ps: any) => {
    if (!ps) return ps;
    const att = ps.attachmentUrl || ps.photoUrl || ps.expeditionPhoto;
    if (att && (att.startsWith('data:') || att.length > 200)) {
      return { ...ps, hasAttachment: true, attachmentUrl: '', photoUrl: '', expeditionPhoto: '' };
    }
    return ps;
  });

  const sanitizeDeep = (obj: any): any => {
    if (!obj || typeof obj !== 'object') return obj;
    if (Array.isArray(obj)) return obj.map(sanitizeDeep).filter(item => item !== undefined);
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const val = obj[key];
      if (val === undefined) continue;
      if (key === 'companyLogo' || key === 'signature' || key === 'clientSignature') {
        result[key] = val;
      } else if (typeof val === 'string' && (val.startsWith('data:') || (val.length > 200 && key.toLowerCase().includes('photo')))) {
        result[key] = '';
      } else if (typeof val === 'object' && val !== null) {
        result[key] = sanitizeDeep(val);
      } else {
        result[key] = val;
      }
    }
    return result;
  };

  const systemAuditLogs = (state.systemAuditLogs || []).slice(0, 300);
  const deletedMovementsLogs = (state.deletedMovementsLogs || []).slice(0, 300);

  return sanitizeDeep({
    ...state,
    movements: strippedMovements,
    disposableExpeditions: strippedExpeditions,
    disposableInsumoEntries: strippedInsumos,
    driverTripLoads: strippedTripLoads,
    driverTripDeliveries: strippedTripDeliveries,
    driverSettlements: strippedSettlements,
    preSales: strippedPreSales,
    systemAuditLogs,
    deletedMovementsLogs
  });
}

async function saveFullStateToFirestore(db: any, state: any) {
  if (!db || isFirestoreQuotaExhausted) return;
  try {
    const rawClean = stripHeavyDataForServer(state);
    const cleanState = JSON.parse(JSON.stringify(rawClean));

    const { registeredClients = [], systemAuditLogs = [], deletedMovementsLogs = [], ...mainState } = cleanState;

    const clientChunkCount = Math.ceil(registeredClients.length / 400);

    // 1. Save main state document
    const mainDocRef = doc(db, "appState", "main");
    await setDoc(mainDocRef, {
      ...mainState,
      _clientChunkCount: clientChunkCount,
      _updatedAt: new Date().toISOString()
    });

    // 2. Save logs document
    const logsDocRef = doc(db, "appState", "logs");
    await setDoc(logsDocRef, {
      systemAuditLogs: systemAuditLogs.slice(0, 300),
      deletedMovementsLogs: deletedMovementsLogs.slice(0, 300)
    });

    // 3. Save clients in chunks of 400 items (~140KB per chunk document, safely under 1MB limit)
    for (let i = 0; i < clientChunkCount; i++) {
      const chunk = registeredClients.slice(i * 400, (i + 1) * 400);
      const chunkDocRef = doc(db, "appState", `clients_${i}`);
      await setDoc(chunkDocRef, { clients: chunk });
    }

    // Legacy fallback: current document with clientChunkCount reference
    try {
      const legacyDocRef = doc(db, "appState", "current");
      await setDoc(legacyDocRef, {
        ...mainState,
        _isChunked: true,
        _clientChunkCount: clientChunkCount,
        _updatedAt: new Date().toISOString()
      });
    } catch (err: any) {
      console.warn("Legacy current doc write skipped:", err.message);
    }
  } catch (err: any) {
    if (err?.message?.includes('Quota exceeded') || err?.code === 'resource-exhausted' || err?.code === 8) {
      console.warn("Firestore write quota exceeded on server. Operating in local database.json mode.");
      isFirestoreQuotaExhausted = true;
    } else {
      console.error("Error saving full state to Firestore:", err?.message || err);
    }
  }
}

async function loadFullStateFromFirestore(db: any): Promise<any | null> {
  if (!db || isFirestoreQuotaExhausted) return null;
  try {
    const mainDocRef = doc(db, "appState", "main");
    const mainSnap = await getDoc(mainDocRef);

    let mainData: any = null;
    if (mainSnap.exists()) {
      mainData = mainSnap.data();
    } else {
      const currentDocRef = doc(db, "appState", "current");
      const currentSnap = await getDoc(currentDocRef);
      if (currentSnap.exists()) {
        mainData = currentSnap.data();
      } else {
        return null;
      }
    }

    const clientChunkCount = mainData._clientChunkCount || 0;

    let systemAuditLogs: any[] = mainData.systemAuditLogs || [];
    let deletedMovementsLogs: any[] = mainData.deletedMovementsLogs || [];
    try {
      const logsSnap = await getDoc(doc(db, "appState", "logs"));
      if (logsSnap.exists()) {
        const logsData = logsSnap.data();
        systemAuditLogs = logsData.systemAuditLogs || [];
        deletedMovementsLogs = logsData.deletedMovementsLogs || [];
      }
    } catch (e) {}

    let registeredClients: any[] = mainData.registeredClients || [];
    if (clientChunkCount > 0) {
      registeredClients = [];
      for (let i = 0; i < clientChunkCount; i++) {
        try {
          const chunkSnap = await getDoc(doc(db, "appState", `clients_${i}`));
          if (chunkSnap.exists()) {
            const chunkData = chunkSnap.data();
            if (chunkData.clients && Array.isArray(chunkData.clients)) {
              registeredClients = registeredClients.concat(chunkData.clients);
            }
          }
        } catch (e) {
          console.warn(`Failed loading client chunk clients_${i}:`, e);
        }
      }
    }

    const { _clientChunkCount, _updatedAt, _isChunked, ...cleanMain } = mainData;

    return {
      ...cleanMain,
      registeredClients,
      systemAuditLogs,
      deletedMovementsLogs
    };
  } catch (err: any) {
    if (err?.message?.includes('Quota exceeded') || err?.code === 'resource-exhausted' || err?.code === 8) {
      console.warn("Firestore read quota exceeded on server. Operating in local database.json mode.");
      isFirestoreQuotaExhausted = true;
    } else {
      console.error("Error loading full state from Firestore:", err?.message || err);
    }
    return null;
  }
}

  app.post("/api/state", async (req, res) => {
    try {
      sharedState = stripHeavyDataForServer(req.body);
      await fs.writeFile(dbPath, JSON.stringify(sharedState, null, 2), "utf-8");
      
      // Update central state in Cloud Firestore synchronously using chunking
      if (activeDb) {
        try {
          await saveFullStateToFirestore(activeDb, sharedState);
          console.log("Cloud Firestore synchronized successfully via POST api/state.");
        } catch (fErr: any) {
          console.warn("Could not write update to Firestore from server (permission or network limit). Fallback to database.json is active.", fErr.message);
        }
      }

      // Persistir no Banco de Dados Firebird 5.0 (executando procedures e gravando lançamentos)
      try {
        FirebirdService.sincronizarEstadoCompleto(sharedState).catch((fbErr: any) => {
          if (!fbErr?.message?.includes('Falha de conexão com Firebird')) {
            console.warn("Aviso ao sincronizar Firebird 5.0:", fbErr.message);
          }
        });
      } catch (fbInitErr) {}

      // Notificar sistema externo via Webhook sobre atualizações de dados operacionais
      try {
        notifyExternalSystem('ESTADO_ATUALIZADO', {
          total_movimentos: (sharedState.movements || []).length,
          total_abastecimentos: (sharedState.supplyRecords || []).length,
          timestamp: new Date().toISOString()
        }).catch(() => {});
      } catch (whErr) {}
      
      res.json({ status: "success" });
    } catch (err: any) {
      console.error("Error writing database.json fallbacks:", err);
      res.status(500).json({ error: err.message });
    }
  });

  // Chatbot Gemini API with Search Grounding
  app.post("/api/chat", async (req, res) => {
    try {
      const { messages, message } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GemINI_API_KEY environment variable is missing" });
      }

      const ai = new GoogleGenAI({ apiKey });
      
      const contents = messages.map((m: any) => ({
        role: m.role, // 'user' or 'model'
        parts: [{ text: m.text }]
      }));
      contents.push({ role: "user", parts: [{ text: message }] });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents,
        config: {
          systemInstruction: "Você é um assistente especialista em logística, frotas e operações de pátio industrial. Você ajuda os operadores e gerentes a tirarem dúvidas sobre procedimentos da portaria, informações sobre veículos pesados, consultar tendências de mercado ou orientar sobre manutenções. Seja sempre claro e direto.",
          tools: [{ googleSearch: {} }]
        }
      });
      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Chat Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Insights Generator Gemini API
  app.post("/api/analyze", async (req, res) => {
    try {
      const { data } = req.body;
      const apiKey = process.env.GEMINI_API_KEY;
      if (!apiKey) {
        return res.status(400).json({ error: "GemINI_API_KEY environment variable is missing" });
      }

      const ai = new GoogleGenAI({ apiKey });

      const prompt = `Você é um analista sênior de dados operacionais de logística. Analise os seguintes dados do nosso sistema industrial (relatórios de entrada/saída de veículos, status da fila de produção, fluxo do posto interno de abastecimento e serviços).
      
Os dados são exportados no formato JSON abaixo:
${JSON.stringify(data)}

Com base nestes dados:
1. Resuma o volume geral das operações (ex: totais).
2. Destaque 2 ou 3 pontos operacionais críticos ou gargalos, se houver, ou elogie as partes fluidas.
3. Sugira uma ação imediata de melhoria na gestão baseada no report (uso de gemini para insights). Use tom gerencial, formatação em Markdown (negritos e bullets).`;

      const response = await ai.models.generateContent({
        model: "gemini-3.1-pro-preview", // Complex analysis
        contents: prompt
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Analysis Error:", error);
      res.status(500).json({ error: error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
