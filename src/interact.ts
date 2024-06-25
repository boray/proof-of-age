import { Mina, PrivateKey, Field, AccountUpdate, TokenId, UInt64, VerificationKey } from 'o1js';
import { AdulthoodProof, ProofOfAge } from './ProofOfAge.js';
import { DrivingLicenseContract } from './DrivingLicenseContract.js';
// import { showTxn, saveTxn, printTxn } from 'mina-transaction-visualizer';

const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let [account_one, account_two] = Local.testAccounts;

const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
let contract = new ProofOfAge(zkAppAddress);


const licenseZkAppPrivateKey = PrivateKey.random();
const licenseZkApp = licenseZkAppPrivateKey.toPublicKey();
let licenceContract = new DrivingLicenseContract(licenseZkApp);

/*
const legend = {
  [zkAppAddress.toBase58()]: 'ZkApp',
  [account_one.toBase58()]: 'deployer',
};
*/
if (Local.proofsEnabled) {
  console.time('compile contract');
  await ProofOfAge.compile();
  await DrivingLicenseContract.compile();
  console.timeEnd('compile contract');
}

//console.log(ProofOfAge._verificationKey?.hash.toString())
console.log(account_one.toFields()[0])
console.log(account_one.toFields()[1])


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
console.log(deploy_tx.toPretty());
console.timeEnd('deploy');

console.time('deploy licence contract');
const deploy_license_tx = await Mina.transaction(account_one, async () => {
  AccountUpdate.fundNewAccount(account_one);
  await licenceContract.deploy();
});
await deploy_license_tx.prove();
await deploy_license_tx.sign([licenseZkAppPrivateKey, account_one.key]).send();
console.log(deploy_license_tx.toPretty());

//printTxn(deploy_tx, 'deploy_txn', legend);
console.timeEnd('deploy licence contract');

console.time('register proof-of-age');
try {
  const register_tx = await Mina.transaction(account_one, async () => {
    //AccountUpdate.fundNewAccount(account_one);
    await contract.proveAdulthood(account_one.key, generic_proof);
  });
  await register_tx.prove();
  await register_tx.sign([account_one.key]).send();
  console.log(register_tx.toPretty());

  //printTxn(register_tx, 'register_txn', legend);
} catch (err) {
  console.log(err);
}
console.timeEnd('register proof-of-age');


console.time('apply for license');
const license_tx = await Mina.transaction(account_one, async () => {
  await licenceContract.apply_for_driving_license(zkAppAddress);
  
});
await license_tx.prove();
await license_tx.sign([account_one.key]).send();
console.log(license_tx.toPretty());
console.timeEnd('apply for license');
