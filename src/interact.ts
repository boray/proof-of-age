import { Mina, PrivateKey, Field, AccountUpdate } from 'o1js';
import { AdulthoodProof, ProofOfAge } from './ProofOfAge.js';
// import { showTxn, saveTxn, printTxn } from 'mina-transaction-visualizer';

const Local = await Mina.LocalBlockchain({ proofsEnabled: false });
Mina.setActiveInstance(Local);

let [account_one, account_two] = Local.testAccounts;

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
let contract = new ProofOfAge(zkAppAddress);
let tokenId = contract.deriveTokenId();

/*
const legend = {
  [zkAppAddress.toBase58()]: 'ZkApp',
  [account_one.toBase58()]: 'deployer',
};
*/

if (Local.proofsEnabled) {
  console.time('compile contract');
  await ProofOfAge.compile();
  console.timeEnd('compile contract');
}

const generic_proof = new AdulthoodProof({
  first_name: Field.random(),
  last_name: Field(1),
  nationality: Field(1),
  date_of_birth: Field(1),
  gender: Field(1),
  passport_expiration_date: Field(1),
  passport_number: Field(1),
});

console.time('deploy');
const deploy_tx = await Mina.transaction(account_one, async () => {
  AccountUpdate.fundNewAccount(account_one);
  await contract.deploy();
});
await deploy_tx.prove();
await deploy_tx.sign([zkAppPrivateKey, account_one.key]).send();
//printTxn(deploy_tx, 'deploy_txn', legend);
console.timeEnd('deploy');

console.time('register proof-of-age');
try {
  const register_tx = await Mina.transaction(account_one, async () => {
    AccountUpdate.fundNewAccount(account_one);
    await contract.proveAdulthood(generic_proof);
  });
  await register_tx.prove();
  await register_tx.sign([account_one.key]).send();
  //printTxn(register_tx, 'register_txn', legend);
} catch (err) {
  console.log(err);
}
console.timeEnd('register proof-of-age');

console.log('account 1:', Mina.getBalance(account_one, tokenId).toString());

console.time('register proof-of-age');
try {
  const another_register_tx = await Mina.transaction(account_two, async () => {
    AccountUpdate.fundNewAccount(account_two);
    await contract.proveAdulthood(generic_proof);
  });
  await another_register_tx.prove();
  await another_register_tx.sign([account_two.key]).send();
} catch (err) {
  console.log(err);
}
console.timeEnd('register proof-of-age');

console.log('account 1:', Mina.getBalance(account_one, tokenId).toString());
console.log('account 2:', Mina.getBalance(account_two, tokenId).toString());

console.time('check proof-of-age');
const check_tx = await Mina.transaction(account_one, async () => {
  await contract.isAdult(account_one);
});
await check_tx.prove();
await check_tx.sign([account_one.key]).send();
console.timeEnd('check proof-of-age');
