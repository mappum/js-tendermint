function safeParseInt (nStr) {
  let n = parseInt(nStr)
  if (!Number.isInteger(n)) {
    throw Error(`Value "${nStr}" is not an integer`)
  }
  return n
}

module.exports = { safeParseInt }
