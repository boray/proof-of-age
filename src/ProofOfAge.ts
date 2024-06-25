import {
  Field,
  method,
  Struct,
  Bool,
  Poseidon,
  PublicKey,
  AccountUpdate,
  State,
  Permissions,
  state,
  SmartContract,
  PrivateKey,
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
    // the logic of proving adulthood is not implemented here. For discussions, please refer to https://github.com/MinaFoundation/Core-Grants/pull/11
    return Bool(true);
  }
}

class ProofOfAge extends SmartContract {
  @state(PublicKey) owner = State<PublicKey>();

  @method async proveAdulthood(
    private_key: PrivateKey,
    adulthood_proof: AdulthoodProof
  ) {
    adulthood_proof.prove_adult().assertTrue();
    private_key
      .toPublicKey()
      .assertEquals(this.sender.getAndRequireSignature());
    this.owner.set(this.sender.getAndRequireSignature());
  }

  static async verifyAdulthood(
    user_address: PublicKey,
    proof_address: PublicKey,
    vk_hash: Field
  ) {
    let accountUpdate = AccountUpdate.create(proof_address);

    accountUpdate.body.preconditions.account.provedState.isSome = Bool(true);
    accountUpdate.body.preconditions.account.state[0] = {
      isSome: Bool(true),
      value: user_address.toFields()[0],
    };
    accountUpdate.body.preconditions.account.state[1] = {
      isSome: Bool(true),
      value: user_address.toFields()[1],
    };
    accountUpdate.body.authorizationKind.verificationKeyHash.assertEquals(
      vk_hash
    );
  }
}
