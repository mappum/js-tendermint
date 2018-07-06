let test = require('ava')
let { safeParseInt } = require('../lib/common.js')

test('safeParseInt', (t) => {
  t.is(safeParseInt('123'), 123)
  t.is(safeParseInt('-123'), -123)
  t.is(safeParseInt(123), 123)
  t.is(safeParseInt(-123), -123)
  t.throws(() => safeParseInt(),
    'Value undefined is not an integer')
  t.throws(() => safeParseInt(''),
    'Value "" is not an integer')
  t.throws(() => safeParseInt([]),
    'Value [] is not an integer')
  t.throws(() => safeParseInt({}),
    'Value {} is not an integer')
  t.throws(() => safeParseInt(String(Number.MAX_SAFE_INTEGER + 123)),
    'Absolute value must be < 2^53')
  t.throws(() => safeParseInt(String(-Number.MAX_SAFE_INTEGER - 123)),
    'Absolute value must be < 2^53')
  t.throws(() => safeParseInt(Number.MAX_SAFE_INTEGER + 123),
    'Absolute value must be < 2^53')
  t.throws(() => safeParseInt('0x123'),
    'Value "0x123" is not a canonical integer string representation')
  t.throws(() => safeParseInt('123.5'),
    'Value "123.5" is not a canonical integer string representation')
  t.throws(() => safeParseInt(123.5),
    'Value 123.5 is not a canonical integer string representation')
})
