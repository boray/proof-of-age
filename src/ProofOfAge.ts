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
  State,
  Permissions,
  state,
  TokenId,
  Provable
} from 'o1js';

export { ProofOfAge, AdulthoodProof };
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
    // the logic of proving adulthood is not impelemented here. For discussions, please refer to https://github.com/MinaFoundation/Core-Grants/pull/11
    return Bool(true);
  }
}

/**
 * permissions
 * this.deriveTokenId()
 * README
 */
// https://discord.com/channels/484437221055922177/1222981963283955802
class ProofOfAge extends TokenContract {
  
  async deploy() {
    await super.deploy();
    this.account.tokenSymbol.set('ADULT');
    this.account.permissions.set({
      ...Permissions.default(),
      access: Permissions.proofOrSignature(),
      
    });

  }

  @method async proveAdulthood(adulthood_proof: AdulthoodProof) {
    adulthood_proof.prove_adult().assertTrue();
    // assert token balance is zero
    const sender = this.sender.getAndRequireSignature();
    const account = AccountUpdate.create(sender, this.deriveTokenId()).account;
    const balance = account.balance.get();
    account.balance.requireEquals(balance);
    balance.assertEquals(UInt64.from(0));
    // mint soulbound token
    this.internal.mint({ address: sender, amount: 1 });
  }

  @method
  async isAdult(address: PublicKey, token_id: Field) {
    AccountUpdate.create(address, token_id)
      .account.balance.getAndRequireEquals()
      .assertEquals(UInt64.from(1));
  
  }

  static async verifyAdulthood(address: PublicKey, token_id: Field) {
    const update = AccountUpdate.create(address, token_id);
    const balance = update.account.balance.get();
    update.account.balance.requireEquals(balance);
    balance.assertEquals(UInt64.from(1));
    return update
  }

  @method // approveBase is not a method thus not provable. This means wrappers around approveBase (e.g. transfer) are not provable as well.
  async approveBase(updates: AccountUpdateForest): Promise<void> {
    this.checkZeroBalanceChange(updates);
  }
}
