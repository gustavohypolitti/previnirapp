# PrevinirApp v3
Atualizado: 2025-08-10

## Novidades
- **Login/JWT** (registro, login, proteção de rotas)
- **Painel** (`painel.html`) com listagem de agendamentos do usuário
- **OTP por SMS** (Twilio) — fallback imprime código no console do backend
- **Validação de CPF** (dígitos verificadores) e máscaras de telefone
- Integração de **Google Places** para encontrar clínicas próximas
- Persistência em **Supabase** (tabelas `users`, `bookings`, `otps`)

## Como subir
1. **Frontend** (GitHub Pages): envie `index.html`, `login.html`, `painel.html`, `sobre.html`.
2. **Backend** (Node 18+):
   ```bash
   npm i express cors node-fetch @supabase/supabase-js dotenv bcrypt jsonwebtoken twilio
   cp .env.sample .env  # preencha as chaves
   node server.js
   ```
3. **Banco (Supabase)**: cole `schema.sql` no editor SQL do projeto.

## Endpoints
- `POST /auth/register`  → body: {name,email,password,cpf,phone,otp_code?}  → {"token":...}
- `POST /auth/login`     → body: {email,password}                              → {"token":...}
- `POST /v1/otp/send`    → body: {phone}  (envia/printa código 6 dígitos)
- `GET  /v1/clinics?exam=<q>&lat=..&lng=..`  → clínicas próximas (Google Places)
- `GET  /v1/bookings`    (JWT) → lista do usuário
- `POST /v1/bookings`    (JWT) → salva agendamento do usuário

> Dica de deploy: publique o backend em Render/Railway/Fly.io e, no GitHub Pages, use um **CNAME**/subdomínio (ou substitua `fetch('/...')` pelos URLs do seu backend). Habilite **CORS** se estiverem em domínios diferentes.
