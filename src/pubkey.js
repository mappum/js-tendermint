'use strict'

const { tmhash } = require('./hash.js')

function getAddress (pubkey) {
  let bytes = Buffer.from(pubkey.value, 'base64')
  return tmhash(bytes).toString('hex').toUpperCase()
}

module.exports = { getAddress }
