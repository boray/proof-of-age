import { AccountUpdate, Bool, Field, Mina, PrivateKey, PublicKey, UInt64 } from 'o1js';
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
    if (proofsEnabled) await ProofOfAge.compile();
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

  it('generates and deploys the `ProofOfAge` smart contract', async () => {
    await localDeploy();
    const counter = zkApp.circulating.get();
    expect(counter).toEqual(UInt64.from(0));
  });

  it('mints a new soulbound proof-of-age token, updates circulating and check adulthood', async () => {
    await localDeploy();

    const adulthood_proof = new AdulthoodProof({
      first_name: Field(1),
      last_name: Field(1),
      nationality: Field(1),
      date_of_birth: Field(1),
      gender: Field(1),
      passport_expiration_date: Field(1),
      passport_number: Field(1)
    });

    const txn = await Mina.transaction(senderAccount, async () => {
      AccountUpdate.fundNewAccount(senderAccount);
      await zkApp.prove_adulthood(senderAccount,adulthood_proof);
    });
    await txn.prove();
    await txn.sign([senderKey]).send();

    const txnx = await Mina.transaction(senderAccount, async () => {
      await zkApp.updateCirculating();
    });
    await txnx.prove();
    await txnx.sign([senderKey]).send();

    const updatedCounter = zkApp.circulating.get();
    expect(updatedCounter).toEqual(UInt64.from(1));
    
    let res;
    const txny = await Mina.transaction(senderAccount, async () => {
      res = await zkApp.is_adult(senderAccount);
    });
    await txny.prove();
    await txny.sign([senderKey]).send();
    expect(res).toEqual(Bool(true));

  });

});
