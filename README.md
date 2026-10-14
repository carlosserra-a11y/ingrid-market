# Ingrid Market ✦

Landing page da **Ingrid Lima**, vídeomaker mobile, social media e tráfego pago ([@ingridlimadomkt](https://www.instagram.com/ingridlimadomkt/)).

Página única, estática, com animações ligadas à rolagem. O destaque é o hero: um olho em macro no fundo da página, e a câmera mergulha na íris até entrar na pupila conforme a pessoa rola.

## Estrutura

```
index.html          conteúdo e SEO (title, Open Graph, JSON-LD)
style.css           identidade visual, layout e responsivo
main.js             olho em WebGL, animações (GSAP + ScrollTrigger + Lenis), vídeos, formulário
favicon.svg
apple-touch-icon.png
assets/
  img/              fotos da Ingrid (WebP + JPG), posters dos vídeos, og.jpg
  videos/           portfólio (.mp4 H.264 + .webm VP9 de reserva)
```

Bibliotecas (via CDN, versão fixa e com Subresource Integrity): GSAP 3.13.0, ScrollTrigger 3.13.0 e Lenis 1.3.4.

## Rodar localmente

Qualquer servidor estático serve. Por exemplo:

```bash
npx serve@14.2.4 -l 5173
```

Depois é só abrir `http://localhost:5173`. Não abra o `index.html` direto do disco: os vídeos precisam de um servidor.

## Publicar

É um site estático, sem etapa de build. Funciona em Vercel, Netlify, Hostinger ou GitHub Pages. Basta apontar a hospedagem para a raiz do repositório.

**No ar:** https://carlosserra-a11y.github.io/ingrid-market/ (GitHub Pages, publica sozinho a cada push na `main`).

Se mudar de domínio, atualize `og:url` e `og:image` no `index.html` com o novo endereço, para a prévia aparecer certinho no WhatsApp e no Instagram.

## Como editar

### WhatsApp, mensagem e formulário
No topo do `main.js`, em `CONFIG`:

- `whatsapp`: número com DDI e DDD, só dígitos (`5548996966456`).
- `waMessage`: mensagem pré-preenchida dos botões.
- `formEndpoint`: opcional. Se preencher com uma URL (Formspree, Make, Zapier, Google Apps Script…), o formulário também envia os dados em JSON para lá. Vazio = só abre o WhatsApp com a mensagem montada.

Os links no HTML já apontam para o número, para funcionar mesmo sem JavaScript. O `main.js` reescreve todos os `[data-wa]` a partir do `CONFIG`.

### Textos
Todos estão no `index.html`, organizados por seção (comentários `<!-- ===== -->`).

### Cores e fontes
Variáveis no topo do `style.css` (`:root`): `--bg`, `--primary`, `--accent`, `--rose` etc. Fontes: Syne (títulos), Instrument Serif itálico (destaques) e Manrope (texto).

### Vídeos do portfólio
1. Exporte em vertical 720×1280. Para converter um `.MOV` do iPhone:
   ```bash
   ffmpeg -i entrada.MOV -vf "scale=720:1280,fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 27 -movflags +faststart -c:a aac -b:a 96k assets/videos/nome.mp4
   ffmpeg -i assets/videos/nome.mp4 -c:v libvpx-vp9 -b:v 0 -crf 45 -c:a libopus -b:a 64k assets/videos/nome.webm
   ffmpeg -ss 2 -i assets/videos/nome.mp4 -frames:v 1 -c:v libwebp -quality 72 assets/img/posters/nome.webp
   ```
   Vídeos em HDR (iPhone) precisam de *tone mapping*. Veja o filtro `zscale…tonemap` usado no Omoda 7.
2. Copie um bloco `<li class="reel">` no `index.html`, troque os caminhos, o título, o cliente e o `data-reel` (índice sequencial).

Os vídeos só carregam quando aparecem na tela (`preload="none"`). No máximo 2 tocam ao mesmo tempo, sempre sem som. O clique abre o player com som.

### Depoimentos
Em `main.js`, preencha `TESTIMONIALS` com depoimentos **reais**. Enquanto a lista estiver vazia, a seção fica oculta.

### O olho do hero
O olho é desenhado em **WebGL, direto no código** (`EYE_FRAG` no `main.js`), e não a partir de uma foto. Por isso fica nítido mesmo com zoom de 10× e não pesa nada para baixar. Para ajustar:

- **Cores da íris:** constantes `BLUE`, `BLUE_D`, `GOLD`, `CHAMP` no shader (valores RGB de 0 a 1).
- **Posição e tamanho (calibrar a pupila):** função `layout()` da classe `Eye`. `scale` é o tamanho do olho, e `cx`/`cy` a posição do centro em unidades da altura da tela (positivo = direita/cima).
- **Ritmo do mergulho:** função `heroScroll()`. Cada etapa tem a posição na linha do tempo (0 a 1 = toda a altura do hero). A altura do hero fica no CSS: `.hero { height: 300svh }` (220svh no celular).
- O reflexo retangular na córnea é a "tela do celular". Fica no bloco "reflexos na córnea".

Sem WebGL, entra um olho em CSS com o mesmo zoom. Com `prefers-reduced-motion`, o hero fica estático, sem zoom e sem rolagem suave.

## Qualidade

- Testado em 375 px (mobile), 961 px e 1440 px, sem rolagem horizontal e sem erros no console.
- O canvas reduz a resolução sozinho se o aparelho não acompanhar e pausa fora da tela ou com a aba oculta.
- Acessibilidade: HTML semântico, link "pular para o conteúdo", foco visível, menu e player navegáveis por teclado (Esc fecha, setas trocam o vídeo) e contraste AA.

## Pendências para confirmar

- [ ] **[CONFIRMAR]** Autorização para citar **Cloud Tech**, **Dimas Omoda Jaecoo** e **Dra. Elizabeth Mello** (faixa de marcas e legendas do portfólio).
- [ ] **[CONFIRMAR]** Cidade e região de atendimento presencial. Hoje o texto diz "Santa Catarina" (Sobre e FAQ).
- [ ] **[CONFIRMAR]** Respostas do FAQ (prazo, tráfego pago, preço) no tom da Ingrid.
- [ ] **[PREENCHER]** Depoimentos reais em `TESTIMONIALS`.
- [ ] **[OPCIONAL]** `formEndpoint` para guardar os leads também numa planilha ou CRM.
