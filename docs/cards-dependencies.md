
# Inter-card Dependencies
```mermaid
graph TD
  catalog-endpoint --> order-create
  order-create --> payment-webhook
  payment-webhook --> tickets-issuance
  tickets-issuance --> my-tickets
  tickets-issuance --> qr-token
  operators-login --> validators-sessions
  validators-sessions --> tickets-scan
  qr-token --> tickets-scan
  tickets-scan --> reports-redemptions
```
