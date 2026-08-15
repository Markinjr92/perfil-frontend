# Perfil Frontend (estático)

UI do jogo Perfil para publicar no **Render** (Static Site).

## Local

Abra com qualquer server estático, por exemplo:

```bash
npx serve .
```

Por padrão a API aponta para:

`https://api-bolao.markinjr92.com.br/perfil`

Override em `index.html` (`window.PERFIL_API_BASE`) ou no console.

## Render

- **Type:** Static Site
- **Build:** vazio (ou `echo ok`)
- **Publish directory:** `.`

## Fluxo

1. Solo: escolher categoria → revelar dicas → chutar  
2. Sala: criar/entrar → host inicia rodada → host revela dicas → todos chutam
