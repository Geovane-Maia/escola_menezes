let testimonials = [
  { name: 'Avaliações públicas', relation: 'Pais, alunos e responsáveis', text: 'A escola é destacada pelo acolhimento, pelo convívio entre alunos e professores e pelo desenvolvimento socioemocional.' },
  { name: 'Avaliações públicas', relation: 'Comunidade escolar', text: 'A estrutura física e os espaços de aprendizagem aparecem entre os pontos positivos apontados pela comunidade.' },
  { name: 'Avaliações públicas', relation: 'Pais e responsáveis', text: 'A proposta valoriza o acompanhamento dos estudantes e a parceria entre escola e família.' },
];

let questions = [
  ['Quais segmentos de ensino são oferecidos?', 'Atendemos da Educação Infantil ao Ensino Médio, com proposta pedagógica específica para cada etapa e acompanhamento contínuo do desenvolvimento do aluno.'],
  ['Como funciona o processo de matrícula?', 'O primeiro passo é agendar uma visita. Após conhecer a escola, a família preenche a ficha de matrícula, entrega a documentação e assina o contrato. Toda a orientação é feita pela nossa secretaria.'],
  ['A escola oferece atividades extracurriculares?', 'Sim. Temos atividades esportivas, culturais e projetos pedagógicos ao longo do ano, como esportes coletivos, música, teatro, feira de ciências e olimpíadas do conhecimento.'],
  ['Qual é a metodologia de ensino?', 'A escola utiliza uma abordagem sociointeracionista, que valoriza a aprendizagem nas relações, na participação e na construção de autonomia.'],
  ['Quais espaços a escola oferece?', 'Entre os espaços divulgados estão biblioteca, parque infantil, quadra coberta, salas de aula climatizadas, laboratório de ciências, laboratório de informática e sala de leitura.'],
  ['A escola oferece bolsas ou descontos?', 'As condições podem variar. Entre em contato com a secretaria para consultar disponibilidade, critérios e valores atualizados para a etapa desejada.'],
  ['Como posso agendar uma visita?', 'Você pode preencher o formulário desta página, ligar para a secretaria ou falar conosco pelo WhatsApp. Retornamos o contato para combinar o melhor dia e horário.'],
  ['Quais documentos são necessários para a matrícula?', 'Certidão de nascimento do aluno, documento de identidade e CPF dos responsáveis, comprovante de residência, histórico escolar ou declaração de transferência, carteira de vacinação e foto recente.'],
];

const $ = (selector, parent = document) => parent.querySelector(selector);
const $$ = (selector, parent = document) => [...parent.querySelectorAll(selector)];

const header = $('#site-header');
window.addEventListener('scroll', () => header.classList.toggle('scrolled', window.scrollY > 12), { passive: true });

const menuButton = $('.menu-toggle');
const mobileMenu = $('#mobile-menu');
menuButton.addEventListener('click', () => {
  const open = mobileMenu.classList.toggle('open');
  menuButton.setAttribute('aria-expanded', String(open));
  menuButton.setAttribute('aria-label', open ? 'Fechar menu' : 'Abrir menu');
});
$$('#mobile-menu a').forEach((link) => link.addEventListener('click', () => {
  mobileMenu.classList.remove('open');
  menuButton.setAttribute('aria-expanded', 'false');
}));

const revealObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('visible');
      observer.unobserve(entry.target);
    }
  });
}, { threshold: 0.12 });
$$('.reveal').forEach((element) => revealObserver.observe(element));

