/**
 * This script can be used to interact with the ProofOfAge contract, after deploying it.
 *
 * We call the update() method on the contract, create a proof and send it to the chain.
 * The endpoint that we interact with is read from your config.json.
 *
 * This simulates a user interacting with the zkApp from a browser, except that here, sending the transaction happens
 * from the script and we're using your pre-funded zkApp account to pay the transaction fee. In a real web app, the user's wallet
 * would send the transaction and pay the fee.
 *
 * To run locally:
 * Build the project: `$ npm run build`
 * Run with node:     `$ node build/src/interact.js <deployAlias>`.
 */
import fs from 'fs/promises';
import { Mina, NetworkId, PrivateKey, Field } from 'o1js';
import { AdulthoodProof, ProofOfAge } from './ProofOfAge.js';

// check command line arg
let deployAlias = process.argv[2];
if (!deployAlias)
  throw Error(`Missing <deployAlias> argument.

Usage:
node build/src/interact.js <deployAlias>
`);
Error.stackTraceLimit = 1000;
const DEFAULT_NETWORK_ID = 'testnet';

// parse config and private key from file
type Config = {
  deployAliases: Record<
    string,
    {
      networkId?: string;
      url: string;
      keyPath: string;
      fee: string;
      feepayerKeyPath: string;
      feepayerAlias: string;
    }
  >;
};
let configJson: Config = JSON.parse(await fs.readFile('config.json', 'utf8'));
let config = configJson.deployAliases[deployAlias];
let feepayerKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.feepayerKeyPath, 'utf8')
);

let zkAppKeysBase58: { privateKey: string; publicKey: string } = JSON.parse(
  await fs.readFile(config.keyPath, 'utf8')
);

let feepayerKey = PrivateKey.fromBase58(feepayerKeysBase58.privateKey);
let zkAppKey = PrivateKey.fromBase58(zkAppKeysBase58.privateKey);

// set up Mina instance and contract we interact with
const Network = Mina.Network({
  // We need to default to the testnet networkId if none is specified for this deploy alias in config.json
  // This is to ensure the backward compatibility.
  networkId: (config.networkId ?? DEFAULT_NETWORK_ID) as NetworkId,
  mina: config.url,
});
// const Network = Mina.Network(config.url);
const fee = Number(config.fee) * 1e9; // in nanomina (1 billion = 1.0 mina)
Mina.setActiveInstance(Network);
let feepayerAddress = feepayerKey.toPublicKey();
let zkAppAddress = zkAppKey.toPublicKey();
let zkApp = new ProofOfAge(zkAppAddress);

// compile the contract to create prover keys
console.log('compile the contract...');
await ProofOfAge.compile();

// create adulthood proofs
const adulthood_proof_one = new AdulthoodProof({
  first_name: Field(1),
  last_name: Field(1),
  nationality: Field(1),
  date_of_birth: Field(1),
  gender: Field(1),
  passport_expiration_date: Field(1),
  passport_number: Field(1)
});
const adulthood_proof_two = new AdulthoodProof({
  first_name: Field(2),
  last_name: Field(2),
  nationality: Field(2),
  date_of_birth: Field(2),
  gender: Field(2),
  passport_expiration_date: Field(2),
  passport_number: Field(2)
});
const adulthood_proof_three = new AdulthoodProof({
  first_name: Field(3),
  last_name: Field(3),
  nationality: Field(3),
  date_of_birth: Field(3),
  gender: Field(3),
  passport_expiration_date: Field(3),
  passport_number: Field(3)
});

//----------------

await prove_adulthood_tx(adulthood_proof_one);
await prove_adulthood_tx(adulthood_proof_two);
await prove_adulthood_tx(adulthood_proof_three);


//----------------

async function prove_adulthood_tx(adulthood_proof: AdulthoodProof) {
  try {
    console.log('build transaction and create proof...');
    let tx = await Mina.transaction(
      { sender: feepayerAddress, fee },
      async () => {
        await zkApp.prove_adulthood(adulthood_proof);
      }
    );
    await tx.prove();
  
    console.log('send transaction...');
    const sentTx = await tx.sign([feepayerKey]).send();
    if (sentTx.status === 'pending') {
      console.log(
        '\nSuccess! Update transaction sent.\n' +
          '\nYour smart contract state will be updated' +
          '\nas soon as the transaction is included in a block:' +
          `\n${getTxnUrl(config.url, sentTx.hash)}`
      );
    }
  } catch (err) {
    console.log(err);
  }
}
function getTxnUrl(graphQlUrl: string, txnHash: string | undefined) {
  const hostName = new URL(graphQlUrl).hostname;
  const txnBroadcastServiceName = hostName
    .split('.')
    .filter((item) => item === 'minascan')?.[0];
  const networkName = graphQlUrl
    .split('/')
    .filter((item) => item === 'mainnet' || item === 'devnet')?.[0];
  if (txnBroadcastServiceName && networkName) {
    return `https://minascan.io/${networkName}/tx/${txnHash}?type=zk-tx`;
  }
  return `Transaction hash: ${txnHash}`;
}
