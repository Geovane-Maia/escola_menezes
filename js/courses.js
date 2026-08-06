const courseData = {
  infantil: {
    icon: '✿',
    title: 'Educação Infantil',
    subtitle: 'Educação Infantil — Desenvolvimento e descobertas',
    about: 'Na Educação Infantil, o Colégio Menezes e Sousa cria experiências de aprendizagem com afeto, brincadeiras e estímulos adequados a cada fase.',
    differences: ['Aprendizagem por meio de brincadeiras', 'Desenvolvimento da autonomia', 'Rotina acolhedora e segura', 'Parceria próxima com as famílias'],
    areas: ['Linguagem', 'Corpo e movimento', 'Traços, sons, cores e formas', 'Natureza e sociedade', 'Matemática inicial'],
    ctaTitle: 'Primeiros passos',
    ctaText: 'Um ambiente preparado para a criança aprender, conviver e se desenvolver.'
  },
  fundamental: {
    icon: '✦',
    title: 'Ensino Fundamental',
    subtitle: 'Ensino Regular — Aprendizagem e autonomia',
    about: 'O Ensino Fundamental fortalece os conhecimentos essenciais e ajuda cada aluno a construir autonomia, pensamento crítico e gosto por aprender.',
    differences: ['Base sólida em leitura e escrita', 'Raciocínio lógico e resolução de problemas', 'Projetos interdisciplinares', 'Acompanhamento do desenvolvimento'],
    areas: ['Linguagens', 'Matemática', 'Ciências Humanas', 'Ciências da Natureza', 'Redação'],
    ctaTitle: 'Aprendizagem sólida',
    ctaText: 'Conheça uma proposta que combina conhecimento, acompanhamento e desenvolvimento integral.'
  },
  medio: {
    icon: '✹',
    title: 'Ensino Médio',
    subtitle: 'Ensino Regular — Preparação para o vestibular e a vida',
    about: 'O Ensino Médio do Menezes e Sousa prepara os alunos para os principais vestibulares do país, com foco no ENEM, sem abrir mão da formação crítica e cidadã.',
    differences: ['Sistema de revisão e simulados', 'Orientação vocacional e profissional', 'Projetos interdisciplinares', 'Preparação para o mercado de trabalho'],
    areas: ['Linguagens', 'Matemática', 'Ciências Humanas', 'Ciências da Natureza', 'Redação', 'Eletivas'],
    ctaTitle: 'Formação Completa',
    ctaText: 'Converse com nossa equipe e conheça as possibilidades para sua família.'
  }
};

const courseDetail = document.querySelector('#curso-detalhe');
const courseCards = document.querySelector('#ensino .segments-grid');
const courseHeading = document.querySelector('#ensino .section-heading');
const courseBack = document.querySelector('#course-back');

function renderCourse(courseKey) {
  const course = courseData[courseKey];
  if (!course) return;

  document.querySelector('#course-detail-icon').textContent = course.icon;
  document.querySelector('#course-detail-title').textContent = course.title;
  document.querySelector('#course-detail-subtitle').textContent = course.subtitle;
  document.querySelector('#course-detail-about').textContent = course.about;
  document.querySelector('#course-detail-cta-title').textContent = course.ctaTitle;
  document.querySelector('#course-detail-cta-text').textContent = course.ctaText;
  document.querySelector('#course-detail-differences').innerHTML = course.differences.map((item) => `<li>${item}</li>`).join('');
  document.querySelector('#course-detail-areas').innerHTML = course.areas.map((item) => `<span>${item}</span>`).join('');
}

document.querySelectorAll('.course-more').forEach((link) => {
  link.addEventListener('click', (event) => {
    event.preventDefault();
    renderCourse(link.dataset.course);
    courseHeading.hidden = true;
    courseCards.hidden = true;
    courseDetail.hidden = false;
    history.replaceState(null, '', '#curso-detalhe');
    courseDetail.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });
});

courseBack.addEventListener('click', () => {
  courseDetail.hidden = true;
  courseHeading.hidden = false;
  courseCards.hidden = false;
  history.replaceState(null, '', '#ensino');
  document.querySelector('#ensino').scrollIntoView({ behavior: 'smooth', block: 'start' });
});
