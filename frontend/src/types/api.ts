// API Response Types

export type HealthResponse = {
  status: 'ok' | 'degraded';
  timestamp: string;
  services: {
    database: 'connected' | 'disconnected';
  };
};

// Add more API response types here as needed
// Example:
// export type User = {
//   id: string;
//   email: string;
//   name: string;
// };
