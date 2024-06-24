import { AccountUpdate, Bool, Permissions, Field, PublicKey, SmartContract, UInt64, method, Provable } from 'o1js';
import { ProofOfAge } from './ProofOfAge.js';

export { DrivingLicenseContract };

class DrivingLicenseContract extends SmartContract {

    async deploy() {
        await super.deploy();
        this.account.permissions.set({
          ...Permissions.default(),
          access: Permissions.proofOrSignature(),
        });
      }

  @method async apply_for_driving_license(address: PublicKey, adulthood_contract: PublicKey, token_id: Field) {
    const proof_of_age = new ProofOfAge(adulthood_contract);
    await proof_of_age.isAdult(address,token_id);
  }
}


