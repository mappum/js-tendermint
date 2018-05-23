let test = require('ava')
let { Time } = require('../lib/types.js')

function EncodeTest (t, type) {
  return (value, expected) => {
    let actual = type.encode(value).toString('hex')
    t.is(actual, expected, `encode "${value}"`)
  }
}

test('time', (t) => {
  let encodeTest = EncodeTest(t, Time)
  encodeTest(
    '2018-05-23T00:37:22.036663121Z',
    '09000000005b04b7c215022f6f5104'
  )
  encodeTest(
    '2018-05-23T02:46:50.290965475Z',
    '09000000005b04d61a151157c7e304'
  )
  encodeTest(
    '2018-05-23T02:46:53.334239655Z',
    '09000000005b04d61d1513ec17a704'
  )
  encodeTest(
    '2018-05-23T02:48:14.21187523Z',
    '09000000005b04d66e150ca0f59e04'
  )
  encodeTest(
    '2018-05-23T02:51:28.42456088Z',
    '09000000005b04d73015194e48f004'
  )
})
