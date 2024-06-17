import {
  Field,
  method,
  Struct,
  Bool,
  Poseidon,
  TokenContract,
  PublicKey,
  UInt64,
  AccountUpdate,
  AccountUpdateForest,
  Int64,
  Provable,
} from 'o1js';

export { ProofOfAge, AdulthoodProof};
/**
 * PROOF-OF-AGE
 * COMPOSABLE PROOFS
 */


class AdulthoodProof extends Struct({
  first_name: Field,
  last_name: Field,
  nationality: Field,
  date_of_birth: Field,
  gender: Field,
  passport_expiration_date: Field,
  passport_number: Field,
}) {
  hash(): Field {
    return Poseidon.hash([
      this.first_name,
      this.last_name,
      this.nationality,
      this.date_of_birth,
      this.gender,
      this.passport_expiration_date,
      this.passport_number,
    ]);
  }
  prove_adult(): Bool {
    // verification logic (zkPassport - add link here)
    return Bool(true);
  }
}

class ProofOfAge extends TokenContract {
  async deploy() {
    await super.deploy();
    this.account.tokenSymbol.set('ADULT');
  }

  init() {
    super.init();
  }

  @method async proveAdulthood(
    sender: PublicKey,
    adulthood_proof: AdulthoodProof
  ) {
    adulthood_proof.prove_adult().assertTrue();
    // assert token balance is zero
    // const sender = this.sender.getAndRequireSignature();
    const account = AccountUpdate.create(sender, this.deriveTokenId()).account;
    const balance = account.balance.get();
    account.balance.requireEquals(balance);
    balance.assertEquals(UInt64.from(0));
    // mint soulbound token
    this.internal.mint({ address: sender, amount: 1 });
  }

  @method.returns(Bool)
  async isAdult(address: PublicKey): Promise<Bool> {
    ProofOfAge.verifyAdulthood(address, this.deriveTokenId());
    return Bool(true);
  }

  static async verifyAdulthood(address: PublicKey, token_id: Field) {
    const account = AccountUpdate.create(address, token_id).account;
    const balance = account.balance.get();
    account.balance.requireEquals(balance);
    balance.assertEquals(UInt64.from(1));
  }

  @method
  async approveBase(updates: AccountUpdateForest): Promise<void> {
    let totalBalance = Int64.from(0);
    this.forEachUpdate(updates, (update, usesToken) => {
      totalBalance = Provable.if(
        usesToken,
        totalBalance.add(update.balanceChange),
        totalBalance
      );
    });
    totalBalance.assertEquals(Int64.zero);
  }
}
