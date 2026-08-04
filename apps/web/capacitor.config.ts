import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'br.com.granjamafaldo.app',
  appName: 'Granja Mafaldo',
  webDir: 'dist',
  backgroundColor: '#f8f3e3',
  server: { androidScheme: 'https' }
};

export default config;
