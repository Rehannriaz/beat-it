# Setup per usare localhost con Spotify

## Problema
Spotify accetta solo redirect URI **HTTPS**, non `http://localhost`. 

## Soluzione: Usa ngrok per esporre il backend

### Opzione 1: Solo backend su ngrok (consigliato)

1. **Ferma il tunnel ngrok del frontend** (se attivo)

2. **Avvia ngrok per il backend:**
   ```bash
   ngrok http 3001
   ```
   
   Copia l'URL ngrok (es. `https://xxxxx.ngrok-free.app`)

3. **Aggiorna Spotify Dashboard:**
   - Vai su https://developer.spotify.com/dashboard
   - Apri la tua app
   - In "Redirect URIs", aggiungi: `https://xxxxx.ngrok-free.app/api/callback`
   - Rimuovi quello vecchio se vuoi

4. **Aggiorna `frontend/.env.local`:**
   ```env
   NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
   SPOTIFY_CLIENT_SECRET=your_client_secret
   NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://xxxxx.ngrok-free.app/api/callback
   NEXT_PUBLIC_API_URL=https://xxxxx.ngrok-free.app/api
   ```

5. **Aggiorna `backend/.env`:**
   ```env
   SPOTIFY_REDIRECT_URI=https://xxxxx.ngrok-free.app/api/callback
   FRONTEND_URL=http://localhost:3000
   ```

6. **Riavvia i server:**
   ```bash
   # Backend (in un terminale)
   cd backend
   npm run dev
   
   # Frontend (in un altro terminale)
   cd frontend
   npm run dev
   ```

7. **Accedi a:** `http://localhost:3000/spotify-test`

### Come funziona:
- Frontend: `localhost:3000` (HTTP, solo locale)
- Backend: `https://xxxxx.ngrok-free.app` (HTTPS, esposto via ngrok)
- Spotify fa redirect a ngrok (HTTPS) ✅
- Il backend riceve il codice e fa redirect a `localhost:3000` ✅
- Il frontend chiama il backend via ngrok (HTTPS) ✅

### Opzione 2: Entrambi su ngrok

Se vuoi esporre anche il frontend:

1. **Terminale 1 - Backend:**
   ```bash
   ngrok http 3001
   ```
   Copia URL backend (es. `https://backend-xxxxx.ngrok-free.app`)

2. **Terminale 2 - Frontend:**
   ```bash
   ngrok http 3000
   ```
   Copia URL frontend (es. `https://frontend-yyyyy.ngrok-free.app`)

3. **Aggiorna configurazioni:**
   - Spotify redirect URI: `https://backend-xxxxx.ngrok-free.app/api/callback`
   - `NEXT_PUBLIC_API_URL`: `https://backend-xxxxx.ngrok-free.app/api`
   - `NEXT_PUBLIC_SPOTIFY_REDIRECT_URI`: `https://backend-xxxxx.ngrok-free.app/api/callback`
   - `FRONTEND_URL`: `https://frontend-yyyyy.ngrok-free.app`

4. **Accedi a:** `https://frontend-yyyyy.ngrok-free.app/spotify-test`

## Nota importante
Con account ngrok gratuito, puoi avere solo **un tunnel alla volta**. Quindi:
- **Opzione 1** (solo backend su ngrok) è la più semplice
- **Opzione 2** richiede due account ngrok o account a pagamento
