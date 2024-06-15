import { Field, SmartContract, state, State, method, Struct, Bool, Poseidon, Experimental, PublicKey, UInt64, Int64, Reducer } from 'o1js';

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

const { OffchainState } = Experimental;

export const offchainState = OffchainState(
  {
    accounts: OffchainState.Map(PublicKey, UInt64),
  },
  { logTotalCapacity: 10, maxActionsPerProof: 5 }
);

export class StateProof extends offchainState.Proof {}


export class ProofOfAge extends SmartContract {
  @state(Field) circulating = State<UInt64>();
  @state(Field) actionState = State<Field>()
  @state(OffchainState.Commitments) offchainState = offchainState.commitments();

  reducer = Reducer({ actionType: Int64 })

  init() {
    super.init();
    this.circulating.set(UInt64.zero);
  }
 
  @method.returns(UInt64)
  async getSupply() {
    const circulating = this.circulating.getAndRequireEquals();
    return circulating;
  }

  @method.returns(UInt64)
  async getBalance(address: PublicKey) {
    return (await offchainState.fields.accounts.get(address)).orElse(0n);
  }

  @method
  async settle(proof: StateProof) {
    await offchainState.settle(proof);
  }

  @method
  async updateCirculating() {
    let oldCirculating = this.circulating.getAndRequireEquals()
    let actionState = this.actionState.getAndRequireEquals()
    let pendingActions = this.reducer.getActions({ fromActionState: actionState })

    let newCirculating = this.reducer.reduce(
     pendingActions,
     Int64,
     (circulating: Int64, action: Int64) => {
       return circulating.add(action)
     },
     Int64.from(oldCirculating),
     { maxUpdatesWithActions: 500 },
   )
     newCirculating.isPositive().assertTrue()
     
    this.circulating.set(newCirculating.magnitude)
    this.actionState.set(pendingActions.hash)
  }
   
  @method async prove_adulthood(adulthood_proof: AdulthoodProof) {
    adulthood_proof.verify().assertTrue();
    const sender = this.sender.getAndRequireSignature();
    let senderOption = await offchainState.fields.accounts.get(sender);
    senderOption.isSome.assertFalse();
    offchainState.fields.accounts.update(sender, {
      from: undefined,
      to: UInt64.one,
    });
    
    this.reducer.dispatch(Int64.one)

  }

  async is_adult(address: PublicKey){
    const balance = (await offchainState.fields.accounts.get(address)).orElse(0n);
    balance.assertEquals(UInt64.from(1));
    return Bool(true);
  }
}
