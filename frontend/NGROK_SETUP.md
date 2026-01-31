# Setup Ngrok per Backend e Frontend

## Problema
Quando usi ngrok per il frontend, il browser non può chiamare `localhost:3001` perché è un URL locale.

## Soluzione: Esponi anche il backend con ngrok

### Passo 1: Ferma il tunnel ngrok esistente
Nel terminale dove gira ngrok per il frontend, premi `Ctrl+C`

### Passo 2: Avvia ngrok per il backend
Apri un **nuovo terminale** e avvia:
```bash
ngrok http 3001
```

Copia l'URL ngrok del backend (es. `https://xxxxx.ngrok-free.app`)

### Passo 3: Avvia ngrok per il frontend
Apri un **altro terminale** e avvia:
```bash
ngrok http 3000
```

Copia l'URL ngrok del frontend (es. `https://yyyyy.ngrok-free.app`)

### Passo 4: Aggiorna le configurazioni

**Frontend `.env.local`:**
```env
NEXT_PUBLIC_SPOTIFY_CLIENT_ID=your_client_id
SPOTIFY_CLIENT_SECRET=your_client_secret
NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=https://yyyyy.ngrok-free.app/spotify-test
NEXT_PUBLIC_API_URL=https://xxxxx.ngrok-free.app/api
```

**Backend `.env`:**
```env
SPOTIFY_REDIRECT_URI=https://xxxxx.ngrok-free.app/api/callback
FRONTEND_URL=https://yyyyy.ngrok-free.app
```

**Spotify Dashboard:**
- Aggiungi redirect URI: `https://xxxxx.ngrok-free.app/api/callback`

### Passo 5: Riavvia i server
```bash
# Backend
cd backend
npm run dev

# Frontend (in un altro terminale)
cd frontend
npm run dev
```

## Alternativa: Usa localhost per tutto

Se non vuoi usare ngrok:

1. **Cambia redirect URI in Spotify Dashboard:**
   - Rimuovi: `https://phlegmless-lawson-unsentimentalised.ngrok-free.dev/spotify-test`
   - Aggiungi: `http://localhost:3001/api/callback`

2. **Aggiorna `frontend/.env.local`:**
   ```env
   NEXT_PUBLIC_SPOTIFY_REDIRECT_URI=http://localhost:3001/api/callback
   NEXT_PUBLIC_API_URL=http://localhost:3001/api
   ```

3. **Accedi a:** `http://localhost:3000/spotify-test`

## Nota
Con account ngrok gratuito, puoi avere solo **un tunnel alla volta**. Per avere entrambi i tunnel, devi:
- Usare due account ngrok diversi, oppure
- Usare ngrok con account a pagamento che supporta multiple tunnels
