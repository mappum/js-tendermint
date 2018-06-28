let test = require('ava')
let {
  VarHexBuffer,
  Time,
  BlockID,
  PubKey,
  ValidatorHashInput
} = require('../lib/types.js')

let timeFixtures = require('./fixtures/time.json')
let blockIDFixtures = require('./fixtures/block_id.json')
let pubkeyFixture = require('./fixtures/pubkey.json')

function EncodeTest (t, type) {
  return (value, expected) => {
    let actual = type.encode(value).toString('hex')
    t.is(actual, expected, `encode ${JSON.stringify(value, null, '  ')}`)
  }
}

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
    {
      address: '135A9CBF8D5037E8B1507DDD3C6637364DF6D5EB',
      pub_key: {
        type: 'AC26791624DE60',
        value: 'NjjEQKUsq8F0gWxl3BoU2Li5n7hEz9H/LX80rfMxVyE='
      },
      voting_power: 100
    },
    '0a14135a9cbf8d5037e8b1507ddd3c6637364df6d5eb171624de64203638c440a52cabc174816c65dc1a14d8b8b99fb844cfd1ff2d7f34adf3315721196400000000000000'
  )
})
