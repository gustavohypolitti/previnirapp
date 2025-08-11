# PrevinirApp v4 — Empresas, Avaliações e Meus Exames
Atualizado: 2025-08-11

## Novidades
- **Aba Para empresas (`empresas.html`)**: explicação + cadastro com e-mail, CNPJ, senha, nome fantasia e **lista de exames**; opção de **Patrocinado** para destaque nas buscas.
- **Instituições (`instituicoes.html`)**: lista públicas com nota média; usuários logados podem **avaliar (1–5 estrelas)** e comentar.
- **Meus exames (`meus-exames.html`)**: após logado, vê exames sugeridos/salvos, marca **Realizado** e vê **próxima periodicidade** (calculada pelo intervalo típico do exame).

## Backend
Endpoints adicionados em `server.js`:
- `POST /org/register` → criar instituição (retorna token de organização)
- `POST /org/login` → login de instituição
- `GET /v1/institutions` → lista pública com média de avaliações (patrocinadas primeiro)
- `POST /v1/ratings` (JWT usuário) → avaliar instituição
- `GET /v1/user-exams` (JWT usuário)
- `POST /v1/user-exams` (JWT usuário) → salvar exame sugerido (nome + periodicidade)
- `PUT /v1/user-exams/:id` (JWT) → marcar realizado e calcular próxima data
- `DELETE /v1/user-exams/:id` (JWT)

## Banco (Supabase)
Use `schema_v4.sql` para criar as tabelas: `institutions`, `ratings`, `user_exams`.

## Integração front → Meus exames
- Quando gerar recomendações, faça `POST /v1/user-exams` com `{ "exam": "Mamografia", "periodicidade": "Anual" }` para salvar.
- A página `meus-exames.html` lista e permite marcar **Realizado** com cálculo da próxima data (anual, 2 anos, 10 anos, 6 meses etc.).