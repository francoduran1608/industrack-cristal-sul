import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import fs from "fs/promises";
import { Firestore } from "@google-cloud/firestore";

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
  customEntryPurposes: []
};

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: "50mb" }));

  // Shared state cloud database on server-side using local database file as fallback/baseline
  let sharedState: any = null;
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

  // Load initial state from Firestore if exists, or seed with default state
  try {
    const configPath = path.join(process.cwd(), "firebase-applet-config.json");
    const configContent = await fs.readFile(configPath, "utf-8");
    const config = JSON.parse(configContent);
    const firestore = new Firestore({
      projectId: config.projectId,
      databaseId: config.firestoreDatabaseId || "(default)"
    });
    docRef = firestore.collection("appState").doc("current");
    const docSnap = await docRef.get();
    
    if (docSnap.exists) {
      // Restore existing Firestore state into server's sharedState memory on boot
      sharedState = docSnap.data();
      await fs.writeFile(dbPath, JSON.stringify(sharedState, null, 2), "utf-8");
      console.log("Existing Firestore database state loaded on startup successfully.");
    } else {
      // First-time load: seed Firestore with the default state
      await docRef.set(sharedState || cleanState);
      console.log("Firestore collection seeded with initial state successfully.");
    }

    // Set up a server-side real-time listener to keep the in-memory cache 100% synchronized with any cloud-side writes (e.g. from direct client-side Firestore writes)
    docRef.onSnapshot((snapshot: any) => {
      if (snapshot && snapshot.exists) {
        sharedState = snapshot.data();
        fs.writeFile(dbPath, JSON.stringify(sharedState, null, 2), "utf-8").catch(() => {});
        console.log("Server sharedState updated dynamically in real-time from Firestore Doc.");
      }
    }, (err: any) => {
      console.error("Firestore onSnapshot subscription failed on server:", err);
    });

  } catch (err) {
    console.error("Error connecting or seeding state in Firestore on start:", err);
  }

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

  app.post("/api/state", async (req, res) => {
    try {
      sharedState = req.body;
      await fs.writeFile(dbPath, JSON.stringify(sharedState, null, 2), "utf-8");
      
      // Update central state in Cloud Firestore synchronously so that all other clients get notified immediately
      if (docRef) {
        try {
          await docRef.set(sharedState);
          console.log("Cloud Firestore synchronized successfully via POST api/state.");
        } catch (fErr: any) {
          console.warn("Could not write update to Firestore from server (permission or network limit). Fallback to database.json is active.", fErr.message);
        }
      }
      
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
