import type { Express } from "express";
import { authStorage } from "./storage";
import { isAuthenticated } from "./replitAuth";

const IS_PROD = process.env.NODE_ENV === "production";

// Register auth-specific routes
export function registerAuthRoutes(app: Express): void {
  /**
   * Get current authenticated user
   */
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    // 🧪 Local development: return safe placeholder
    if (!IS_PROD) {
      return res.json({
        id: "local-user",
        email: "local@dev",
        firstName: "Local",
        lastName: "Developer",
        profileImageUrl: null,
      });
    }

    try {
      const userId = req.user?.claims?.sub;

      if (!userId) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const user = await authStorage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });
}