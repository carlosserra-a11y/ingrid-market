# Ingrid Lima · Vídeomaker Mobile ✦

> *"O feed não para. Seu público, sim."*

Landing page da **Ingrid Lima**, vídeomaker mobile, social media e gestora de tráfego pago ([@ingridlimadomkt](https://www.instagram.com/ingridlimadomkt/)).

[![Site no ar](https://img.shields.io/badge/site-no%20ar-4f6bff?style=flat-square)](https://carlosserra-a11y.github.io/ingrid-market/)
![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=flat-square&logo=html5&logoColor=white)
![CSS3](https://img.shields.io/badge/CSS3-1572B6?style=flat-square&logo=css3&logoColor=white)
![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=flat-square&logo=javascript&logoColor=black)
![WebGL](https://img.shields.io/badge/WebGL-990000?style=flat-square&logo=webgl&logoColor=white)
![GSAP](https://img.shields.io/badge/GSAP-3.13-88CE02?style=flat-square&logo=greensock&logoColor=white)
![Sem build](https://img.shields.io/badge/build-nenhum-555?style=flat-square)

**🔗 Acesse:** https://carlosserra-a11y.github.io/ingrid-market/

![Prévia do site](assets/img/og.jpg)

---

## Sumário

- [Sobre o projeto](#sobre-o-projeto)
- [Destaques](#destaques)
- [Tecnologias](#tecnologias)
- [Seções da página](#seções-da-página)
- [Estrutura de pastas](#estrutura-de-pastas)
- [Como rodar localmente](#como-rodar-localmente)
- [Publicação](#publicação)
- [Como editar](#como-editar)
- [Desempenho](#desempenho)
- [Acessibilidade](#acessibilidade)
- [SEO e compartilhamento](#seo-e-compartilhamento)
- [Pendências](#pendências)
- [Autor e licença](#autor-e-licença)

---

## Sobre o projeto

Site de página única, estático e sem etapa de build, feito para apresentar o trabalho da Ingrid e transformar visitantes em contatos no WhatsApp.

O destaque é o **hero**: um olho castanho realista, desenhado inteiramente por código em WebGL, ocupa o fundo da página. Conforme a pessoa rola, a câmera mergulha na íris até entrar na pupila, onde a escuridão vira o visor de uma câmera gravando. A narrativa visual conecta o olhar da Ingrid ao feed do cliente.

## Destaques

- 👁️ **Olho fotorrealista em WebGL**: nenhuma imagem, só shader. Fica nítido em qualquer tela e em qualquer zoom.
- 🎬 **Mergulho guiado pela rolagem**, com três momentos de texto e um visor de câmera (REC, cronômetro e foco) dentro da pupila.
- 📱 **Portfólio em vídeo vertical**: 9 vídeos que tocam sem som ao aparecer na tela, com player em tela cheia para assistir com som.
- 💬 **Formulário que vira mensagem no WhatsApp**, com validação e envio opcional para planilha ou CRM.
- ⚡ **Leve onde importa**: vídeos carregam sob demanda, o canvas ajusta a resolução ao aparelho e tudo pausa quando sai da tela.
- ♿ **Acessível**: HTML semântico, navegação por teclado, contraste AA e respeito a `prefers-reduced-motion`.

## Tecnologias

| Camada | Ferramenta |
| --- | --- |
| Estrutura | HTML5 semântico |
| Estilo | CSS3 puro (variáveis, `clamp()`, unidades `svh`) |
| Interação | JavaScript puro (sem framework) |
| Gráficos | WebGL (shaders GLSL próprios) |
| Animações | [GSAP 3.13.0](https://gsap.com/) + ScrollTrigger 3.13.0 |
| Rolagem suave | [Lenis 1.3.4](https://lenis.darkroom.engineering/) |
| Fontes | Syne (títulos), Instrument Serif itálico (destaques) e Manrope (texto), via Google Fonts |
| Hospedagem | GitHub Pages |

As bibliotecas vêm de CDN (jsDelivr) com **versão fixa e Subresource Integrity** (`integrity="sha384-…"`), então o navegador recusa qualquer arquivo alterado.

## Seções da página

| Seção | Âncora | Conteúdo |
| --- | --- | --- |
| Hero | `#topo` | Olho em WebGL e o mergulho na pupila |
| Manifesto | `#manifesto` | Texto de posicionamento |
| Serviços | `#servicos` | Vídeos mobile, social media, tráfego pago, captação e edição |
| Marcas | — | Faixa com as marcas atendidas |
| Trabalhos | `#trabalhos` | Portfólio com os 9 vídeos |
| Processo | `#processo` | Etapas, do roteiro ao anúncio |
| Entregas | — | O que o cliente recebe, pronto para postar |
| Sobre | `#sobre` | Apresentação da Ingrid |
| Depoimentos | `#depoimentos` | Fica oculta enquanto não houver depoimentos |
| FAQ | `#faq` | Perguntas frequentes |
| Contato | `#contato` | Formulário que abre o WhatsApp |

## Estrutura de pastas

```
ingrid-market/
├── index.html           conteúdo e SEO (title, Open Graph, JSON-LD)
├── style.css            identidade visual, layout e responsivo
├── main.js              olho em WebGL, animações, vídeos e formulário
├── favicon.svg
├── apple-touch-icon.png
└── assets/
    ├── img/             fotos da Ingrid (WebP + JPG), og.jpg
    │   └── posters/     primeiro quadro de cada vídeo (WebP)
    └── videos/          portfólio: .mp4 (H.264) + .webm (VP9) de reserva
```

## Como rodar localmente

Não há dependências para instalar. Basta um servidor estático:

```bash
npx serve@14.2.4 -l 5173
```

Depois abra `http://localhost:5173`.

> **Atenção:** não abra o `index.html` direto do disco (`file://`). Os vídeos e o WebGL precisam de um servidor.

## Publicação

O site é publicado no **GitHub Pages** e atualiza sozinho a cada push na branch `main`.

Por ser estático, também funciona em Vercel, Netlify, Hostinger ou qualquer hospedagem de arquivos: basta apontar para a raiz do repositório.

Se mudar de domínio, atualize `og:url` e `og:image` no `index.html` com o novo endereço, para a prévia aparecer certinho no WhatsApp e no Instagram.

## Como editar

### WhatsApp, mensagem e formulário

No topo do `main.js`, no objeto `CONFIG`:

| Campo | O que faz |
| --- | --- |
| `whatsapp` | Número com DDI e DDD, só dígitos (ex.: `5548996966456`) |
| `waMessage` | Mensagem pré-preenchida dos botões |
| `formEndpoint` | Opcional. URL que recebe os dados do formulário em JSON (Formspree, Make, Zapier, Google Apps Script…). Vazio = só abre o WhatsApp com a mensagem montada |

Os links no HTML já apontam para o número, para funcionar mesmo sem JavaScript. O `main.js` reescreve todos os elementos `[data-wa]` a partir do `CONFIG`.

### Textos

Todos estão no `index.html`, organizados por seção e marcados com comentários `<!-- ===== -->`.

### Cores e fontes

Variáveis no topo do `style.css` (`:root`):

| Variável | Cor | Uso |
| --- | --- | --- |
| `--bg` | `#070b16` | Fundo |
| `--primary` | `#4f6bff` | Botões e destaques |
| `--accent` | `#e9c9a9` | Detalhes, foco e links |
| `--rose` | `#f2b8c6` | Toques de cor |

### Vídeos do portfólio

1. Exporte em vertical, 720×1280. Para converter um `.MOV` do iPhone:

   ```bash
   # MP4 (H.264) — formato principal
   ffmpeg -i entrada.MOV -vf "scale=720:1280,fps=30,format=yuv420p" -c:v libx264 -preset slow -crf 27 -movflags +faststart -c:a aac -b:a 96k assets/videos/nome.mp4

   # WebM (VP9) — reserva
   ffmpeg -i assets/videos/nome.mp4 -c:v libvpx-vp9 -b:v 0 -crf 45 -c:a libopus -b:a 64k assets/videos/nome.webm

   # Poster (primeiro quadro exibido antes do play)
   ffmpeg -ss 2 -i assets/videos/nome.mp4 -frames:v 1 -c:v libwebp -quality 72 assets/img/posters/nome.webp
   ```

   Vídeos em HDR (iPhone) precisam de *tone mapping*. Veja o filtro `zscale…tonemap` usado no vídeo do Omoda 7.

2. No `index.html`, copie um bloco `<li class="reel">` e troque os caminhos, o título, o cliente e o `data-reel` (índice sequencial, começando em `0`).

Os arquivos originais (`.MOV`, `.HEIC`) estão no `.gitignore`: exporte para `assets/` antes de versionar.

### Depoimentos

Em `main.js`, preencha a lista `TESTIMONIALS` com depoimentos **reais**. Enquanto ela estiver vazia, a seção fica oculta.

### O olho do hero

O olho é um shader WebGL (`EYE_FRAG` no `main.js`). Os principais pontos de ajuste:

| O que mudar | Onde |
| --- | --- |
| Cores da íris | `cDark`, `cBrown`, `cAmber` e `cGold`, dentro de `iris()` |
| Tom da pele | Primeira linha `vec3 skin=...`, em `shade()` |
| Posição e tamanho | Método `layout()` da classe `Eye` |
| Ritmo do mergulho | Função `heroScroll()`. O zoom usa o tamanho da íris na tela (`zoomFor`), então funciona igual no celular e no desktop |
| Duração do mergulho | `.hero { height: 300svh }` no `style.css` (`220svh` no celular) |
| Palavra que se alterna no título | `.cycle` no `index.html` e `heroCycle()` no `main.js` |

<details>
<summary><strong>Todos os detalhes do olho</strong></summary>

- **Íris castanha fotorrealista** (`iris()`): fibras, filamentos dourados, colarete em zigue-zague, criptas, sulcos de contração, anel limbal e pupila de borda nítida. Os detalhes se multiplicam conforme a câmera se aproxima (nível de detalhe contínuo).
- **Olhar feminino e delicado:** formato amendoado com o canto externo erguido, cílios longos e curvados com efeito de rímel, sobrancelha fina e arqueada fio a fio, sombra rosé-dourada e iluminador no osso da sobrancelha.
- **Delineado:** nasce quase invisível no canto interno, engrossa no terço externo e termina num gatinho afilado, com acabamento acetinado e esfumado marrom suave.
- **Olho completo** (`shade()`): pele com relevo 3D e subsurface; cílios em tufos (3 camadas em cima, 2 embaixo) com sombra projetada; esclera com veias finas e carúncula; linha d'água úmida; cáustica de luz na íris e o reflexo de uma janela na córnea.
- **Câmera:** o olho abre desfocado e a lente "puxa o foco", com um quadrado de autofoco na pupila. Clicar ou tocar no olho dispara o autofoco ali.
- **Lente macro** (pós-processamento): o foco fica no olho e a pele ao redor desfoca com a distância.
- **Vivo:** pisca de forma natural, faz microssacadas, segue o mouse (no celular, olha em volta sozinho) e a pupila dilata quando o mouse passa nos botões.
- **Desfoque de movimento** acompanha a velocidade da rolagem: quando a pessoa para, a íris fica nítida.

**Roteiro do mergulho** (`.hero__story` e `.viewfinder` no `index.html`):

1. Nos olhos: *"Antes de qualquer câmera, existe um olhar."*
2. Na íris, onde a câmera desacelera: *"É nos detalhes que o público para."*
3. Dentro da pupila, que vira o visor de uma câmera gravando: *"Do meu olhar para o seu feed."*

</details>

## Desempenho

- **Vídeos sob demanda:** carregam só quando aparecem na tela (`preload="none"`), no máximo 2 tocam ao mesmo tempo e sempre sem som.
- **Economia de dados:** com o modo "economia de dados" do celular ativo, os vídeos não tocam sozinhos.
- **Canvas adaptativo:** o WebGL limita a densidade de pixels, reduz a resolução sozinho se o aparelho não acompanhar e pausa quando sai da tela ou a aba fica oculta.
- **Imagens responsivas** em WebP, com JPG de reserva.
- **Plano B:** sem WebGL, entra um olho feito em CSS (`.fb-eye`) com o mesmo mergulho.

## Acessibilidade

- HTML semântico, com landmarks e títulos em ordem.
- Link "Pular para o conteúdo" e foco sempre visível.
- Menu e player navegáveis por teclado: `Esc` fecha e as setas `←` `→` trocam o vídeo.
- Formulário com mensagens de erro ligadas a cada campo (`aria-describedby`).
- Contraste AA.
- Com `prefers-reduced-motion`, o hero fica estático, sem zoom e sem rolagem suave.
- Testado em 375 px (celular), 961 px e 1440 px, sem rolagem horizontal e sem erros no console.

## SEO e compartilhamento

- `title` e `meta description` focados nos serviços e na região.
- **Open Graph** e **Twitter Card** com imagem de 1200×630 (`assets/img/og.jpg`) para a prévia no WhatsApp, Instagram e redes sociais.
- **Dados estruturados** (JSON-LD, schema.org): `Person` e `ProfessionalService`, com redes sociais, telefone e área atendida.

## Pendências

- [ ] **[CONFIRMAR]** Autorização para citar **Cloud Tech**, **Dimas Omoda Jaecoo** e **Dra. Elizabeth Mello** (faixa de marcas e legendas do portfólio).
- [ ] **[CONFIRMAR]** Nome do cliente do vídeo de gastronomia (*Mesa posta · bastidores*). Hoje a legenda diz "Chef em evento".
- [ ] **[CONFIRMAR]** Cidade e região de atendimento presencial. Hoje o texto diz "Santa Catarina" (Sobre e FAQ).
- [ ] **[CONFIRMAR]** Respostas do FAQ (prazo, tráfego pago, preço) no tom da Ingrid.
- [ ] **[PREENCHER]** Depoimentos reais em `TESTIMONIALS`.
- [ ] **[OPCIONAL]** `formEndpoint` para guardar os leads também numa planilha ou CRM.

## Autor e licença

Desenvolvido por **[carlosserra-a11y](https://github.com/carlosserra-a11y)**.

Este repositório não tem licença de código aberto: o código não pode ser reutilizado sem autorização. As fotos e os vídeos pertencem à Ingrid Lima e aos clientes citados.
