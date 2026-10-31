# Calls run in the browser over our own WebRTC, not a telephony provider

Callers and Listeners talk browser-to-browser over WebRTC: the API pairs them through a WebSocket and audio flows through Cloudflare's TURN relay. We chose this over Twilio and Africa's Talking because per-minute phone charges would have eaten most of the low KES call price; TURN costs only for relayed bandwidth.

## Considered Options

- **Twilio voice**: the original implementation. Dropped for cost, and it billed in USD.
- **Africa's Talking voice**: cheaper in Kenya, but still per-minute, and every call would need a phone number on both ends.
- **Peer-to-peer WebRTC without a relay**: free, but fails behind many mobile and office networks, so production forces relay-only.

## Consequences

- Calls need a modern browser and microphone permission; there is no dial-in by phone.
- Who is online and every live Call are held in the API's memory, so the API must run as **one always-on instance** (Render Starter, not free, and never scaled out). A restart or deploy ends live Calls; they are billed up to the drop.
- Calls are never recorded, because no media passes through our servers.
