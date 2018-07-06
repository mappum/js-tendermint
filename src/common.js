'use strict'

function safeParseInt (nStr) {
  let n = parseInt(nStr)
  if (!Number.isInteger(n)) {
    throw Error(`Value ${JSON.stringify(nStr)} is not an integer`)
  }
  if (Math.abs(n) >= Number.MAX_SAFE_INTEGER) {
    throw Error(`Absolute value must be < 2^53`)
  }
  if (String(n) !== String(nStr)) {
    throw Error(`Value ${JSON.stringify(nStr)} is not a canonical integer string representation`)
  }
  return n
}

module.exports = { safeParseInt }
