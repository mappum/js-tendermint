let test = require('ava')
let VarInt = require('../lib/varint.js')
let fixtures = require('./fixtures/varint.json')

test('VarInt', (t) => {
  for (let { value, encoding } of fixtures) {
    let actual = VarInt.encode(value).toString('hex')
    let length = VarInt.encodingLength(value)
    t.is(actual, encoding, `encode ${value}`)
    t.is(length, encoding.length / 2, `encodingLength ${value}`)
  }
})
