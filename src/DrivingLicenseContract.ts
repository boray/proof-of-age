import { Field, PublicKey, SmartContract, method } from 'o1js';
import { ProofOfAge } from './ProofOfAge.js';

export { DrivingLicenseContract };

class DrivingLicenseContract extends SmartContract {
  @method async apply_for_driving_license(proof_address: PublicKey) {
    await ProofOfAge.verifyAdulthood(
      this.sender.getAndRequireSignature(),
      proof_address,
      Field(
        3392518251768960475377392625298437850623664973002200885669375116181514017494n
      )
    );
  }
}
