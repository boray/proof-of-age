import { Field, SmartContract, state, State, method, Struct, Bool, Poseidon, TokenContract, PublicKey, Reducer, UInt64, DeployArgs, UInt8, AccountUpdate, AccountUpdateForest, Int64, Provable, MerkleList} from 'o1js';

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

export class MintEvent extends Struct({
  recipient: PublicKey,
  amount: UInt64,
}) {}


export class ProofOfAge extends TokenContract {
  @state(UInt64) circulating = State<UInt64>()
  @state(Field) actionState = State<Field>()

  readonly events = {
    Mint: MintEvent
  }

  reducer = Reducer({ actionType: Int64 })

  async deploy() {
    await super.deploy()
    this.circulating.set(UInt64.from(0))
    this.account.tokenSymbol.set("ADULT")
    this.actionState.set(Reducer.initialActionState)
  }

  init() {
    super.init();
  }
 
  @method async prove_adulthood(adulthood_proof: AdulthoodProof) {
    adulthood_proof.verify().assertTrue();
    // assert token balance is zero
    const sender = this.sender.getAndRequireSignature();
    const account = AccountUpdate.create(sender, this.deriveTokenId()).account
    const balance = account.balance.get()
    account.balance.requireEquals(balance)
    balance.assertEquals(UInt64.from(0))
    // mint soulbound token
    this.internal.mint({ address: sender, amount: 1 });
    this.emitEvent("Mint", new MintEvent({ recipient: sender , amount: UInt64.from(1) }))
    this.reducer.dispatch(Int64.from(1))
  }

  @method.returns(Bool)
  async is_adult(address: PublicKey): Promise<Bool> {
    this.verify_adulthood(address)
    return Bool(true);
  }

  async verify_adulthood(address: PublicKey){
    const account = AccountUpdate.create(address, this.deriveTokenId()).account
    const balance = account.balance.get()
    account.balance.requireEquals(balance)
    balance.assertEquals(UInt64.from(1))
  }

  @method
  async approveBase(updates: AccountUpdateForest): Promise<void> {
    let totalBalance = Int64.from(0)
    this.forEachUpdate(updates, (update, usesToken) => {      
      totalBalance = Provable.if(usesToken, totalBalance.add(update.balanceChange), totalBalance)
    })
    totalBalance.assertEquals(Int64.zero)
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
 


}
