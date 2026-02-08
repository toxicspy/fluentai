import "dotenv/config";
import express from "express";
import cors from "cors";
import { createServer } from "http";
import * as client from "openid-client";
import { Strategy, type VerifyFunction } from "openid-client/passport";
import passport from "passport";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import memoize from "memoizee";
import connectPg from "connect-pg-simple";

import { authStorage } from "./storage";
import { registerRoutes } from "./routes";
import { serveStatic } from "./static";

const app = express();
const PORT = Number(process.env.PORT) || 5000;

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

const IS_NODE_PROD = process.env.NODE_ENV === "production";
const AUTH_ENABLED = IS_NODE_PROD &&
  Boolean(process.env.SESSION_SECRET && process.env.REPL_ID && process.env.DATABASE_URL);

function injectLocalUser(app: Express) {
  if (AUTH_ENABLED) return;

  app.use(async (req, _res, next) => {
    req.user = {
      id: "local-user",
      email: "local@dev",
      firstName: "Local",
      lastName: "Developer",
      expires_at: Math.floor(Date.now() / 1000) + 60 * 60,
    } as any;

    try {
      await authStorage.upsertUser({
        id: "local-user",
        email: "local@dev",
        firstName: "Local",
        lastName: "Developer",
        profileImageUrl: null,
      });
      next();
    } catch (error) {
      next(error);
    }
  });
}

injectLocalUser(app);

const getOidcConfig = memoize(
  async () => {
    if (!AUTH_ENABLED) {
      throw new Error("OIDC config requested outside production");
    }

    return await client.discovery(
      new URL(process.env.ISSUER_URL ?? "https://replit.com/oidc"),
      process.env.REPL_ID!
    );
  },
  { maxAge: 3600 * 1000 }
);

function getSession() {
  if (!AUTH_ENABLED) {
    throw new Error("Session should not be initialized in local dev");
  }

  const sessionTtl = 7 * 24 * 60 * 60 * 1000;
  const PgStore = connectPg(session);

  const sessionStore = new PgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });

  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
    },
  });
}

function updateUserSession(
  user: any,
  tokens: client.TokenEndpointResponse & client.TokenEndpointResponseHelpers
) {
  user.claims = tokens.claims();
  user.access_token = tokens.access_token;
  user.refresh_token = tokens.refresh_token;
  user.expires_at = user.claims?.exp;
}

async function upsertUser(claims: any) {
  await authStorage.upsertUser({
    id: claims.sub,
    email: claims.email,
    firstName: claims.first_name,
    lastName: claims.last_name,
    profileImageUrl: claims.profile_image_url,
  });
}

async function setupAuth(app: Express) {
  if (!AUTH_ENABLED) return;

  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  const config = await getOidcConfig();

  const verify: VerifyFunction = async (tokens, verified) => {
    const user: any = {};
    updateUserSession(user, tokens);
    await upsertUser(tokens.claims());
    verified(null, user);
  };

  const registered = new Set<string>();

  const ensureStrategy = (domain: string) => {
    const name = `replitauth:${domain}`;
    if (registered.has(name)) return;

    passport.use(
      name,
      new Strategy(
        {
          name,
          config,
          scope: "openid email profile offline_access",
          callbackURL: `https://${domain}/api/callback`,
        },
        verify
      )
    );

    registered.add(name);
  };

  passport.serializeUser((user, cb) => cb(null, user));
  passport.deserializeUser((user, cb) => cb(null, user as Express.User));

  app.get("/api/login", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`)(req, res, next);
  });

  app.get("/api/callback", (req, res, next) => {
    ensureStrategy(req.hostname);
    passport.authenticate(`replitauth:${req.hostname}`, {
      successRedirect: "/",
      failureRedirect: "/api/login",
    })(req, res, next);
  });

  app.get("/api/logout", (req, res) => {
    req.logout(() => {
      res.redirect(
        client.buildEndSessionUrl(config, {
          client_id: process.env.REPL_ID!,
          post_logout_redirect_uri: `${req.protocol}://${req.hostname}`,
        }).href
      );
    });
  });
}

setupAuth(app);

export const isAuthenticated: RequestHandler = async (req, res, next) => {
  if (!AUTH_ENABLED) return next();

  if (typeof req.isAuthenticated !== "function" || !req.isAuthenticated()) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  const user = req.user as any;
  if (!user?.expires_at) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  if (Math.floor(Date.now() / 1000) < user.expires_at) {
    return next();
  }

  if (!user.refresh_token) {
    return res.status(401).json({ message: "Unauthorized" });
  }

  try {
    const config = await getOidcConfig();
    const refreshed = await client.refreshTokenGrant(config, user.refresh_token);
    updateUserSession(user, refreshed);
    return next();
  } catch {
    return res.status(401).json({ message: "Unauthorized" });
  }
};

const httpServer = createServer(app);

async function startServer() {
  await registerRoutes(httpServer, app);

  if (IS_NODE_PROD) {
    serveStatic(app);
  } else {
    const { setupVite } = await import("./vite");
    await setupVite(httpServer, app);
  }

  httpServer.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});
