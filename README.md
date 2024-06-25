#  Proof Of Age: Proof Composition Example

## Overview

Proving adulthood is required in gambling, finance, voting, and 18+ or 21+ rated applications. Using o1js, it’s possible to prove adulthood without leaking credentials. However, verifying credentials for validity each time can be costly. Instead, a proof-of-age smart contract is deployed, credentials are verified through the proveAdulthood() method, and the public key is set to a state field of the smart contract. Since only the proveAdulthood() method can set the related state field, if a smart contract has the correct verification key and the adult’s public key in its state, the smart contract itself serves as proof that the associated user is an adult. There is no need to verify credentials again. To verify adulthood proofs in other smart contracts, one would import the ProofOfAge class and add ProofOfAge.verifyAdulthood(), which calls the verifyAdulthood() static function of the ProofOfAge class. By doing this, verifying adulthood is added to the method as a precondition.

## How to build

```sh
npm run build
```

## How to run tests

```sh
npm run test
npm run testw # watch mode
```

## How to run coverage

```sh
npm run coverage
```

# How to interact

```sh
npm run build && node build/src/interact.js
```
## TODO
- [ ] Increase test coverage
- [ ] Better readme

## License

[Apache-2.0](LICENSE)
