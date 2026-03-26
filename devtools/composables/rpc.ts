import { refreshSources } from './state'

useDevtoolsConnection({
  onConnected() {
    refreshSources()
  },
  onRouteChange() {
    refreshSources()
  },
})
