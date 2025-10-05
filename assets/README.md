# Assets do App (runtime)

- Pastas: `brand/` (logos/ícones), `ui/` (ilustrações), `placeholders/`.
- Nomes: kebab-case (ex.: `logo-light-800.webp`, `icon-dark-transparent-500.webp`).
- Formato preferido: WEBP (logos 800/400; ícones 500; variantes opacas e transparentes).
- Versionamento: arquivos binários ficam sob Git LFS; instale e faça `git lfs pull` após o clone.
- Publicação: GitHub Pages do projeto em `/Projeto-marco/…`.

## Exemplo (tema automático + responsivo)
<picture>
  <source srcset="/Projeto-marco/assets/app/brand/logo-dark-800.webp 800w, /Projeto-marco/assets/app/brand/logo-dark-400.webp 400w" media="(prefers-color-scheme: dark)" type="image/webp">
  <source srcset="/Projeto-marco/assets/app/brand/logo-light-800.webp 800w, /Projeto-marco/assets/app/brand/logo-light-400.webp 400w" media="(prefers-color-scheme: light)" type="image/webp">
  <img src="/Projeto-marco/assets/app/brand/logo-light-400.webp" alt="Logo 5 Horas" width="400" height="100">
</picture>
