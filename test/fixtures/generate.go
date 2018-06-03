package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"io/ioutil"

	"github.com/tendermint/go-amino"
)

var varintValues = []int64{
	0,
	1,
	255,
	256,
	100000,
	10000000000,
	-1,
	-1000,
}

type encoding struct {
	Value    interface{} `json:"value"`
	Encoding string      `json:"encoding"`
}

var cdc *amino.Codec

func init() {
	cdc = amino.NewCodec()
}

func encodeVarints(values []int64) []encoding {
	encodings := make([]encoding, len(values))
	for i, value := range values {
		buf := new(bytes.Buffer)
		err := amino.EncodeVarint(buf, value)
		if err != nil {
			panic(err)
		}
		encodings[i] = encoding{
			Value:    value,
			Encoding: hex.EncodeToString(buf.Bytes()),
		}
	}
	return encodings
}

func generateJSON(encodings []encoding) []byte {
	output, err := json.MarshalIndent(encodings, "", "  ")
	if err != nil {
		panic(err)
	}
	return output
}

func main() {
	varintFixtures := generateJSON(encodeVarints(varintValues))
	ioutil.WriteFile("test/fixtures/varint.json", varintFixtures, 0644)
}
