import { resolve } from 'pathe'
import MyModule from '../src/module'

export default defineNuxtConfig({
  modules: [
    MyModule
  ],
  workspaceDir: resolve(__dirname, '../'),
  myModule: {
    addPlugin: true
  },
  imports: {
    autoImport: true
  }
})