const numberObserver = new IntersectionObserver((entries, observer) => {
  entries.forEach((entry) => {
    if (!entry.isIntersecting) return;
    const element = $('strong', entry.target);
    const target = Number(element.dataset.count);
    const suffix = element.dataset.suffix || '';
    const start = performance.now();
    const duration = 1500;
    const tick = (now) => {
      const progress = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      element.textContent = `${Math.round(target * eased)}${suffix}`;
      if (progress < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
    observer.unobserve(entry.target);
  });
}, { threshold: 0.4 });
$$('.number-item').filter((item) => item.querySelector('[data-count]')).forEach((item) => numberObserver.observe(item));

const track = $('#testimonial-track');
const dots = $('#slider-dots');
let testimonialIndex = 0;

// Renderiza a lista de depoimentos (usada também quando o admin edita via content.json)
function renderTestimonials(list) {
  testimonials = list;
  testimonialIndex = 0;
  track.innerHTML = '';
  dots.innerHTML = '';
  testimonials.forEach((testimonial, index) => {
    const article = document.createElement('article');
    article.className = 'testimonial';
    article.innerHTML = `<div class="testimonial-quote">“</div><p>“${testimonial.text}”</p><div class="testimonial-author"><span class="avatar">✓</span><div><strong>${testimonial.name}</strong><small>${testimonial.relation}</small></div><span class="stars" aria-label="Avaliações públicas positivas">★★★★☆</span></div><a class="testimonial-source" href="https://www.melhorescola.com.br/escola/menezes-e-sousa-colegio/avaliacoes" target="_blank" rel="noopener">Ver avaliações públicas</a>`;
    track.appendChild(article);
    const dot = document.createElement('button');
    dot.type = 'button';
    dot.setAttribute('aria-label', `Ir para o depoimento ${index + 1}`);
    dot.addEventListener('click', () => showTestimonial(index));
    dots.appendChild(dot);
  });
  showTestimonial(0);
}

function showTestimonial(index) {
  testimonialIndex = (index + testimonials.length) % testimonials.length;
  track.style.transform = `translateX(-${testimonialIndex * 100}%)`;
  $$('#slider-dots button').forEach((dot, dotIndex) => dot.classList.toggle('active', dotIndex === testimonialIndex));
}

renderTestimonials(testimonials);
$('#previous-testimonial').addEventListener('click', () => showTestimonial(testimonialIndex - 1));
$('#next-testimonial').addEventListener('click', () => showTestimonial(testimonialIndex + 1));

const faqList = $('#faq-list');

// Renderiza a lista de perguntas (usada também quando o admin edita via content.json)
function renderFaq(list) {
  questions = list;
  faqList.innerHTML = '';
  questions.forEach(([question, answer]) => {
    const item = document.createElement('article');
    item.className = 'faq-item';
    item.innerHTML = `<button class="faq-question" type="button" aria-expanded="false"><span>${question}</span><span aria-hidden="true">+</span></button><div class="faq-answer"><div><p>${answer}</p></div></div>`;
    const button = $('.faq-question', item);
    button.addEventListener('click', () => {
      const open = item.classList.toggle('open');
      button.setAttribute('aria-expanded', String(open));
    });
    faqList.appendChild(item);
  });
}

renderFaq(questions);

$('#contact-form').addEventListener('submit', (event) => {
  event.preventDefault();
  const form = event.currentTarget;
  const values = Object.fromEntries(new FormData(form).entries());
  const message = [
    'Olá! Gostaria de falar com o Colégio Menezes e Sousa.',
    `Nome: ${values.nome}`,
    `Telefone: ${values.telefone}`,
    `E-mail: ${values.email}`,
    `Assunto: ${values.assunto}`,
    `Mensagem: ${values.mensagem}`
  ].join('\n');
  const whatsappUrl = `https://wa.me/558532690070?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, '_blank', 'noopener,noreferrer');
  $('#form-feedback').textContent = 'O WhatsApp foi aberto com a sua mensagem pronta para envio.';
});

$('#current-year').textContent = new Date().getFullYear();

const academicFilters = $$('.academic-filter');
const academicSeries = $$('.area-series');
academicFilters.forEach((button) => {
  button.addEventListener('click', () => {
    const filter = button.dataset.filter;
    academicFilters.forEach((filterButton) => filterButton.classList.toggle('is-active', filterButton === button));
    academicSeries.forEach((series) => {
      series.classList.toggle('is-muted', filter !== 'all' && !series.classList.contains(`series-${filter}`));
    });
  });
});

const lightbox = $('#lightbox');
const lightboxImage = $('#lightbox-image');
const lightboxCaption = $('#lightbox-caption');
const lightboxClose = $('#lightbox-close');
let lastGalleryTrigger = null;

function openLightbox(figure) {
  const image = $('img', figure);
  const caption = $('figcaption', figure);
  lastGalleryTrigger = figure;
  lightboxImage.src = image.src;
  lightboxImage.alt = image.alt;
  lightboxCaption.textContent = caption.textContent;
  lightbox.hidden = false;
  document.body.classList.add('lightbox-open');
  lightboxClose.focus();
}

function closeLightbox() {
  lightbox.hidden = true;
  document.body.classList.remove('lightbox-open');
  if (lastGalleryTrigger) lastGalleryTrigger.focus();
}

function attachGalleryLightbox(container) {
  if (!container) return;
  $$('figure', container).forEach((figure) => {
    figure.tabIndex = 0;
    figure.setAttribute('role', 'button');
    figure.setAttribute('aria-label', `Ampliar imagem: ${($('figcaption', figure)?.textContent || '').trim()}`);
    figure.addEventListener('click', () => openLightbox(figure));
    figure.addEventListener('keydown', (event) => {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        openLightbox(figure);
      }
    });
  });
}
attachGalleryLightbox($('#estrutura .gallery-grid'));

lightboxClose.addEventListener('click', closeLightbox);
lightbox.addEventListener('click', (event) => {
  if (event.target === lightbox) closeLightbox();
});
document.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && !lightbox.hidden) closeLightbox();
});

// Expostos para o conteúdo dinâmico (js/content.js) re-renderizar após edições
window.renderTestimonials = renderTestimonials;
window.renderFaq = renderFaq;
window.attachGalleryLightbox = attachGalleryLightbox;
