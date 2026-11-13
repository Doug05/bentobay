const { contextBridge, ipcRenderer: ipc } = require('electron');
const inv = (c) => (...a) => ipc.invoke(c, ...a);
contextBridge.exposeInMainWorld('api', {
  catalog: inv('catalog'),
  state: { load: inv('state:load'), save: inv('state:save'), export: inv('state:export'), import: inv('state:import') },
  view: { layout: inv('view:layout'), hide: inv('view:hide'), warm: inv('view:warm'), reload: inv('view:reload'), remove: inv('view:remove'),
    snapshot: inv('view:snapshot'), paste: inv('view:paste'), external: inv('external'), clearSessions: inv('sessions:clear') },
  win: { active: inv('win:active') },
  pet: { chat: inv('pet:chat'), hasKey: inv('secret:has'), setKey: inv('secret:set'), clearKey: inv('secret:clear') },
  prefs: { apply: inv('prefs:apply') },
  chrome: inv('chrome'),
  google: { status: inv('g:status'), signIn: inv('g:signin'), signOut: inv('g:signout'), scan: inv('g:scan') },
  onCmd: (fn) => ipc.on('cmd', (_, c) => fn(c))
});
