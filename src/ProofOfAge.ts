import { Field, SmartContract, state, State, method, Struct, Bool, Poseidon, Permissions, PublicKey } from 'o1js';

/**
 * PROOF-OF-AGE
 * COMPOSABLE PROOFS
 */



export class AdulthoodProof extends Struct({
  first_name: Field,
  last_name: Field,
  nationality: Field,
  date_of_birth: Field,
  gender: Field,
  passport_expiration_date: Field,
  passport_number: Field
}) {

  hash(): Field {
    return Poseidon.hash([this.first_name,this.last_name,this.nationality,
      this.date_of_birth,this.gender,this.passport_expiration_date,this.passport_number])
  }
  verify(): Bool {
    return Bool(true);
  }

}
export class ProofOfAge extends SmartContract {
  @state(Field) counter = State<Field>();

  init() {
    super.init();
    this.counter.set(Field(0));
  }
 
  @method async prove_adulthood(adulthood_proof: AdulthoodProof) {
    adulthood_proof.verify().assertTrue();
    // assert token balance is zero
    // mint token
    const currentCount = this.counter.getAndRequireEquals();
    this.counter.set(currentCount.add(1));
  }
  async is_adult(user: PublicKey){
    // assert balance equals to one
    return Bool(true);
  }
}
