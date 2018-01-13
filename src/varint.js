'use strict'

const MAX_VALUE = Math.pow(2, 53) - 1

function decode(buffer, start = 0, end = buffer.length) {
  let size = buffer[start]
  let value = 0
  for (let i = start + 1; i <= start + size; i++) {
    value <<= 8
    value |= buffer[i]
  }
  decode.bytes = size + 1
  return value
}

function encode(n, buffer = Buffer.alloc(encodingLength(n)), offset = 0) {
  let size = encodingLength(n) - 1
  buffer[offset] = size
  for (let i = offset + size; i > offset; i--) {
    buffer[i] = n & 0xff
    n >>= 8
  }
  encode.bytes = size + 1
  return buffer
}

function encodingLength(n) {
  if (n < 0 || n > MAX_VALUE) {
    throw new Error('varint value is out of bounds')
  }
  let size = 1
  while (n > 0) {
    n >>= 8
    size += 1
  }
  return size
}

module.exports = { encode, decode, encodingLength }
