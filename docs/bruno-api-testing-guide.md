# Guida al testing API con Bruno

Questa guida spiega come testare gli endpoint del backend (in particolare **timbrature**, anche in **bulk**) usando [Bruno](https://www.usebruno.com/) (GUI o CLI).

---

## Prerequisiti

1. **Stack attivo**: gateway, auth-service e timbrature-service devono essere in esecuzione (es. `docker compose up` o avvio locale).
2. **Bruno**: installato in locale ([download](https://www.usebruno.com/downloads)) o CLI:
   ```bash
   npm install -g @usebruno/cli
   ```
3. **Base URL**: il gateway è su `http://localhost:3000/api/v1` (locale). Per altri ambienti crea un environment in Bruno (es. `local`, `staging`).

---

## 1. Variabili da impostare

Per i test sulle timbrature servono almeno:

| Variabile      | Descrizione | Come ottenerla |
|----------------|-------------|----------------|
| `userId`       | UUID dell’utente che timbra | Dopo il login, da `GET /auth/me` (campo `id`) |
| `commessaId`   | UUID della commessa | Da `GET /commesse` (quando implementato) o valore di test |
| `accessToken`  | JWT per le chiamate autenticate | Estratto da `POST /auth/login` (campo `accessToken`) |

Nel file **`bruno.json`** sono già definite variabili di esempio per i load test:

- `userId`: placeholder (sostituire con l’id reale da `/auth/me`)
- `commessaId`: placeholder (sostituire con una commessa esistente)

Per test manuali puoi usare l’environment di Bruno e impostare queste variabili dopo il primo login.

---

## 2. Flusso consigliato: login → userId → timbrature

### 2.1 Login

**Request**

- **Method**: `POST`
- **URL**: `{{baseUrl}}/auth/login`
- **Body (JSON)**:
  ```json
  {
    "email": "admin@example.com",
    "password": "ChangeMe123!",
    "deviceId": "bruno-device-1"
  }
  ```

**Response attesa (200)**

- `accessToken`: usalo in `Authorization: Bearer <accessToken>`
- `refreshToken`: per `POST /auth/refresh`
- `expiresIn`: secondi di validità dell’access token

Salva `accessToken` nell’environment (es. variabile `accessToken`) per le richieste successive.

### 2.2 Ottenere l’userId (profilo)

**Request**

- **Method**: `GET`
- **URL**: `{{baseUrl}}/auth/me`
- **Headers**: `Authorization: Bearer {{accessToken}}`

**Response attesa (200)**

- `id`: **userId** da usare nelle timbrature
- `email`, `role`, `permissions`

Imposta la variabile `userId` con il valore di `id` per i test sulle timbrature.

### 2.3 Commessa (quando disponibile)

Se l’endpoint `GET /commesse` è attivo, chiamalo con lo stesso `Authorization` e usa un `id` dalla lista come `commessaId`. Altrimenti usa un UUID di test (deve esistere in DB se il servizio fa FK).

---

## 3. Test timbrature singole

### 3.1 Creare una timbratura (POST → job)

L’API è asincrona: la POST accoda un job e restituisce subito un `jobId`.

**Request**

- **Method**: `POST`
- **URL**: `{{baseUrl}}/timbrature`
- **Headers**:
  - `Authorization: Bearer {{accessToken}}`
  - `Content-Type: application/json`
  - `Idempotency-Key`: UUID univoco (evita duplicati in caso di retry)
- **Body (JSON)**:
  ```json
  {
    "userId": "{{userId}}",
    "commessaId": "{{commessaId}}",
    "tipo": "IN",
    "deviceTimestamp": "2026-02-24T10:00:00.000Z",
    "origine": "ONLINE",
    "note": "test singolo"
  }
  ```

**Valori ammessi**

- `tipo`: `IN` | `OUT`
- `origine`: `ONLINE` | `OFFLINE` | `MANUALE` | `SISTEMA` (opzionale, default `ONLINE`)
- `deviceTimestamp`: ISO 8601 (es. `2026-02-24T10:00:00.000Z`)
- `note`: opzionale

**Response attesa (202 Accepted)**

```json
{
  "status": "accepted",
  "jobId": "<uuid o idempotency-key>",
  "queue": "timbrature"
}
```

### 3.2 Stato del job

**Request**

- **Method**: `GET`
- **URL**: `{{baseUrl}}/timbrature/jobs/{{jobId}}`
- **Headers**: `Authorization: Bearer {{accessToken}}`

Sostituisci `{{jobId}}` con il valore restituito dalla POST.

**Response attesa (200)**

- `state`: es. `completed`, `failed`, `delayed`
- `result`: se completato, es. `{ "timbraturaId": "...", "timestamp": "..." }`
- `failedReason`: presente in caso di errore

Puoi ripetere la GET più volte fino a `state: completed` o `failed`.

### 3.3 Elenco timbrature

**Request**

- **Method**: `GET`
- **URL**: `{{baseUrl}}/timbrature?page=1&limit=20&sort=DESC`
- **Headers**: `Authorization: Bearer {{accessToken}}`

**Response attesa (200)**

- `data`: array di timbrature
- `pagination`: `page`, `limit`, `total`, `totalPages`

---

## 4. Test timbrature in bulk (load test con Bruno)

Il file **`bruno.json`** in root definisce uno scenario di load test (`x-load-test`) per le timbrature.

### 4.1 Cosa fa lo scenario `timbrature-burst`

1. **Login**: una chiamata a `POST /auth/login` con le credenziali configurate; da lì viene estratto `accessToken`.
2. **Timbrature concorrenti**: invio di molte `POST /timbrature` in parallelo (concurrency e totalRequests configurabili).
3. **Ciclo IN/OUT**: il campo `tipo` viene alternato tra `IN` e `OUT` (parametro `typesCycle`).
4. **Idempotency**: ogni richiesta usa un `Idempotency-Key` diverso (es. `{{uuid}}`) per evitare duplicati.
5. **Polling stato job**: dopo ogni POST, opzionalmente viene fatto polling su `GET /timbrature/jobs/{{jobId}}` fino a completamento o timeout.

### 4.2 Variabili nello scenario

Nella sezione `variables` di `bruno.json`:

- **userId**: va impostato con un UUID utente reale (ottenuto da `GET /auth/me` dopo login). Se lasci il placeholder, i job possono fallire se il DB ha vincoli su `user_id`.
- **commessaId**: UUID di una commessa esistente. Stesso discorso: usare un valore valido per il DB.

Per usare dati reali:

1. Esegui manualmente `POST /auth/login` e `GET /auth/me` (o una run con una collection che fa login e salva variabili).
2. Copia `id` (userId) e un `commessaId` valido.
3. Aggiorna le variabili in `bruno.json` nella sezione `variables`, oppure usa un environment Bruno con `userId` e `commessaId` se la CLI lo supporta.

### 4.3 Eseguire il load test da CLI

Dalla root del progetto (dove si trova `bruno.json`):

```bash
# Installa Bruno CLI se non l'hai fatto
npm install -g @usebruno/cli

# Run con parametri di default (o quelli in runnerHints)
bru run --env local

# Con parallelismo e numero di richieste espliciti (es. 50 parallele, 1000 totali)
bru run --env local --parallel 50 --iteration-count 1000
```

- `--env local`: usa l’environment `local` (deve avere `baseUrl` = `http://localhost:3000/api/v1` se non già in `bruno.json`).
- `--parallel`: richieste concorrenti.
- `--iteration-count`: numero totale di POST timbrature.

Verifica nella documentazione della tua versione di Bruno come passare variabili da riga di comando (es. `userId`, `commessaId`) se non vuoi modificarle nel file.

### 4.4 Interpretare i risultati

- **Success rate**: quante POST hanno restituito 202 e, se abilitato, quanti job sono andati in `completed`.
- **Latenza**: tempi di risposta della POST e, se usi polling, del ciclo GET job.
- **Errori**: 401 (token), 400 (validazione), 502 (gateway/servizio giù). Controlla i log di gateway e timbrature-service.

Per carichi molto alti, tieni d’occhio rate limiting (gateway) e code Redis/BullMQ.

---

## 5. Test bulk alternativo: script (curl / Node)

Se non usi la CLI Bruno o vuoi un controllo più fine, puoi:

1. **Login** (curl):
   ```bash
   TOKEN=$(curl -s -X POST http://localhost:3000/api/v1/auth/login \
     -H "Content-Type: application/json" \
     -d '{"email":"admin@example.com","password":"ChangeMe123!","deviceId":"script"}' \
     | jq -r '.accessToken')
   ```
2. **UserId** (curl):
   ```bash
   USER_ID=$(curl -s http://localhost:3000/api/v1/auth/me -H "Authorization: Bearer $TOKEN" | jq -r '.id')
   ```
3. **Loop di POST** (es. 100 timbrature, alternate IN/OUT):
   ```bash
   COMMESSA_ID="00000000-0000-0000-0000-000000000101"  # sostituire con reale
   for i in $(seq 1 100); do
     TIPO=$([ $((i % 2)) -eq 1 ] && echo "IN" || echo "OUT")
     curl -s -X POST http://localhost:3000/api/v1/timbrature \
       -H "Authorization: Bearer $TOKEN" \
       -H "Content-Type: application/json" \
       -H "Idempotency-Key: bulk-$(uuidgen)" \
       -d "{\"userId\":\"$USER_ID\",\"commessaId\":\"$COMMESSA_ID\",\"tipo\":\"$TIPO\",\"deviceTimestamp\":\"$(date -u +%Y-%m-%dT%H:%M:%S.000Z)\",\"origine\":\"ONLINE\"}"
     echo ""
   done
   ```

Adatta `COMMESSA_ID` e il numero di iterazioni; per controllare i job puoi fare GET su `/timbrature/jobs/<jobId>` per ogni `jobId` restituito.

---

## 6. Riepilogo endpoint utili

| Endpoint | Metodo | Uso |
|----------|--------|-----|
| `/auth/login` | POST | Ottenere `accessToken` e `refreshToken` |
| `/auth/refresh` | POST | Rinnovare i token (body: `refreshToken`, `deviceId`) |
| `/auth/me` | GET | Ottenere `userId` (campo `id`) e profilo |
| `/timbrature` | POST | Creare timbratura (async → `jobId`) |
| `/timbrature/jobs/:jobId` | GET | Stato del job |
| `/timbrature` | GET | Lista timbrature (query: `page`, `limit`, `sort`) |
| `/health/live` | GET | Check gateway attivo |

Tutti gli endpoint (tranne login e health) richiedono header **`Authorization: Bearer <accessToken>`**.

---

## 7. Troubleshooting

- **401 su /timbrature o /auth/me**: token scaduto o mancante. Rifare login e aggiornare `accessToken`.
- **400 su POST /timbrature**: controllare che `userId`, `commessaId`, `tipo`, `deviceTimestamp` siano presenti e validi (`tipo` = `IN`|`OUT`, timestamp in ISO 8601).
- **502 / timeout**: verificare che gateway, auth-service e timbrature-service siano up e che Redis/DB siano raggiungibili (es. `docker compose ps`).
- **Job in `failed`**: controllare i log del timbrature-service e del worker BullMQ (validazione, FK, formato dati).

Per dubbi sulla sintassi di Bruno (collection, env, CLI) consulta la [documentazione ufficiale](https://docs.usebruno.com/).
