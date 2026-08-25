const fs = require('fs')
const path = require('path')
const os = require('os')
const serverless = require('serverless-http')

// util/request.js reads anonymous_token synchronously at require time,
// so the file MUST exist before server.js (and its transitive requires)
// is loaded. Same trick as app.js / main.js.
const tmpPath = os.tmpdir()
const anonymousTokenPath = path.resolve(tmpPath, 'anonymous_token')
if (!fs.existsSync(anonymousTokenPath)) {
  fs.writeFileSync(anonymousTokenPath, '', 'utf-8')
}

// Cold-start initialisation: refresh anonymous_token + xeapi public key.
// Cached as a module-level promise so it runs once per Lambda container
// and concurrent invocations share the same in-flight refresh.
let initPromise = null
function ensureInit() {
  if (!initPromise) {
    initPromise = (async () => {
      try {
        const generateConfig = require('../../generateConfig')
        await generateConfig()
      } catch (err) {
        // Don't crash the container — anonymous_token may be empty/stale,
        // upstream NCM will reject and the client sees a normal error.
        console.log('[netlify] generateConfig failed:', err)
      }
    })()
  }
  return initPromise
}

// Build the Express app once per container. constructServer() does NOT
// call app.listen() (that's serveNcmApi's job), which is exactly what
// we want for serverless.
let appPromise = null
function getApp() {
  if (!appPromise) {
    appPromise = ensureInit().then(() =>
      require('../../server').constructServer(),
    )
  }
  return appPromise
}

// serverless-http handler, lazily created after the app is ready so the
// first invocation waits for cold-start init before serving.
let handlerPromise = null
function getHandler() {
  if (!handlerPromise) {
    handlerPromise = getApp().then((app) => serverless(app))
  }
  return handlerPromise
}

exports.handler = async (event, context) => {
  const handler = await getHandler()
  return handler(event, context)
}
