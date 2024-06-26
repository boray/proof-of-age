import {
  AccountUpdate,
  Bool,
  Field,
  Mina,
  PrivateKey,
  PublicKey,
  UInt64,
} from 'o1js';
import { ProofOfAge, AdulthoodProof } from './ProofOfAge';

let proofsEnabled = false;

describe('ProofOfAge', () => {
  let deployerAccount: Mina.TestPublicKey,
    deployerKey: PrivateKey,
    senderAccount: Mina.TestPublicKey,
    senderKey: PrivateKey,
    zkAppAddress: PublicKey,
    zkAppPrivateKey: PrivateKey,
    zkApp: ProofOfAge;

  beforeAll(async () => {
    if (proofsEnabled) {
      await ProofOfAge.compile();
    }
  });

  beforeEach(async () => {
    const Local = await Mina.LocalBlockchain({ proofsEnabled });
    Mina.setActiveInstance(Local);
    [deployerAccount, senderAccount] = Local.testAccounts;
    deployerKey = deployerAccount.key;
    senderKey = senderAccount.key;

    zkAppPrivateKey = PrivateKey.random();
    zkAppAddress = zkAppPrivateKey.toPublicKey();
    zkApp = new ProofOfAge(zkAppAddress);
  });

  async function localDeploy() {
    const txn = await Mina.transaction(deployerAccount, async () => {
      AccountUpdate.fundNewAccount(deployerAccount);
      await zkApp.deploy();
    });
    await txn.prove();
    // this tx needs .sign(), because `deploy()` adds an account update that requires signature authorization
    await txn.sign([deployerKey, zkAppPrivateKey]).send();
  }

  it('proves adulthood', async () => {
    await localDeploy();

    const adulthood_proof = new AdulthoodProof({
      first_name: Field(1),
      last_name: Field(1),
      nationality: Field(1),
      date_of_birth: Field(1),
      gender: Field(1),
      passport_expiration_date: Field(1),
      passport_number: Field(1),
    });

    const txn = await Mina.transaction(senderAccount, async () => {
      await zkApp.proveAdulthood(senderAccount.key, adulthood_proof);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();
  });
});
