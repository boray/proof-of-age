import {
  SmartContract,
  method,
  Mina,
  State,
  state,
  PublicKey,
  UInt64,
  Experimental,
  Field
} from 'o1js';

import { ProofOfAge, AdulthoodProof, StateProof, offchainState } from './ProofOfAge.js';

const proofsEnabled = true;

const generic_proof = new AdulthoodProof({
  first_name: Field.random(),
  last_name: Field(1),
  nationality: Field(1),
  date_of_birth: Field(1),
  gender: Field(1),
  passport_expiration_date: Field(1),
  passport_number: Field(1)
})


const Local = await Mina.LocalBlockchain({ proofsEnabled });
Mina.setActiveInstance(Local);

let [sender, sender_two, contractAccount] = Local.testAccounts;
let contract = new ProofOfAge(contractAccount);
offchainState.setContractInstance(contract);

if (proofsEnabled) {
  console.time('compile program');
  await offchainState.compile();
  console.timeEnd('compile program');
  console.time('compile contract');
  await ProofOfAge.compile();
  console.timeEnd('compile contract');
}

// deploy and create first account

console.time('deploy');
await Mina.transaction(sender, async () => {
  await contract.deploy();
})
  .sign([sender.key, contractAccount.key])
  .prove()
  .send();
console.timeEnd('deploy');

// create first account

console.time('register proof-of-age');
await Mina.transaction(sender, async () => {
  await contract.prove_adulthood(generic_proof);
})
  .sign([sender.key])
  .prove()
  .send();
console.timeEnd('registered proof-of-age');

// settle

console.time('settlement proof 1');
let proof = await offchainState.createSettlementProof();
console.timeEnd('settlement proof 1');

console.time('settle 1');
await Mina.transaction(sender, () => contract.settle(proof))
  .sign([sender.key])
  .prove()
  .send();
console.timeEnd('settle 1');

// check balance and supply

// transfer (should succeed)


// settle
Local.setProofsEnabled(proofsEnabled);


