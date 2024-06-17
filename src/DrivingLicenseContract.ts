import { Field, PublicKey, SmartContract, method } from "o1js";
import { ProofOfAge } from './ProofOfAge.js';



export class DrivingLicenseContract extends SmartContract {

    @method async apply_for_driving_license(address: PublicKey, token_id: Field) {
        ProofOfAge.verify_adulthood(address,token_id);
        // submit application
    }
    
}