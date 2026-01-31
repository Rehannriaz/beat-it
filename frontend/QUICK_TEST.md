# Guida Rapida per Testare Spotify Integration

## ✅ Checklist Pre-Test

Assicurati che tutto sia attivo:

1. **Backend in esecuzione:**
   ```bash
   cd backend
   npm run dev
   ```
   Dovresti vedere: `Server running on port 3001`

2. **Ngrok attivo per backend:**
   ```bash
   ngrok http 3001
   ```
   Copia l'URL che appare (es. `https://xxxxx.ngrok-free.dev`)

3. **Frontend in esecuzione:**
   ```bash
   cd frontend
   npm run dev
   ```
   Dovresti vedere: `Local: http://localhost:3000`

4. **Configurazione aggiornata:**
   - Verifica che `.env.local` abbia l'URL ngrok corretto
   - Verifica che Spotify Dashboard abbia il redirect URI corretto

## 🧪 Come Testare

### Passo 1: Apri la pagina di test
Vai su: **http://localhost:3000/spotify-test**

### Passo 2: Login con Spotify
1. Clicca il bottone **"Login with Spotify"** (verde)
2. Verrai reindirizzato a Spotify
3. Autorizza l'applicazione
4. Verrai reindirizzato di nuovo alla pagina

### Passo 3: Verifica il login
Dopo il login dovresti vedere:
- Il tuo nome utente Spotify
- La tua immagine profilo
- Un bottone "Logout"

### Passo 4: Cerca una canzone
1. Nella sezione "Search for a Track"
2. Digita il nome di una canzone (es. "Blinding Lights")
3. Premi Enter o clicca il bottone di ricerca
4. Dovresti vedere una lista di risultati

### Passo 5: Riproduci una canzone
1. Clicca su una canzone dalla lista
2. Dovresti vedere il player Spotify apparire
3. Dovrebbe mostrare "Connecting to Spotify player..."
4. Poi dovrebbe mostrare i controlli play/pause

### Passo 6: Controlla il player
- Clicca Play per iniziare la riproduzione
- Dovresti vedere la barra di progresso muoversi
- Dovresti vedere il tempo corrente e la durata

## ❌ Risoluzione Problemi

### "Failed to fetch" o "Connection refused"
- Verifica che il backend sia in esecuzione: `curl http://localhost:3001/api/health`
- Verifica che ngrok sia attivo: controlla il terminale ngrok
- Verifica che l'URL in `.env.local` corrisponda all'URL ngrok attuale

### "Not authenticated"
- Assicurati di aver completato il login
- Controlla la console del browser per errori
- Prova a fare logout e login di nuovo

### "Player not ready"
- Assicurati di avere **Spotify Premium** (richiesto per Web Playback SDK)
- Controlla che lo script Spotify sia caricato (Network tab nel browser)
- Prova a ricaricare la pagina

### Ngrok offline
- Riavvia ngrok: `ngrok http 3001`
- Se l'URL cambia, aggiorna `.env.local` e Spotify Dashboard
- Riavvia il frontend dopo aver aggiornato `.env.local`

## 📝 Note Importanti

- **Spotify Premium è richiesto** per usare il Web Playback SDK
- L'URL ngrok può cambiare ogni volta che lo riavvii (account gratuito)
- Se cambi l'URL ngrok, devi aggiornare:
  1. `frontend/.env.local`
  2. `backend/.env`
  3. Spotify Dashboard (redirect URI)
  4. Riavviare i server

## 🎯 Test Completo Riuscito

Se tutto funziona, dovresti essere in grado di:
- ✅ Fare login con Spotify
- ✅ Vedere il tuo profilo
- ✅ Cercare canzoni
- ✅ Selezionare una canzone
- ✅ Vedere il player Spotify
- ✅ Riprodurre la musica
- ✅ Controllare play/pause, volume, seek

Buon test! 🎵
