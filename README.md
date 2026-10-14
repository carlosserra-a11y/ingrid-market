# Ingrid Market ✦

Landing page da **Ingrid Lima**, vídeomaker mobile, social media e tráfego pago ([@ingridlimadomkt](https://www.instagram.com/ingridlimadomkt/)).

Página única, estática, com animações ligadas à rolagem. O destaque é o hero: um olho castanho realista, desenhado por código, ocupa o fundo da página e, conforme a pessoa rola, a câmera mergulha na íris até entrar na pupila.

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
O olho é desenhado em **WebGL, direto no código** (`EYE_FRAG` no `main.js`), sem nenhuma imagem. Por isso fica nítido em qualquer tela e em qualquer zoom:

- **Íris castanha fotorrealista** (função `iris()`): fibras, filamentos dourados, colarete em zigue-zague, criptas, sulcos de contração, anel limbal e pupila de borda nítida. Os detalhes se multiplicam conforme a câmera se aproxima (nível de detalhe contínuo).
- **Olhar feminino e delicado:** formato amendoado com o canto externo erguido, cílios longos e curvados com efeito de rímel (mais longos no canto externo, cada fio escuro na raiz, castanho na ponta e com brilho), sobrancelha fina e arqueada fio a fio, sombra rosé-dourada com brilho fino e iluminador no osso da sobrancelha.
- **Delineado:** nasce quase invisível no canto interno, segue rente aos cílios, engrossa no terço externo e termina num gatinho afilado que continua a curva da pálpebra inferior; tem acabamento acetinado, textura de pigmento e um esfumado marrom suave embaixo, no canto externo.
- **Olho completo** (função `shade()`): pele com relevo 3D (osso da sobrancelha, cavidade, pálpebra, vinco, poros e ruguinhas) iluminada com subsurface; sobrancelha fio a fio; cílios em tufos (3 camadas em cima, 2 embaixo) com sombra projetada; esclera com luz esférica, veias finas e carúncula; linha d'água úmida; cáustica de luz na íris e o reflexo de uma janela na córnea.
- **Câmera:** o olho abre desfocado e a lente "puxa o foco", com um quadrado de autofoco na pupila (a pupila contrai com a luz). Clicar ou tocar no olho dispara o autofoco ali (toque para focar), e o cursor mostra "Foco".
- **Lente macro** (pós-processamento): o foco fica no olho e a pele ao redor desfoca com a distância, como numa foto macro.
- **Vivo:** pisca de forma natural (às vezes duas vezes), faz microssacadas, segue o mouse (no celular, olha em volta sozinho), as pálpebras acompanham o olhar e a pupila oscila e dilata quando o mouse passa nos botões. A abertura inicial acontece em duas etapas.
- O desfoque de movimento acompanha a velocidade da rolagem: quando a pessoa para, a íris fica nítida.

Para ajustar:

- **Cores da íris:** `cDark`, `cBrown`, `cAmber` e `cGold` dentro de `iris()`.
- **Tom da pele:** a primeira linha `vec3 skin=...` em `shade()`.
- **Posição e tamanho:** função `layout()` da classe `Eye`.
- **Ritmo do mergulho:** `heroScroll()`. O zoom é definido pelo tamanho da íris na tela (`zoomFor`), então funciona igual no celular e no desktop. A altura do hero fica no CSS: `.hero { height: 300svh }` (220svh no celular).

**Texto do hero:** *"O feed não para. Seu público, sim."*, com o subtítulo *"Vídeos feitos no celular que fazem as pessoas parar / olhar / lembrar / comprar."* A palavra final se alterna (`.cycle` em `index.html`; `heroCycle()` em `main.js`) e o olho dá uma olhadinha para o texto a cada troca.

**Roteiro do mergulho** (em `index.html`, `.hero__story` e `.viewfinder`):
1. Nos olhos: *"Antes de qualquer câmera, existe um olhar."*
2. Na íris, onde a câmera desacelera: *"É nos detalhes que o público para."*
3. Dentro da pupila, a escuridão vira o visor de uma câmera gravando (REC, cronômetro e foco): *"Do meu olhar para o seu feed."*

Sem WebGL, entra um olho em CSS (`.fb-eye`) com o mesmo mergulho. Com `prefers-reduced-motion`, o hero fica estático, sem zoom e sem rolagem suave.

## Qualidade

- Testado em 375 px (mobile), 961 px e 1440 px, sem rolagem horizontal e sem erros no console.
- O canvas reduz a resolução sozinho se o aparelho não acompanhar e pausa fora da tela ou com a aba oculta.
- Acessibilidade: HTML semântico, link "pular para o conteúdo", foco visível, menu e player navegáveis por teclado (Esc fecha, setas trocam o vídeo) e contraste AA.

## Pendências para confirmar

- [ ] **[CONFIRMAR]** Autorização para citar **Cloud Tech**, **Dimas Omoda Jaecoo** e **Dra. Elizabeth Mello** (faixa de marcas e legendas do portfólio).
- [ ] **[CONFIRMAR]** Nome do cliente do vídeo de gastronomia (*Mesa posta · bastidores*). Hoje a legenda diz "Chef em evento".
- [ ] **[CONFIRMAR]** Cidade e região de atendimento presencial. Hoje o texto diz "Santa Catarina" (Sobre e FAQ).
- [ ] **[CONFIRMAR]** Respostas do FAQ (prazo, tráfego pago, preço) no tom da Ingrid.
- [ ] **[PREENCHER]** Depoimentos reais em `TESTIMONIALS`.
- [ ] **[OPCIONAL]** `formEndpoint` para guardar os leads também numa planilha ou CRM.
