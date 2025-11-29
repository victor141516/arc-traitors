import { z } from "zod";

// Esquema de validación para variables de entorno
const EnvSchema = z.object({
  // Admin configuration
  ADMIN_PASSWORD: z
    .string()
    .min(8, "Admin password must be at least 8 characters long")
    .refine(
      (value) =>
        /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]/.test(
          value
        ),
      {
        message:
          "Admin password must contain at least one uppercase letter, one lowercase letter, one number, and one special character",
      }
    ),

  // CORS configuration (optional)
  CORS_ORIGINS: z.string().optional(),

  // Port configuration (optional, defaults to 33000)
  PORT: z
    .string()
    .optional()
    .transform((val) => (val ? parseInt(val, 10) : 33000))
    .refine((val) => val > 0 && val < 65536, {
      message: "PORT must be a valid port number (1-65535)",
    }),

  // Database path configuration
  DATABASE_PATH: z.string().default("data/votes.db"),

  // Node environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("production"),
});

/**
 * Valida y parsea las variables de entorno
 * @throws Error si las variables de entorno no son válidas
 */
function validateEnv() {
  try {
    return EnvSchema.parse(process.env);
  } catch (error) {
    if (error instanceof z.ZodError) {
      const formattedErrors = error.issues
        .map((issue) => `${issue.path.join(".")}: ${issue.message}`)
        .join("\n");

      throw new Error(
        `❌ Invalid environment variables:\n${formattedErrors}\n\n` +
          `Please check your environment variables and try again.\n` +
          `Required variables:\n` +
          `- ADMIN_PASSWORD: Admin password (min 8 chars, must include uppercase, lowercase, number, and special character)\n` +
          `Optional variables:\n` +
          `- CORS_ORIGINS: Comma-separated list of allowed CORS origins\n` +
          `- PORT: Server port (default: 33000)\n` +
          `- DATABASE_PATH: SQLite database file path (default: votes.db)\n` +
          `- NODE_ENV: Environment (development|production|test, default: production)`
      );
    }
    throw error;
  }
}

// Validar y exportar configuración
export const config = validateEnv();

// Tipos de configuración para TypeScript
export type Config = z.infer<typeof EnvSchema>;

// Helpers para acceder a la configuración
export const getAdminPassword = () => config.ADMIN_PASSWORD;
export const getCorsOrigins = () =>
  config.CORS_ORIGINS && config.CORS_ORIGINS.trim() !== ""
    ? config.CORS_ORIGINS.split(",").map((origin) => origin.trim())
    : null;
export const getPort = () => config.PORT;
export const getDatabasePath = () => config.DATABASE_PATH;
export const isProduction = () => config.NODE_ENV === "production";
export const isDevelopment = () => config.NODE_ENV === "development";
