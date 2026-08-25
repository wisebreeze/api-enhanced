const fs = require('fs')
const path = require('path')
const { register_anonimous } = require('./main')
const {
  cookieToJson,
  generateRandomChineseIP,
  generateDeviceId,
} = require('./util/index')
const { getXeapiPublicKey } = require('./util/xeapiKey')
const tmpPath = require('os').tmpdir()

async function generateConfig() {
  global.cnIp = generateRandomChineseIP()
  // generateDeviceId up front: register_xeapikey needs it, and register_anonimous
  // (which uses xeapi encryption) cannot run until the xeapi public key is on
  // disk. Original order fetched the key AFTER register_anonimous, creating a
  // circular dependency that left anonymous_token empty on every cold start.
  if (!global.deviceId) {
    global.deviceId = generateDeviceId()
  }
  try {
    let currentPublicKey = {}
    try {
      currentPublicKey = JSON.parse(
        fs.readFileSync(path.resolve(tmpPath, 'xeapi_public_key'), 'utf-8'),
      )
    } catch (_) {}
    const publicKey = await getXeapiPublicKey(currentPublicKey, global.deviceId)
    fs.writeFileSync(
      path.resolve(tmpPath, 'xeapi_public_key'),
      JSON.stringify(publicKey),
      'utf-8',
    )
  } catch (error) {
    console.log(error)
  }
  try {
    const res = await register_anonimous()
    const cookie = res.body.cookie
    if (cookie) {
      const cookieObj = cookieToJson(cookie)
      fs.writeFileSync(
        path.resolve(tmpPath, 'anonymous_token'),
        cookieObj.MUSIC_A,
        'utf-8',
      )
    }
  } catch (error) {
    console.log(error)
  }
}
module.exports = generateConfig
