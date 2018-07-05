let test = require('ava')
let {
  VarInt,
  VarHexBuffer,
  Time,
  BlockID,
  PubKey,
  ValidatorHashInput
} = require('../lib/types.js')

let varintFixtures = require('./fixtures/varint.json')
let timeFixtures = require('./fixtures/time.json')
let blockIDFixtures = require('./fixtures/block_id.json')
let pubkeyFixture = require('./fixtures/pubkey.json')
let validatorHashInputFixture = require('./fixtures/validator_hash_input.json')
validatorHashInputFixture.value.pub_key = pubkeyFixture.value

function EncodeTest (t, type) {
  return (value, expected) => {
    let actual = type.encode(value).toString('hex')
    t.is(actual, expected, `encode ${JSON.stringify(value, null, '  ')}`)
  }
}

test('VarInt', (t) => {
  for (let { value, encoding } of varintFixtures) {
    let actual = VarInt.encode(value).toString('hex')
    t.is(actual, encoding, `encode ${value}`)
  }
})

test('VarHexBuffer', (t) => {
  // encode
  let data = '0001020304050607'
  let output = Buffer.alloc(9)
  VarHexBuffer.encode(data, output, 0)
  t.is(output.toString('hex'), '080001020304050607')
  t.is(VarHexBuffer.encode.bytes, 9)

  // encodingLength
  let length = VarHexBuffer.encodingLength(data)
  t.is(length, 9)
})

test('Time', (t) => {
  // TODO: failure case
  for (let { value, encoding } of timeFixtures) {
    let actual = Time.encode(value).toString('hex')
    t.is(actual, encoding, `encode ${value}`)
  }
})

test('BlockID', (t) => {
  for (let { value, encoding } of blockIDFixtures) {
    let actual = BlockID.encode(value).toString('hex')
    t.is(actual, encoding, `encode ${value}`)
  }
})

test('PubKey', (t) => {
  let encodeTest = EncodeTest(t, PubKey)
  encodeTest(null, '00')
  encodeTest(pubkeyFixture.value, pubkeyFixture.encoding)
})

test('ValidatorHashInput', (t) => {
  let encodeTest = EncodeTest(t, ValidatorHashInput)
  encodeTest(
    validatorHashInputFixture.value,
    validatorHashInputFixture.encoding
  )
})
