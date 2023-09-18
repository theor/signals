import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'
// import mkcert from 'vite-plugin-mkcert'
import basicSsl from '@vitejs/plugin-basic-ssl'
// https://vitejs.dev/config/
export default defineConfig({
  server: { https: true },
  plugins: [ 
    basicSsl(),
    // mkcert(), 
    react() ]
})
