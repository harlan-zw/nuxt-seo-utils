import { fileURLToPath } from 'url'
import { defineNuxtModule, addImports, addComponent, addPlugin } from '@nuxt/kit'
import { resolve } from 'pathe'

export interface ModuleOptions {
  addPlugin: boolean
}

export default defineNuxtModule<ModuleOptions>({
  meta: {
    name: 'my-module',
    configKey: 'myModule'
  },
  defaults: {
    addPlugin: true
  },
  async setup (options, nuxt) {
    const runtimeDir = fileURLToPath(new URL('./runtime', import.meta.url))

    const newModules = nuxt.options._modules
    // remove the nuxt meta (head) module
    for (const k in newModules) {
      if (typeof newModules[k] === 'function') {
        if ((await newModules[k].getMeta()).name === 'meta') {
          // we can't use an undefined key so use a duplicate
          newModules[k] = '@nuxt/telemetry'
        }
      }
    }
    nuxt.options._modules = newModules

    nuxt.hooks.hook('modules:done', () => {
      // Replace #head alias
      nuxt.options.alias['#head'] = runtimeDir
      // nuxt.options.build.transpile.push(runtimeDir)

      addPlugin({ src: resolve(runtimeDir, 'lib', 'vueuse-head.plugin') }, { append: true })
    })

    nuxt.options.build.transpile.push('@zhead/schema')
    nuxt.options.build.transpile.push('@zhead/vue')
    nuxt.options.build.transpile.push('@zhead/schema-vue')

    addImports({
      name: 'useMetaTags',
      from: runtimeDir
    })

    await addComponent({
      name: 'DebugHead',
      mode: 'client',
      filePath: `${runtimeDir}/components/DebugHead.client.vue`
    })
  }
})
