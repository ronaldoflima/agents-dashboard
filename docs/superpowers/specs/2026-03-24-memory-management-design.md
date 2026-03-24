# Memory Management Dashboard — Design Spec

**Date:** 2026-03-24
**Phase:** 1 — Memory Management
**Status:** Draft

## Overview

Web dashboard para gerenciar memórias do Claude Code. Visão global de todos os projetos com CRUD completo sobre arquivos de memória individuais, mantendo consistência com o filesystem.

## Context

O sistema de memória do Claude Code armazena dados em `~/.claude/projects/<project-slug>/memory/`:
- `MEMORY.md` — arquivo index com links para memórias individuais
- `<type>_<name>.md` — arquivos de memória com frontmatter YAML + body markdown

Exemplo de MEMORY.md:
```markdown
# Memory Index

- [feedback_support_branch.md](feedback_support_branch.md) — Commits do support agent vão para branch support/main
- [feedback_rfc_process.md](feedback_rfc_process.md) — Antes de escrever RFC, fazer brainstorming interativo
```

Exemplo de arquivo de memória:
```markdown
---
name: Prefer manual Superset dataset edits
description: User prefers to update Superset datasets manually via UI
type: feedback
---

Não criar datasets no Superset via API quando for update.

**Why:** O usuário prefere controle manual sobre mudanças no Superset.
**How to apply:** Fornecer link direto para o dataset + SQL pronto para colar.
```

Tipos de memória: `user`, `feedback`, `project`, `reference`.

## Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Scope | Visão global (todos os projetos) | Acompanhar memórias recentes de qualquer projeto |
| Stack | Next.js full-stack | Frontend + API no mesmo projeto, deploy simples |
| Storage | Filesystem direto | Source of truth são os arquivos .md, sem banco |
| UI pattern | Cards/grid estilo Notion | Visual scanning rápido por tipo e projeto |
| Editor | Markdown raw + preview split | Simples, sem overhead de WYSIWYG |
| Criação | Templates por tipo | Guia estrutura (Why/How to apply) para feedback/project |

## Data Model

```typescript
interface Memory {
  id: string              // SHA-256 hex (first 16 chars) do filepath absoluto
  fileName: string        // nome do arquivo (ex: feedback_manual_edits.md)
  projectSlug: string     // slug do diretório do projeto
  projectName: string     // último segmento do slug (ex: "torrepx" de "-Users-...-torrepx")
  name: string            // frontmatter: name
  description: string     // frontmatter: description
  type: "user" | "feedback" | "project" | "reference"
  body: string            // conteúdo markdown após frontmatter
  lastModified: string    // mtime do arquivo (ISO 8601 UTC: "2026-03-24T14:30:00.000Z")
}

interface Project {
  slug: string
  name: string            // último segmento do slug
  memoryCount: number
  path: string
}
```

### ID generation

`id = sha256(absoluteFilePath).hex().slice(0, 16)`

O id é derivado do filepath. Quando type/name mudam e o arquivo é renomeado, o PUT retorna o novo `Memory` object com o novo `id`. O frontend deve substituir o objeto inteiro, não apenas atualizar campos.

### projectName extraction

Extraído do slug: último segmento separado por `-` que forme um nome de projeto real. Regra: split do slug por `-`, tomar os segmentos após o último segmento que seja um path component conhecido (Users, ronaldo, pessoal, projects, px, etc.).

Na prática, para os slugs existentes:
- `-Users-ronaldo-...-torrepx` → `torrepx`
- `-Users-ronaldo-...-px-kpis-success-manager` → `px-kpis-success-manager`
- `-Users-ronaldo-...-finance-ops-bot` → `finance-ops-bot`

Implementação: extrair a porção após o último match de path base conhecido.

## API

| Method | Route | Description |
|--------|-------|-------------|
| GET | `/api/projects` | Lista projetos com memórias |
| GET | `/api/memories?project=&type=&search=` | Lista memórias com filtros |
| GET | `/api/memories/[id]` | Detalhe de uma memória |
| POST | `/api/memories` | Cria memória (arquivo + atualiza MEMORY.md) |
| PUT | `/api/memories/[id]` | Atualiza memória existente |
| DELETE | `/api/memories/[id]` | Deleta memória (arquivo + remove do MEMORY.md) |

### Search behavior

`GET /api/memories?search=` busca case-insensitive com match parcial nos campos: `name`, `description`, `body`. Retorna memórias que contenham o termo em qualquer um dos três campos.

### POST /api/memories

Request:
```json
{
  "projectSlug": "-Users-ronaldo-...-torrepx",
  "name": "Prefer manual edits",
  "description": "User prefers manual Superset edits",
  "type": "feedback",
  "body": "**Why:** ...\n**How to apply:** ..."
}
```

Response: `Memory` object (201 Created).

Backend:
1. Gera filename: `<type>_<snake_case_name>.md`
2. Verifica se arquivo já existe → se sim, retorna 409 Conflict
3. Escreve arquivo com frontmatter + body
4. Reescreve MEMORY.md index a partir dos arquivos presentes no diretório (reconciliação)
5. Retorna memória criada

### PUT /api/memories/[id]

Request: campos atualizáveis (`name`, `description`, `type`, `body`).

Response: `Memory` object completo com novo `id` se filepath mudou (200 OK).

Backend:
1. Cria backup em `.backups/` subdirectory (mantém apenas último backup por arquivo)
2. Sobrescreve com novo conteúdo
3. Se type/name mudou (filename muda), renomeia arquivo, verifica colisão (409 se existir)
4. Reescreve MEMORY.md index via reconciliação (scan do diretório)

