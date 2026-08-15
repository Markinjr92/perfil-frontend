# Perfil Frontend (estático)

UI do jogo Perfil para publicar no **Render** (Static Site).

## Render

| Campo | Valor |
|-------|--------|
| **Build Command** | `true` (ou deixe um no-op) |
| **Publish Directory** | `public` |

Igual ao `overlay-obs`: os arquivos ficam em `public/`.

Há um `render.yaml` no repo com `staticPublishPath: ./public`.

## Local

```bash
npx serve public
```

API padrão: `https://api-bolao.markinjr92.com.br/perfil`  
(override em `public/index.html` via `window.PERFIL_API_BASE`)
