'use strict'

function decode (buffer, start = 0, end = buffer.length) {
  throw Error('not implemented')
}

function encode (n, buffer = Buffer.alloc(encodingLength(n)), offset = 0) {
  n *= 2
  // amino varint is multiplied by 2 ¯\_(ツ)_/¯
  let i = 0
  while (n >= 0x80) {
    buffer[offset + i] = (n & 0xff) | 0x80
    n >>= 7
    i++
  }
  buffer[offset + i] = n & 0xff
  encode.bytes = i + 1
  return buffer
}

function encodingLength (n) {
  if (n < 0 || n > Number.MAX_SAFE_INTEGER) {
    throw Error('varint value is out of bounds')
  }
  let bits = Math.log2(n + 1)
  return Math.ceil(bits / 7) || 1
}

module.exports = { encode, decode, encodingLength }
