'use strict'

function safeParseInt (nStr) {
  let n = parseInt(nStr)
  if (!Number.isInteger(n)) {
    throw Error(`Value "${nStr}" is not an integer`)
  }
  if (String(n) !== String(nStr)) {
    throw Error(`Value "${nStr}" is not a canonical integer string representation`)
  }
  return n
}

module.exports = { safeParseInt }
