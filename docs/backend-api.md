# Backend API contract

REST endpoints the frontend expects from the backend service (`chainsettle-backend`), beyond the core shipment and auth routes. Client wrappers live in `src/lib/api/services.ts`.

## Shipment comments

Used by the shipment discussion thread (`src/components/shipments/ShipmentComments.tsx`) through `commentsApi.list(shipmentId)` and `commentsApi.create(shipmentId, body)`.

### 1. List Comments
- **Method & Route**: `GET /shipments/:id/comments`
- **Auth**: Optional / Bearer JWT
- **Response**: `200 OK`
```json
{
  "success": true,
  "data": [
    {
      "id": "comment_abc123",
      "shipmentId": "SHIP-20260927-ABCD",
      "authorAddress": "GAA...",
      "authorRole": "BUYER",
      "content": "Customs clearance paperwork has been uploaded for Milestone 2.",
      "createdAt": "2026-09-27T14:30:00.000Z",
      "updatedAt": "2026-09-27T14:30:00.000Z"
    }
  ]
}
```

### 2. Create Comment
- **Method & Route**: `POST /shipments/:id/comments`
- **Auth**: Required (`Authorization: Bearer <jwt>`)
- **Headers**: `Content-Type: application/json`
- **Request Body**:
```json
{
  "content": "Customs clearance paperwork has been uploaded for Milestone 2."
}
```
- **Validation**:
  - `content`: string, non-empty, max 1000 characters.
  - User extracted from JWT must be a party to the shipment (`buyerAddress`, `supplierAddress`, `logisticsAddress`, `arbiterAddress`). Non-parties receive `403 Forbidden`.
- **Response**: `201 Created`
```json
{
  "success": true,
  "data": {
    "id": "comment_abc124",
    "shipmentId": "SHIP-20260927-ABCD",
    "authorAddress": "GAA...",
    "authorRole": "BUYER",
    "content": "Customs clearance paperwork has been uploaded for Milestone 2.",
    "createdAt": "2026-09-27T14:30:00.000Z"
  }
}
```
