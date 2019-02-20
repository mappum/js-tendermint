package main

import (
	"bytes"
	"encoding/hex"
	"encoding/json"
	"io/ioutil"
	"os"
	"time"

	"github.com/tendermint/go-amino"
	"github.com/tendermint/tendermint/crypto"
	"github.com/tendermint/tendermint/crypto/ed25519"
	"github.com/tendermint/tendermint/types"
)

var voteValues = []types.Vote{
	types.Vote{
		Type:   1,
		Height: 1234567890,
		Round:  2,
		BlockID: types.BlockID{
			Hash: []byte("01234567890123456789"),
			PartsHeader: types.PartSetHeader{
				Hash:  []byte("01234567890123456789"),
				Total: 1,
			},
		},
		Timestamp: time.Unix(123456789, 123456789).UTC(),
	},
}

var varintValues = []int64{
	0,
	1,
	255,
	256,
	1234,
	100000,
	// 10000000000, TODO: fix encoding
}

var blockIDValues = []types.BlockID{
	types.BlockID{PartsHeader: types.PartSetHeader{}},
	types.BlockID{
		Hash: []byte("01234567890123456789"),
		PartsHeader: types.PartSetHeader{
			Hash:  []byte("01234567890123456789"),
			Total: 1,
		},
	},
}

var pubkeyValue = ed25519.GenPrivKeyFromSecret([]byte("foo")).PubKey()

var validatorHashInput = ValidatorHashInput{
	pubkeyValue,
	1234,
}

type ValidatorHashInput struct {
	PubKey      crypto.PubKey `json:"pub_key"`
	VotingPower int64         `json:"voting_power"`
}

type encoding struct {
	Value    interface{} `json:"value"`
	Encoding string      `json:"encoding"`
}

var cdc *amino.Codec
var hktTimeZone *time.Location
var timeValues []time.Time

func init() {
	cdc = amino.NewCodec()

	cdc.RegisterInterface((*crypto.PubKey)(nil), nil)
	cdc.RegisterConcrete(ed25519.PubKeyEd25519{},
		"tendermint/PubKeyEd25519", nil)

	var err error
	hktTimeZone, err = time.LoadLocation("Hongkong")
	if err != nil {
		panic(err)
	}

	timeValues = []time.Time{
		time.Unix(123456789, 123456789).UTC(),
		time.Now().UTC(),
	}
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

func encodeVotes(values []types.Vote) []encoding {
	encodings := make([]encoding, len(values))
	for i, value := range values {
		canonical := types.CanonicalizeVote("chain-id", &value)

		bz, err := cdc.MarshalBinaryBare(canonical)
		if err != nil {
			panic(err)
		}
		encodings[i] = encoding{
			Value:    value,
			Encoding: hex.EncodeToString(bz),
		}
	}
	return encodings
}

func encode(values []interface{}) []encoding {
	encodings := make([]encoding, len(values))
	for i, value := range values {
		bz, err := cdc.MarshalBinaryBare(value)
		if err != nil {
			panic(err)
		}
		encodings[i] = encoding{
			Value:    value,
			Encoding: hex.EncodeToString(bz),
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
	filePerm := os.FileMode(0644)

	varintFixtures := generateJSON(encodeVarints(varintValues))
	ioutil.WriteFile("test/fixtures/varint.json", varintFixtures, filePerm)

	voteFixtures := generateJSON(encodeVotes(voteValues))
	ioutil.WriteFile("test/fixtures/vote.json", voteFixtures, filePerm)

	timeIValues := make([]interface{}, len(timeValues))
	for i, v := range timeValues {
		timeIValues[i] = v
	}
	timeFixtures := generateJSON(encode(timeIValues))
	ioutil.WriteFile("test/fixtures/time.json", timeFixtures, filePerm)

	blockIDIValues := make([]interface{}, len(blockIDValues))
	for i, v := range blockIDValues {
		blockIDIValues[i] = v
	}
	blockIDFixtures := generateJSON(encode(blockIDIValues))
	ioutil.WriteFile("test/fixtures/block_id.json", blockIDFixtures, filePerm)

	pubkeyBytes, err := cdc.MarshalBinaryBare(pubkeyValue)
	if err != nil {
		panic(err)
	}
	pubkeyFixtures, err := cdc.MarshalJSONIndent(struct {
		Value    *crypto.PubKey `json:"value"`
		Encoding string         `json:"encoding"`
	}{
		&pubkeyValue,
		hex.EncodeToString(pubkeyBytes),
	}, "", "  ")
	if err != nil {
		panic(err)
	}
	ioutil.WriteFile("test/fixtures/pubkey.json", pubkeyFixtures, filePerm)

	validatorHashInputBytes, err := cdc.MarshalBinaryBare(validatorHashInput)
	if err != nil {
		panic(err)
	}
	validatorHashInputFixtures, err := json.MarshalIndent(encoding{
		&validatorHashInput,
		hex.EncodeToString(validatorHashInputBytes),
	}, "", "  ")
	if err != nil {
		panic(err)
	}
	ioutil.WriteFile("test/fixtures/validator_hash_input.json", validatorHashInputFixtures, filePerm)
}
