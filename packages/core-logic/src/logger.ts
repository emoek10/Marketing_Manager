export const logger = {
  info: (module: string, message: string, data?: any) => {
    console.log(`[INFO][${module}] ${message}`, data ? JSON.stringify(data) : '');
  },
  warn: (module: string, message: string, data?: any) => {
    console.warn(`[WARN][${module}] ${message}`, data ? JSON.stringify(data) : '');
  },
  error: (module: string, message: string, data?: any) => {
    console.error(`[ERROR][${module}] ${message}`, data ? JSON.stringify(data) : '');
  },
};
