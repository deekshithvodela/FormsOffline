# Forms Offline — Privacy Policy & Zero-Telemetry Disclosure

**Effective Date**: August 11, 2026  
**Author & Maintainer**: Deekshith Vodela ([Linktree](https://linktr.ee/deekshithvodela))  
**License**: MIT License

---

## 1. Zero Telemetry Commitment

Forms Offline is built from the ground up to respect user privacy and data sovereignty.

- **Zero Tracking Scripts**: The application contains zero Google Analytics, zero Mixpanel, zero Segment, zero Facebook Pixel, or any other tracking tools.
- **Zero Third-Party Ad Networks**: No advertising networks or external network requests are executed during normal operation.
- **Zero Error Logging SaaS**: Application logs remain strictly on your local device console.

---

## 2. Local-First Data Storage

All data processed by Forms Offline — including form templates, respondent entries, GPS metadata, signatures, and device profiles — is stored **exclusively inside your browser's IndexedDB engine** on your physical device.

Your data is never transmitted to any central cloud server unless you explicitly configure the optional Self-Hosted Remote Collector Addon (`packages/collector-server`).

---

## 3. End-to-End Encryption (E2EE)

When E2EE is enabled, record payloads are encrypted on your local device using **WebCrypto AES-GCM 256-bit encryption** with a key derived via PBKDF2 (100,000 iterations). Only devices holding your private passphrase can decrypt and read the underlying responses.
