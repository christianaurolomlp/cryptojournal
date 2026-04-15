import React, { useState } from 'react'

// Map ticker → CoinGecko numeric ID (para URL de imagen directa)
const CG_IMG = {
  BTC:  '1/bitcoin',      ETH:  '279/ethereum',     SOL:  '4128/solana',
  BNB:  '825/binance-coin-logo', XRP: '44/xrp-symbol-white-128',
  DOGE: '5/dogecoin',     ADA:  '975/cardano',       AVAX: '12559/avalanche-2',
  LINK: '877/chainlink-new-logo', MATIC:'4713/matic-network',
  DOT:  '12171/polkadot-new-dot-logo', ATOM:'1481/cosmos-hub',
  UNI:  '12504/uniswap-uni-logo', LTC: '2/litecoin',
  BCH:  '780/bitcoin-cash-icon', NEAR:'10365/near',
  APT:  '26455/aptos-apt-logo', ARB: '16547/photo_2023-03-29_21-47-54',
  OP:   '25244/op-logo-01-01-2024-svg', INJ: '12882/injective-protocol-logo',
  SUI:  '26375/sui_asset', SEI:  '28205/sei-logo',
  TIA:  '31967/celestia', PEPE: '29850/pepe-token',
  SHIB: '11939/shiba-inu', FLOKI:'10804/floki-inu',
  BONK: '28600/bonk-logo', WIF:  '33566/dogwifhat',
  TON:  '17980/ton_symbol', HBAR:'5765/hedera-hashgraph',
  ICP:  '14495/Internet_Computer_logo', FIL:'2632/filecoin',
  RENDER:'11636/render-token', WLD:'35226/wld-1',
  JUP:  '34188/jup-token', PYTH:'31924/pyth-logo',
  ONDO: '26580/ondo-finance', TAO: '29270/bittensor',
  ENA:  '36309/ethena', XLM:  '100/stellar',
  VET:  '3077/vechain-logo', ALGO:'4030/algorand',
  AAVE: '7675/aave-logo', CRV:  '12124/curve-logo',
  MKR:  '1364/maker', GRT:  '13397/graph-token',
  GOLD: '10722/tether_gold',
}

// Fallback: GitHub cryptocurrency-icons (500+ cryptos, por ticker)
function githubUrl(ticker) {
  return `https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/32/color/${ticker.toLowerCase()}.png`
}

function cgUrl(ticker) {
  const path = CG_IMG[ticker]
  if (!path) return null
  return `https://assets.coingecko.com/coins/images/${path}.png`
}

export default function CryptoLogo({ symbol, size = 26 }) {
  const ticker = (symbol || '').toUpperCase().replace(/USDT$|USDC$|USD$|\.P$/,'')
  
  const sources = [
    cgUrl(ticker),
    githubUrl(ticker),
  ].filter(Boolean)

  const [idx, setIdx] = useState(0)

  const handleError = () => {
    if (idx < sources.length - 1) {
      setIdx(idx + 1)
    } else {
      setIdx(sources.length) // show placeholder
    }
  }

  if (idx >= sources.length) {
    // Placeholder: círculo con inicial
    const colors = ['#1C77FF','#22c55e','#F59E0B','#ef4444','#a855f7','#38d8f5','#f97316','#ec4899']
    const color = colors[ticker.charCodeAt(0) % colors.length]
    return (
      <span style={{
        width: size, height: size, borderRadius: '50%',
        background: `linear-gradient(135deg, ${color}, ${color}99)`,
        display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
        fontSize: size * 0.42, fontWeight: 800, color: '#fff', flexShrink: 0,
        fontFamily: 'Inter,sans-serif', letterSpacing: '-0.02em',
        userSelect: 'none',
      }}>
        {ticker.charAt(0)}
      </span>
    )
  }

  return (
    <img
      src={sources[idx]}
      alt={ticker}
      onError={handleError}
      style={{
        width: size, height: size, borderRadius: '50%',
        objectFit: 'contain', flexShrink: 0,
        background: 'rgba(255,255,255,0.08)',
      }}
    />
  )
}
