import express from "express";
import cors from "cors";
import { createServer } from "http";
import { registerRoutes } from "../server/routes.js";

let appInstance: express.Express | null = null;
let appInitPromise: Promise<express.Express> | null = null;

async function getApp(): Promise<express.Express> {
  if (appInstance) {
    return appInstance;
  }

  if (!appInitPromise) {
    appInitPromise = (async () => {
      const app = express();
      app.use(cors({ origin: true, credentials: true }));
      app.use(express.json());

      const httpServer = createServer(app);
      await registerRoutes(httpServer, app);

      return app;
    })();
  }

  appInstance = await appInitPromise;
  return appInstance;
}

export default async function handler(req: any, res: any) {
  const app = await getApp();
  return app(req, res);
}