### DELETE /api/memories/[id]

Response: 204 No Content.

Backend:
1. Cria backup em `.backups/` subdirectory
2. Remove arquivo
3. Reescreve MEMORY.md index via reconciliação

### Error responses

```typescript
interface ApiError {
  error: string    // código: "NOT_FOUND", "CONFLICT", "INVALID_INPUT"
  message: string  // descrição legível
}
```

| Status | Quando |
|--------|--------|
| 400 | Campos obrigatórios faltando ou tipo inválido |
| 404 | Memória ou projeto não encontrado |
| 409 | Filename já existe (colisão) |
| 500 | Erro de filesystem |

### MEMORY.md consistency

MEMORY.md é tratado como **index derivado**. Em toda operação de escrita (POST/PUT/DELETE), o backend reconstrói o index a partir dos arquivos `.md` presentes no diretório (excluindo `.backups/`). Isso garante consistência mesmo que o processo falhe entre operações.

### Backups

Backups ficam em `~/.claude/projects/<slug>/memory/.backups/<filename>.bak`. Apenas o backup mais recente de cada arquivo é mantido. O scanner ignora o diretório `.backups/`.

## UI

### Layout principal

```
┌─────────────────────────────────────────────────────┐
│  Agents Dashboard         [busca]    [filtros tipo]  │
├─────────────────────────────────────────────────────┤
│  Projetos: [All] [torrepx] [finance-ops] [...]      │
├─────────────────────────────────────────────────────┤
│  ┌──────────┐ ┌──────────┐ ┌──────────┐            │
│  │ feedback  │ │ project  │ │ feedback │            │
│  │ ───────── │ │ ──────── │ │ ──────── │            │
│  │ Prefer    │ │ Phase 10 │ │ Support  │            │
│  │ manual... │ │ blocked  │ │ branch   │            │
│  │           │ │          │ │          │            │
│  │ torrepx   │ │ kpis-sm  │ │ torrepx  │            │
│  │ 3h ago    │ │ 1d ago   │ │ 2d ago   │            │
│  └──────────┘ └──────────┘ └──────────┘            │
│  ...                                                │
├─────────────────────────────────────────────────────┤
│  [+ Nova Memória]                                   │
└─────────────────────────────────────────────────────┘
```

### Card de memória

- Badge colorido por tipo (feedback=amarelo, project=azul, user=verde, reference=cinza)
- Nome da memória (truncado)
- Descrição (1 linha)
- Projeto de origem
- Tempo relativo (mtime)
- Click abre modal de edição

### Modal de edição/criação

- Campos: name, type (select), description, project (select, só na criação — default é o projeto ativo no filtro)
- Split view: editor markdown à esquerda, preview à direita
- Na criação: selecionar tipo preenche template no body
- Botões: Cancelar, Salvar, Deletar (com confirmação)

### Ordenação

Default: `lastModified` desc (mais recentes primeiro).

### Templates por tipo

| Type | Template |
|------|----------|
| feedback | `**Why:**\n\n**How to apply:**` |
| project | `**Why:**\n\n**How to apply:**` |
| user | (vazio) |
| reference | (vazio) |

## File Structure

```
agents-dashboard/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx
│   │   └── api/
│   │       ├── projects/route.ts
│   │       └── memories/
│   │           ├── route.ts          # GET (list), POST (create)
│   │           └── [id]/route.ts     # GET, PUT, DELETE
│   ├── components/
│   │   ├── MemoryCard.tsx
│   │   ├── MemoryGrid.tsx
│   │   ├── MemoryModal.tsx
│   │   ├── FilterBar.tsx
│   │   └── ProjectTabs.tsx
│   ├── lib/
│   │   ├── memory-parser.ts          # gray-matter + read/write .md
│   │   ├── memory-index.ts           # reescreve MEMORY.md index
│   │   ├── project-scanner.ts        # descobre projetos em ~/.claude/projects/
│   │   └── templates.ts              # templates por tipo
│   └── types/
│       └── index.ts
├── package.json
├── tsconfig.json
├── next.config.ts
└── tailwind.config.ts
```

## Dependencies

- `next` — framework full-stack
- `tailwindcss` — styling
- `gray-matter` — parse frontmatter YAML
- `react-markdown` + `remark-gfm` — preview markdown
- `react-hot-toast` — feedback de ações

## Flows

### Criar memória
1. Usuário clica "+ Nova Memória"
2. Modal abre → seleciona tipo → template preenchido
3. Preenche name, description, body
4. POST /api/memories → escreve arquivo + atualiza index
5. Grid atualiza com novo card

### Editar memória
1. Clica no card → modal com dados atuais
2. Edita campos/body
3. PUT /api/memories/[id] → backup + sobrescreve + atualiza index
4. Card atualiza

### Deletar memória
1. Botão deletar no modal → confirmação
2. DELETE /api/memories/[id] → backup + remove + reescreve index
3. Card removido do grid

## Out of scope (Phase 1)

- Integração com agents ou skills
- Multi-user
- Versionamento Git
- Sincronização remota
- Edição do CLAUDE.md

## Success Criteria

- Round-trip filesystem → API → UI → filesystem consistente
- Nenhuma memória perdida ou corrompida ao editar/criar/deletar
- MEMORY.md index sempre reflete os arquivos presentes
- Interface permite navegação e edição rápida de memórias
- Busca full-text funcional across todos os projetos
