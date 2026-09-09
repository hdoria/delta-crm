# Base CRM

Projeto de prática para a aula de BMAD da Delta Academy em 09/09/2026, das 10h às 12h.
A base vem de [trycompai/crm](https://github.com/trycompai/crm), sob licença MIT.
O visual e os recursos centrais do CRM seguem o projeto original.

Esta versão usa Postgres e Auth do Supabase. O login Google é o padrão.
Para a aula, há uma opção temporária de e-mail e senha restrita ao Supabase local.
O backend continua usando Prisma e tRPC para empresas, contatos e negócios.
SSO, chaves de API e conexões de e-mail/calendário estão desabilitados nesta versão.
O BMAD entra durante a aula; a base não inclui uma instalação do BMAD.

## Preparar o ambiente local

Requisitos: Node.js 22 ou superior, Bun 1.3.12, Supabase CLI 2.117 ou superior e Docker ativo.
No macOS, OrbStack atende ao requisito de Docker.

Na raiz do repositório:

```sh
cp .env.example .env
bun install
bun run setup:local
bun run dev
```

`setup:local` prepara o arquivo `.env` da raiz e as chaves do Supabase local.
O seed preenche o CRM com empresas, contatos, negócios, atividades e campos de exemplo.
Nenhum registro do seed vem de cliente real. Empresas e e-mails usam domínios `.example`.
O seed não consulta sites, baixa logos, cria senhas ou gera sessões de login.

| Serviço | Endereço local |
| --- | --- |
| App | http://localhost:3000 |
| API do CRM | http://localhost:3001 |
| API do Supabase | http://127.0.0.1:57321 |
| Postgres do Supabase | 127.0.0.1:57322 |
| Supabase Studio | http://127.0.0.1:57323 |

O projeto Supabase local se chama `base-crm`. Suas portas ficam entre 57320 e 57329.
Ele usa containers e volumes próprios, separados de outras instâncias locais.

Comandos de operação:

```sh
bun run supabase:start
bun run supabase:status
bun run supabase:stop
bun run db:seed
```

Parar o Supabase preserva os dados locais. Rodar o seed novamente preserva os registros já existentes e evita duplicatas.
`bun run dev` inicia app e API. `bun run dev:full` inclui o agente herdado do projeto original.
As integrações externas do agente exigem configuração própria e ficam fora do exercício inicial.

## Login temporário por e-mail e senha

No `.env` da raiz, defina `LOCAL_EMAIL_LOGIN_ENABLED="true"` e inclua o e-mail autorizado em `ALLOWED_SIGN_IN`.
Reinicie o Supabase com `bun run supabase:stop` e `bun run supabase:start`, depois reinicie app e API.
O formulário aparece quando o provedor de e-mail está ativo na instância local.

A conta deve ser criada e confirmada pelo administrador no Supabase Auth.
Use a API administrativa em ambiente local, com a chave de serviço somente no servidor.
Não grave senhas em scripts versionados, seed ou documentação.
O login usa `signInWithPassword` do Supabase e exige e-mail confirmado e lista de acesso.
O cadastro público fica desabilitado enquanto esse modo está ativo.

O primeiro usuário autorizado recebe o papel de owner. Contas posteriores recebem member;
um owner existente é preservado. Os representantes do seed não recebem acesso.
O papel owner permite administrar o workspace e os recursos disponíveis do CRM.
As integrações desabilitadas nesta versão continuam exigindo implementação própria.

Para voltar ao login Google, defina `LOCAL_EMAIL_LOGIN_ENABLED="false"`, configure o provedor abaixo e reinicie os serviços.
A opção temporária só aceita URLs Supabase de loopback (`127.0.0.1`, `localhost` ou `::1`).
Ela não habilita login por senha em um projeto Supabase remoto.

## Ativar o login Google depois

O banco e os dados de exemplo funcionam sem credenciais Google.
Configure o cliente OAuth quando quiser usar esse provedor.

1. No Google Cloud, crie um cliente OAuth do tipo Web application.
2. Configure a tela de consentimento. Em modo de teste, adicione os e-mails que participarão da aula.
3. Cadastre `http://localhost:3000` como origem JavaScript autorizada.
4. Cadastre `http://127.0.0.1:57321/auth/v1/callback` como URI de redirecionamento autorizada.
5. Preencha `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` no `.env` da raiz.
6. Preencha `ALLOWED_SIGN_IN` com e-mails ou domínios autorizados, separados por vírgula.
7. Reinicie Supabase, API e app.

Exemplo de formato da lista, usando endereços fictícios:

```dotenv
ALLOWED_SIGN_IN="instrutor@escola.example,aluno@escola.example"
```

Um domínio inteiro permite qualquer e-mail desse domínio. Para uma turma pequena, use e-mails individuais.
A lista vazia recusa acesso. O primeiro usuário autorizado recebe o papel de owner, se ainda não houver um owner real.
Os representantes fictícios do seed não recebem conta Google, matrícula no workspace ou privilégios de administração.

Os scripts Supabase leem o `.env` da raiz e ativam Google somente quando o par de credenciais existe.
Não edite `enabled` manualmente no `config.toml`. Use `bun run supabase:start` após preencher o par.
E-mail e senha ficam desativados por padrão. A opção local acima é a exceção temporária.
Telefone e login anônimo permanecem desativados.

O redirecionamento do Google termina no Supabase, em `/auth/v1/callback`.
Depois disso, o Supabase volta ao app em `http://localhost:3000/auth/callback`.

## Conectar um projeto Supabase na nuvem

Esta etapa fica para depois da preparação local.

1. Crie um projeto Supabase exclusivo para o Base CRM.
2. Desative a Data API desse projeto. O backend acessa Postgres por Prisma; Auth continua sendo o serviço de identidade.
3. Configure Google como único provedor de login. Desative e-mail, telefone e login anônimo.
4. Cadastre no Google Cloud o callback `https://SEU-PROJETO.supabase.co/auth/v1/callback`.
5. Configure no Supabase a URL do app e seu callback `/auth/callback`, usando os endereços do ambiente escolhido.
6. Atualize as variáveis de ambiente abaixo. Guarde as credenciais em `.env` local ou no gerenciador de segredos da hospedagem.
7. Aplique as migrations Prisma com `bun run db:deploy`.
8. Execute o SQL de `supabase/migrations/20260909000000_private_crm.sql` no projeto correspondente.
9. Reinicie os serviços e valide login, permissões e gravação de um registro de teste.

| Variável | Valor no ambiente conectado |
| --- | --- |
| `DATABASE_URL` | Conexão Postgres do projeto, para uso exclusivo do servidor |
| `SUPABASE_URL` | URL do projeto Supabase |
| `SUPABASE_ANON_KEY` | Chave pública do projeto, usada pelo servidor para validar sessão |
| `NEXT_PUBLIC_SUPABASE_URL` | A mesma URL do projeto |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | A mesma chave pública para o navegador |
| `APP_URL` | Origem do app |
| `API_URL` | Origem da API do CRM |
| `ALLOWED_SIGN_IN` | Lista explícita de usuários ou domínios autorizados |
| `LOCAL_EMAIL_LOGIN_ENABLED` | `false` no ambiente conectado |

Na nuvem, as credenciais Google ficam na configuração do provedor no Supabase.
`GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` controlam o provedor da instância local.
Não use uma chave secreta ou `service_role` em variáveis `NEXT_PUBLIC_*`.
Não execute o seed contra um banco existente sem decidir antes quais dados de exemplo devem entrar.

Localmente, a Data API expõe apenas o schema vazio `base_crm_api`.
A migration Supabase também remove permissões públicas sobre tabelas, sequências e funções do CRM.
As migrations Prisma continuam sendo a fonte do schema das tabelas de negócio.

## Roteiro da demonstração BMAD

A feature da aula é um aviso textual na tabela de negócios abertos há pelo menos 7 dias completos na mesma etapa.
O aviso informa os dias completos. Mudar de etapa reinicia a contagem. Negócios encerrados ficam fora.
A implementação acontece durante a aula.

O [exercício BMAD](exercicio-bmad.md) reúne o prompt pra copiar, os critérios de aceite e o mapa técnico pro instrutor.
Ele também registra os checks, a validação manual e o plano B.

Na raiz de `delta-crm`, instale com `npx bmad-method install` e selecione o módulo BMM. O core vem junto.
Confirme os comandos com `bmad-help`. Use `/` no Claude Code, como `/bmad-help`, e `$` no Codex, como `$bmad-help`.
Use `bmad-spec` quando quiser mostrar a SPEC antes da execução.
Use `bmad-build` pra investigar a base, implementar, testar e revisar.

Reserve 35 minutos como orçamento da feature e mais 8 minutos pra instalação.
Use 0 a 5 minutos pra intenção e aceite, 5 a 25 pra Build e 25 a 35 pra revisão e demonstração.
Confira ambiente, login e dados fictícios antes de começar a demonstração.
O exercício registra uma pendência de preflight: preparar `uv`, exigido pelo [guia atual de instalação](https://docs.bmad-method.org/start/install-bmad/).

## Referências

- [Configuração local do Supabase](https://supabase.com/docs/guides/local-development/cli/config)
- [Login por senha no Supabase](https://supabase.com/docs/reference/javascript/auth-signinwithpassword)
- [Criação administrativa de usuários](https://supabase.com/docs/reference/javascript/auth-admin-createuser)
- [Login Google no Supabase](https://supabase.com/docs/guides/auth/social-login/auth-google)
- [Proteção da Data API](https://supabase.com/docs/guides/api/securing-your-api)
- [Configuração do Prisma com PostgreSQL](https://www.prisma.io/docs/orm/overview/databases/postgresql)
- [Projeto original](https://github.com/trycompai/crm)
