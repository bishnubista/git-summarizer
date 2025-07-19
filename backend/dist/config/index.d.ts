import type { SystemConfig } from '@/types/index.js';
declare let config: SystemConfig;
export { config };
export declare const serverConfig: {
    port: number;
    nodeEnv: "development" | "production" | "test";
    apiBaseUrl: string;
    isDevelopment: boolean;
    isProduction: boolean;
    isTest: boolean;
};
export default config;
