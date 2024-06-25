import {
  Mina,
  PrivateKey,
  Field,
  AccountUpdate,
  TokenId,
  UInt64,
  VerificationKey,
} from 'o1js';
import { AdulthoodProof, ProofOfAge } from './ProofOfAge.js';
import { DrivingLicenseContract } from './DrivingLicenseContract.js';

const Local = await Mina.LocalBlockchain({ proofsEnabled: true });
Mina.setActiveInstance(Local);

let [sender] = Local.testAccounts;

// setup
const zkAppPrivateKey = PrivateKey.random();
const zkAppAddress = zkAppPrivateKey.toPublicKey();
let contract = new ProofOfAge(zkAppAddress);

const licenseZkAppPrivateKey = PrivateKey.random();
const licenseZkApp = licenseZkAppPrivateKey.toPublicKey();
let licenceContract = new DrivingLicenseContract(licenseZkApp);

// compile
if (Local.proofsEnabled) {
  console.time('compile contract');
  await ProofOfAge.compile();
  await DrivingLicenseContract.compile();
  console.timeEnd('compile contract');
}

// dummy proof - in production, this proof would contain credentials that proves adulthood.
const generic_proof = new AdulthoodProof({
  first_name: Field(1),
  last_name: Field(1),
  nationality: Field(1),
  date_of_birth: Field(1),
  gender: Field(1),
  passport_expiration_date: Field(1),
  passport_number: Field(1),
});

console.time('deploy proof-of-age contract');
const deploy_tx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender);
  await contract.deploy();
});
await deploy_tx.prove();
await deploy_tx.sign([zkAppPrivateKey, sender.key]).send();
console.log(deploy_tx.toPretty());
console.timeEnd('deploy proof-of-age contract');

console.time('deploy licence contract');
const deploy_license_tx = await Mina.transaction(sender, async () => {
  AccountUpdate.fundNewAccount(sender);
  await licenceContract.deploy();
});
await deploy_license_tx.prove();
await deploy_license_tx.sign([licenseZkAppPrivateKey, sender.key]).send();
console.log(deploy_license_tx.toPretty());
console.timeEnd('deploy licence contract');

console.time('prove adulthood');
const register_tx = await Mina.transaction(sender, async () => {
  await contract.proveAdulthood(sender.key, generic_proof);
});
await register_tx.prove();
await register_tx.sign([sender.key]).send();
console.log(register_tx.toPretty());
console.timeEnd('prove adulthood');

console.time('apply for license');
const license_tx = await Mina.transaction(sender, async () => {
  await licenceContract.apply_for_driving_license(zkAppAddress);
});
await license_tx.prove();
await license_tx.sign([sender.key]).send();
console.log(license_tx.toPretty());
console.timeEnd('apply for license');
