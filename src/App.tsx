21:03:49.245 Running build in Washington, D.C., USA (East) – iad1
21:03:49.245 Build machine configuration: 2 cores, 8 GB
21:03:49.276 Cloning github.com/sebinmr556-ui/noise-new-style (Branch: main, Commit: d3d6101)
21:03:49.277 Skipping build cache, deployment was triggered without cache.
21:03:49.609 Cloning completed: 333.000ms
21:03:50.020 Running "vercel build"
21:03:50.028 Vercel CLI 64.7.0
21:03:50.616 Running "install" command: `npm install --legacy-peer-deps`...
21:03:51.054 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
21:04:19.688 npm warn deprecated node-domexception@1.0.0: Use your platform's native DOMException instead
21:04:35.580 
21:04:35.581 added 252 packages, and audited 253 packages in 45s
21:04:35.581 
21:04:35.583 39 packages are looking for funding
21:04:35.583   run `npm fund` for details
21:04:35.825 
21:04:35.825 4 high severity vulnerabilities
21:04:35.825 
21:04:35.825 To address all issues (including breaking changes), run:
21:04:35.825   npm audit fix --force
21:04:35.825 
21:04:35.825 Run `npm audit` for details.
21:04:35.826 npm warn install-scripts 5 packages have install scripts not yet covered by allowScripts:
21:04:35.827 npm warn install-scripts   @google/genai@2.30.0 (preinstall: echo 'preinstall: no-op')
21:04:35.827 npm warn install-scripts   esbuild@0.25.12 (postinstall: node install.js)
21:04:35.827 npm warn install-scripts   protobufjs@7.6.6 (postinstall: node scripts/postinstall)
21:04:35.828 npm warn install-scripts   @firebase/util@1.15.3 (postinstall: node ./postinstall.js)
21:04:35.828 npm warn install-scripts   esbuild@0.28.2 (postinstall: node install.js)
21:04:35.828 npm warn install-scripts
21:04:35.828 npm warn install-scripts Run `npm install-scripts ls` to review, or `npm install-scripts approve <pkg>` to allow.
21:04:35.982 Running "npm run build"
21:04:36.073 npm warn Unknown env config "cache-dir". This will stop working in the next major version of npm. See `npm help npmrc` for supported config options.
21:04:36.100 
21:04:36.101 > noise-new-style@0.0.0 build
21:04:36.101 > vite build
21:04:36.102 
21:04:36.422 (!) Your Vite config uses features that are unsupported by `configLoader: 'native'`, which is planned to become the default in a future major version of Vite:
21:04:36.423   - `__dirname` (vite.config.ts:11:27). Use `import.meta.dirname` instead
21:04:36.423 Set `VITE_CONFIG_NATIVE_IGNORE_WARNING=true` to suppress this warning.
21:04:36.440 vite v8.3.5 building client environment for production...
21:04:36.451 transforming...
21:04:36.631 ✓ 15 modules transformed.
21:04:36.635 ✗ Build failed in 194ms
21:04:36.635 error during build:
21:04:36.635 Build failed with 1 error:
21:04:36.636 
21:04:36.636 [builtin:vite-transform] Unterminated string
21:04:36.636       ╭─[ src/App.tsx:1001:33 ]
21:04:36.636       │
21:04:36.636  1001 │                       className="accent-rose-500 w-4 h-
21:04:36.636       │                                 ────────────┬───────────  
21:04:36.636       │                                             ╰───────────── 
21:04:36.636 ──────╯
21:04:36.636 
21:04:36.636     at aggregateBindingErrorsIntoJsError (file:///vercel/path0/node_modules/rolldown/dist/shared/error-D0SD8_tL.mjs:49:18)
21:04:36.636     at unwrapBindingResult (file:///vercel/path0/node_modules/rolldown/dist/shared/error-D0SD8_tL.mjs:19:128)
21:04:36.636     at #build (file:///vercel/path0/node_modules/rolldown/dist/shared/rolldown-CMhwwZPA.mjs:145:34)
21:04:36.636     at async buildEnvironment (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:34849:66)
21:04:36.636     at async Object.build (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:35270:19)
21:04:36.636     at async Object.buildApp (file:///vercel/path0/node_modules/vite/dist/node/chunks/node.js:35267:153)
21:04:36.636     at async CAC.<anonymous> (file:///vercel/path0/node_modules/vite/dist/node/cli.js:790:3) {
21:04:36.636   errors: [Getter/Setter]
21:04:36.636 }
21:04:36.659 Error: [BUILD_UTILS_SPAWN_1] Command "npm run build" exited with 1
