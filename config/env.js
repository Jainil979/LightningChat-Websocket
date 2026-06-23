// config/env.js
try {
  process.loadEnvFile();
} catch {
  // .env file not found – using environment variables from Render
}

const JWT_SECRET = process.env.JWT_SECRET;
const PORT = parseInt(process.env.PORT || '3001', 10);

// Freeze the exported values (optional, just export an object)
export { JWT_SECRET, PORT };