# Rebalancer Contract Verification & Interaction Guide

## Contract Details
- **Contract**: Rebalancer.sol
- **Compiler**: Solidity ^0.8.24 (use 0.8.24)
- **Optimization**: Enabled, 200 runs (Hardhat default)
- **Constructor**: No parameters

## Verification Steps

### Option 1: Using Build Artifact (Recommended)
1. After deploying with `npx hardhat run scripts/deploy.js --network localhost`
2. Find the artifact at: `artifacts/contracts/Rebalancer.sol/Rebalancer.json`
3. In the block explorer:
   - Go to your contract address page
   - Click "Verify Contract" 
   - Select "Build Artifact"
   - Upload the `Rebalancer.json` file
   - Click "Verify Contract"

### Option 2: Manual Source Code
1. Copy your entire Rebalancer.sol source code
2. In the block explorer:
   - Click "Verify Contract"
   - Select "Source Code" 
   - Paste the source code
   - Set compiler version: **0.8.24**
   - Enable optimization: **Yes**
   - Optimization runs: **200**
   - Leave constructor args empty
   - Click "Verify Contract"

## Contract Interaction

Once verified, you'll see a "Contract Interaction" section with:

### Read Functions (View/Pure)
- `getPortfolioValue()` - Get current ETH and USDC values
- `getCurrentDeviation()` - Check if rebalancing is needed
- `getBalances()` - Get actual ETH and USDC balances
- `previewRebalance()` - Preview what a rebalance would do
- `owner()` - Get contract owner address
- `DEVIATION_THRESHOLD()` - Get the 5% threshold
- `TARGET_RATIO()` - Get the 50% target ratio

### Write Functions (State-changing)
**⚠️ Only callable by the contract owner (your address)**

- `deposit()` - Deposit ETH (payable function)
  - Enter ETH amount in the "ETH Value" field
- `withdraw(ethAmount, usdcAmount)` - Withdraw funds
  - ethAmount: Amount of ETH to withdraw (in wei)
  - usdcAmount: Amount of USDC to withdraw (in USDC units)
- `manualRebalance()` - Trigger rebalancing manually

### Example Usage

1. **Deposit ETH**:
   - Function: `deposit()`
   - ETH Value: `1.0` (to deposit 1 ETH)
   - Click "Call"

2. **Check Portfolio**:
   - Function: `getPortfolioValue()`
   - Click "Call" (no parameters needed)

3. **Check if Rebalancing Needed**:
   - Function: `getCurrentDeviation()`
   - Click "Call"
   - If result > 500 (5%), rebalancing is needed

4. **Manual Rebalance**:
   - Function: `manualRebalance()`
   - Click "Call" (no parameters needed)

5. **Withdraw All Funds**:
   - First call `getBalances()` to see current amounts
   - Then call `withdraw(ethAmount, usdcAmount)` with those values

## Important Notes

- **Owner Only**: All write functions except view functions require you to be the contract owner
- **Gas Fees**: Write functions will prompt MetaMask for gas fees
- **Network**: Make sure MetaMask is connected to the same network as your local node
- **Slippage**: The contract has 5% max slippage protection built-in
- **Price Feeds**: Uses Chainlink ETH/USD price feed on Base

## Troubleshooting

- **"Not owner" error**: Make sure you're connected with the same wallet that deployed the contract
- **"Price stale" error**: Chainlink price feed data is too old (>1 hour)
- **Transaction fails**: Check that the contract has sufficient ETH/USDC for the operation
- **MetaMask not detected**: Install MetaMask browser extension
- **Wrong network**: Switch MetaMask to your local network (usually localhost:8545)

## Contract Functions Overview

Your Rebalancer contract automatically:
- Maintains 50/50 ETH/USDC allocation
- Rebalances when deviation exceeds 5%
- Uses SushiSwap for token swaps
- Gets prices from Chainlink oracles
- Protects against slippage and stale prices
- Can be automated with Chainlink Automation 