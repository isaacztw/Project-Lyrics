// main.js - Interacoes da interface principal (versao sem React)
// Arquivo unificado do front-end: home, letras, busca, perfil e visualização de artista.

// Referencias dos elementos principais da interface.
const searchInput = document.getElementById('searchInput');
const menuItems = document.querySelectorAll('.menu-item');
const cardsCarouselTrack = document.querySelector('.cards-track');
const cardsPrevBtn = document.getElementById('cardsPrevBtn');
const cardsNextBtn = document.getElementById('cardsNextBtn');
const albumsCarouselTrack = document.querySelector('.albums-track');
const albumPrevBtn = document.getElementById('albumPrevBtn');
const albumNextBtn = document.getElementById('albumNextBtn');
const menuToggleBtn = document.getElementById('menuToggleBtn');
const floatingMenuOverlay = document.getElementById('floatingMenuOverlay');
const floatingMenuDrawer = document.getElementById('floatingMenuDrawer');
const floatingMenuClose = document.getElementById('floatingMenuClose');

const openProfileBtn = document.getElementById('openProfileBtn');
const profileQuickMenu = document.getElementById('profileQuickMenu');
const openProfileMenuItem = document.getElementById('openProfileMenuItem');
const logoutItem = document.getElementById('logoutItem');
const closeProfileBtn = document.getElementById('closeProfileBtn');
const closeProfileOverlay = document.getElementById('closeProfileOverlay');
const profileModal = document.getElementById('profileModal');
const loginModal = document.getElementById('loginModal');
const closeLoginBtn = document.getElementById('closeLoginBtn');
const closeLoginOverlay = document.getElementById('closeLoginOverlay');
const loginForm = document.getElementById('loginForm');
const signupModal = document.getElementById('signupModal');
const closeSignupBtn = document.getElementById('closeSignupBtn');
const closeSignupOverlay = document.getElementById('closeSignupOverlay');
const signupForm = document.getElementById('signupForm');
const signupFeedback = document.getElementById('signupFeedback');
const goToSignupBtn = document.getElementById('goToSignupBtn');
const goToLoginBtn = document.getElementById('goToLoginBtn');

const loginModalTitle = document.getElementById('loginModalTitle');
const loginEmail = document.getElementById('loginEmail');
const loginPassword = document.getElementById('loginPassword');
const loginFeedback = document.getElementById('loginFeedback');
const globalStatusBanner = document.getElementById('globalStatusBanner');
const globalStatusMessage = document.getElementById('globalStatusMessage');
const globalStatusClose = document.getElementById('globalStatusClose');

const profileDisplayName = document.getElementById('profileDisplayName');
const profileDisplayEmail = document.getElementById('profileDisplayEmail');
const profileFullNameValue = document.getElementById('profileFullNameValue');
const profileEmailValue = document.getElementById('profileEmailValue');
const profilePlanValue = document.getElementById('profilePlanValue');

const floatingRecommendationsBtn = document.getElementById('floatingRecommendationsBtn');
const floatingRecommendationsTab = document.getElementById('floatingRecommendationsTab');
const floatingTabClose = document.getElementById('floatingTabClose');
const floatingTabDragHandle = document.getElementById('floatingTabDragHandle');

let isDragging = false;
let dragPointerId = null;
let dragOffsetX = 0;
let dragOffsetY = 0;
let carouselIsDragging = false;
let carouselPointerId = null;
let carouselStartX = 0;
let carouselStartScrollLeft = 0;
let carouselAutoplayId = null;

const CAROUSEL_AUTOPLAY_DELAY = 4500;
const DEFAULT_API_BASE_URL = 'http://localhost:3333';
const API_BASE_URL_STORAGE_KEY = 'lyricsApiBaseUrl';
let API_BASE_URL = (window.localStorage.getItem(API_BASE_URL_STORAGE_KEY) || DEFAULT_API_BASE_URL).replace(/\/$/, '');
const STORAGE_ACCESS_TOKEN_KEY = 'lyrics.accessToken';
const STORAGE_REFRESH_TOKEN_KEY = 'lyrics.refreshToken';

let authToken = window.localStorage.getItem(STORAGE_ACCESS_TOKEN_KEY) || '';
let isUserLoggedIn = Boolean(authToken);

// Bloqueia a rolagem da pagina quando algum modal estiver aberto.
function updateBodyScrollLock() {
  const hasOpenModal = document.querySelector('.modal.active');
  document.body.style.overflow = hasOpenModal ? 'hidden' : 'auto';
}

// Exibe mensagens de erro ou sucesso no formulario de login.
function setLoginFeedback(message, isSuccess = false) {
  if (!loginFeedback) {
    return;
  }

  loginFeedback.textContent = message || '';
  loginFeedback.classList.toggle('success', Boolean(isSuccess));
}

// Exibe um aviso global no topo para erros de conexao com a API.
function setGlobalStatusFeedback(message = '') {
  if (!globalStatusBanner || !globalStatusMessage) {
    return;
  }

  const hasMessage = Boolean(message);
  globalStatusMessage.textContent = message;
  globalStatusBanner.classList.toggle('active', hasMessage);
  globalStatusBanner.setAttribute('aria-hidden', String(!hasMessage));
}

// Normaliza e atualiza a URL base da API usada pelo frontend.
function updateApiBaseUrl(nextBaseUrl, { persist = true } = {}) {
  const normalized = String(nextBaseUrl || '').trim().replace(/\/$/, '');

  if (!normalized) {
    return;
  }

  API_BASE_URL = normalized;

  if (persist) {
    window.localStorage.setItem(API_BASE_URL_STORAGE_KEY, normalized);
  }
}

// Tenta recuperar conexao quando a URL salva da API estiver incorreta.
async function ensureApiConnectivity() {
  const currentHealthUrl = `${API_BASE_URL}/health`;

  try {
    const response = await fetch(currentHealthUrl, { method: 'GET' });
    if (response.ok) {
      return;
    }
  } catch (_error) {
    // Ignora e tenta fallback padrao abaixo.
  }

  if (API_BASE_URL === DEFAULT_API_BASE_URL) {
    return;
  }

  const fallbackHealthUrl = `${DEFAULT_API_BASE_URL}/health`;

  try {
    const fallbackResponse = await fetch(fallbackHealthUrl, { method: 'GET' });

    if (!fallbackResponse.ok) {
      return;
    }

    const previousBaseUrl = API_BASE_URL;
    updateApiBaseUrl(DEFAULT_API_BASE_URL);
    setGlobalStatusFeedback(`A URL da API estava incorreta (${previousBaseUrl}) e foi ajustada para ${DEFAULT_API_BASE_URL}.`);
  } catch (_error) {
    // Se tambem falhar no localhost, o fluxo normal exibira erro de conexao.
  }
}

// Salva ou limpa os tokens recebidos da API.
function setAuthSession(session) {
  authToken = session?.accessToken || '';
  isUserLoggedIn = Boolean(authToken);

  if (authToken) {
    window.localStorage.setItem(STORAGE_ACCESS_TOKEN_KEY, authToken);
  } else {
    window.localStorage.removeItem(STORAGE_ACCESS_TOKEN_KEY);
  }

  if (session?.refreshToken) {
    window.localStorage.setItem(STORAGE_REFRESH_TOKEN_KEY, session.refreshToken);
  } else {
    window.localStorage.removeItem(STORAGE_REFRESH_TOKEN_KEY);
  }

  updateAuthUI();
}

// Atualiza a visibilidade de elementos com base no login.
function updateAuthUI() {
  if (logoutItem) {
    logoutItem.style.display = isUserLoggedIn ? 'block' : 'none';
  }
}

// Remove a sessao atual do navegador.
function resetAuthSession() {
  setAuthSession(null);
  applyProfileData(null);
}

// Preenche os campos visuais do perfil com os dados recebidos da API.
function applyProfileData(profile) {
  const fullName = profile?.full_name?.trim() || 'UsuÃ¡rio';
  const email = profile?.email?.trim() || 'email@exemplo.com';
  const plan = profile?.plan?.trim() || 'Free';
  const favoriteGenre = profile?.favorite_genre?.trim() || 'NÃ£o informado';
  const phone = profile?.phone?.trim() || '(11) 98765-4321';
  const profileImage = profile?.profile_image || '';

  if (profileDisplayName) profileDisplayName.textContent = fullName;
  if (profileDisplayEmail) profileDisplayEmail.textContent = email;
  if (profileFullNameValue) profileFullNameValue.textContent = fullName;
  if (profileEmailValue) profileEmailValue.textContent = email;
  if (document.getElementById('profilePhoneValue')) document.getElementById('profilePhoneValue').textContent = phone;
  if (profilePlanValue) profilePlanValue.textContent = plan;

  // Preencher os inputs de ediÃ§Ã£o
  const editName = document.getElementById('editFullNameInput');
  const editEmail = document.getElementById('editEmailInput');
  const editPhone = document.getElementById('editPhoneInput');
  if (editName) editName.value = fullName;
  if (editEmail) editEmail.value = email;
  if (editPhone) editPhone.value = phone;

  // Atualizar foto geral
  const displayElement = document.getElementById('profileImageDisplay');
  const navbarAvatars = document.querySelectorAll('.user-avatar');

  if (profileImage) {
    if (displayElement) {
      displayElement.innerHTML = `<img src="${profileImage}" class="profile-img" alt="Foto de Perfil">`;
      displayElement.classList.add('has-image');
    }
    navbarAvatars.forEach(img => {
      img.src = profileImage;
    });
  } else {
    if (displayElement) {
      displayElement.innerHTML = 'ðŸ‘¤';
      displayElement.classList.remove('has-image');
    }
    navbarAvatars.forEach(img => {
      img.src = 'img/avatar-profile.svg';
    });
  }
}

// Centraliza as chamadas HTTP do front para o backend.
async function apiRequest(path, options = {}) {
  const { method = 'GET', body, requiresAuth = false } = options;

  if (requiresAuth && !authToken) {
    throw new Error('SessÃ£o expirada. FaÃ§a login novamente.');
  }

  const headers = {
    'Content-Type': 'application/json'
  };

  if (authToken) {
    headers.Authorization = `Bearer ${authToken}`;
  }

  const requestUrl = `${API_BASE_URL}${path}`;
  let response;

  try {
    response = await fetch(requestUrl, {
      method,
      headers,
      body: body ? JSON.stringify(body) : undefined
    });
    setGlobalStatusFeedback('');
  } catch (_networkError) {
    const networkMessage = `Falha ao conectar com o servidor em ${path} (${requestUrl}). Verifique se o backend esta rodando e se a URL da API esta correta.`;
    setGlobalStatusFeedback(networkMessage);
    const requestError = new Error(networkMessage);
    requestError.code = 'NETWORK_ERROR';
    requestError.path = path;
    throw requestError;
  }

  if (response.status === 204) {
    return null;
  }

  let payload = null;
  const contentType = response.headers.get('Content-Type') || '';

  if (contentType.includes('application/json')) {
    try {
      payload = await response.json();
    } catch (_error) {
      payload = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401) {
      resetAuthSession();
    }

    const fallbackMessage = `Erro ${response.status} em ${path}.`;
    const requestError = new Error(payload?.message || fallbackMessage);
    requestError.status = response.status;
    requestError.path = path;
    throw requestError;
  }

  return payload;
}

// Busca o perfil autenticado e atualiza o modal de perfil.
async function loadProfileData() {
  const payload = await apiRequest('/profile/me', { requiresAuth: true });
  applyProfileData(payload?.profile || null);
}

// Mantem o item ativo sincronizado nos menus da interface.
function syncMenuSelection(activeText) {
  document.querySelectorAll('.menu-item').forEach((item) => {
    const isActive = item.textContent.trim() === activeText;
    item.classList.toggle('active', isActive);
  });
}

// Atualiza os atributos ARIA do menu lateral flutuante.
function setFloatingMenuExpanded(expanded) {
  menuToggleBtn?.setAttribute('aria-expanded', String(expanded));
  floatingMenuDrawer?.setAttribute('aria-hidden', String(!expanded));
  floatingMenuOverlay?.setAttribute('aria-hidden', String(!expanded));
}

// Abre o menu lateral acionado pelo botao da navbar.
function openFloatingMenu() {
  floatingMenuDrawer?.classList.add('active');
  floatingMenuOverlay?.classList.add('active');
  setFloatingMenuExpanded(true);
}

// Fecha o menu lateral flutuante.
function closeFloatingMenu() {
  floatingMenuDrawer?.classList.remove('active');
  floatingMenuOverlay?.classList.remove('active');
  setFloatingMenuExpanded(false);
}

// Alterna entre abrir e fechar o menu lateral.
function toggleFloatingMenu() {
  const isOpen = floatingMenuDrawer?.classList.contains('active');
  if (isOpen) {
    closeFloatingMenu();
  } else {
    openFloatingMenu();
  }
}

// Atualiza os atributos ARIA da aba de recomendacoes.
function setFloatingExpanded(expanded) {
  floatingRecommendationsBtn?.setAttribute('aria-expanded', String(expanded));
  floatingRecommendationsTab?.setAttribute('aria-hidden', String(!expanded));
}

// Exibe a aba flutuante de recomendacoes.
function openFloatingTab() {
  floatingRecommendationsTab?.classList.add('active');
  setFloatingExpanded(true);
}


// Fecha a aba flutuante de recomendacoes.
function closeFloatingTab() {
  floatingRecommendationsTab?.classList.remove('active');
  setFloatingExpanded(false);
}


// Alterna a visibilidade da aba de recomendacoes.
function toggleFloatingTab() {
  const isOpen = floatingRecommendationsTab?.classList.contains('active');
  if (isOpen) {
    closeFloatingTab();
  } else {
    openFloatingTab();
  }
}


// Abre o modal principal de perfil.
function openProfileModal() {
  closeProfileQuickMenu();
  profileModal?.classList.add('active');
  updateBodyScrollLock();
}


// Fecha o modal principal de perfil.
function closeProfileModal() {
  profileModal?.classList.remove('active');
  updateBodyScrollLock();
}


// Alterna o modal para a tela de login (usado ao vir do cadastro).
function showLoginView() {
  closeSignupModal();
  closeResetModal();
  setLoginFeedback('');
  loginModal?.classList.add('active');
  loginModal?.setAttribute('aria-hidden', 'false');
  updateBodyScrollLock();
  loginEmail?.focus();
}

// Abre o pop-up de cadastro.
function openSignupModal() {
  closeLoginModal();
  if (!signupModal) return;
  signupModal.setAttribute('aria-hidden', 'false');
  signupModal.classList.add('active');
  setSignupFeedback('');
  document.getElementById('signupName')?.focus();
  updateBodyScrollLock();
}

// Fecha o pop-up de cadastro.
function closeSignupModal() {
  if (!signupModal) return;
  signupModal.setAttribute('aria-hidden', 'true');
  signupModal.classList.remove('active');
  updateBodyScrollLock();
}

// Alterna o modal para a tela de cadastro.
function showSignupView() {
  openSignupModal();
}

// Define mensagem de feedback no formulÃ¡rio de cadastro.
function setSignupFeedback(message, isSuccess = false) {
  if (!signupFeedback) return;
  signupFeedback.textContent = message || '';
  signupFeedback.classList.toggle('success', Boolean(isSuccess));
}



// Controla texto e estado de loading de botoes de submit de autenticacao.
function setSubmitButtonState(button, options = {}) {
  if (!button) {
    return;
  }

  const { isLoading = false, loadingText = 'Enviando...' } = options;

  if (!button.dataset.defaultText) {
    button.dataset.defaultText = button.textContent.trim();
  }

  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : button.dataset.defaultText;
}



// Abre o modal de login e foca no campo de e-mail.
function openLoginModal() {
  closeProfileQuickMenu();
  closeSignupModal();
  setLoginFeedback('');
  loginModal?.classList.add('active');
  loginModal?.setAttribute('aria-hidden', 'false');
  updateBodyScrollLock();
  loginEmail?.focus();
}


// Fecha o modal de login e limpa a mensagem exibida.
function closeLoginModal() {
  loginModal?.classList.remove('active');
  loginModal?.setAttribute('aria-hidden', 'true');
  setLoginFeedback('');
  setSignupFeedback('');
  updateBodyScrollLock();
}

// Decide se abre o login ou o perfil, conforme o estado da sessao.
async function handleOpenProfileRequest() {
  if (!isUserLoggedIn) {
    openLoginModal();
    return;
  }

  // Abre o perfil imediatamente com dados placeholder.
  openProfileModal();

  // Tenta carregar dados reais da API em segundo plano.
  try {
    await loadProfileData();
  } catch (_error) {
    // Backend offline ou sessao expirada: mantÃ©m o modal aberto com dados padrÃ£o.
  }
}

// Atualiza os atributos ARIA do menu rapido do usuario.
function setProfileQuickMenuExpanded(expanded) {
  openProfileBtn?.setAttribute('aria-expanded', String(expanded));
  profileQuickMenu?.setAttribute('aria-hidden', String(!expanded));
}

// Exibe o menu rapido do usuario.
function openProfileQuickMenu() {
  profileQuickMenu?.classList.add('active');
  setProfileQuickMenuExpanded(true);
}

// Fecha o menu rapido do usuario.
function closeProfileQuickMenu() {
  profileQuickMenu?.classList.remove('active');
  setProfileQuickMenuExpanded(false);
}

// Alterna a exibicao do menu rapido do usuario.
function toggleProfileQuickMenu() {
  const isOpen = profileQuickMenu?.classList.contains('active');

  if (isOpen) {
    closeProfileQuickMenu();
    return;
  }

  openProfileQuickMenu();
}

// Calcula quanto o carrossel deve avancar a cada clique ou autoplay.
function getCarouselStep() {
  const firstCard = cardsCarouselTrack?.querySelector('.card');

  if (!firstCard) {
    return 0;
  }

  const cardWidth = firstCard.getBoundingClientRect().width;
  const trackStyles = window.getComputedStyle(cardsCarouselTrack);
  const gap = Number.parseFloat(trackStyles.columnGap || trackStyles.gap || '0');

  return cardWidth + gap;
}

// Habilita ou desabilita os botoes conforme a posicao do carrossel.
function updateCarouselButtons() {
  if (!cardsCarouselTrack || !cardsPrevBtn || !cardsNextBtn) {
    return;
  }

  const maxScrollLeft = cardsCarouselTrack.scrollWidth - cardsCarouselTrack.clientWidth;
  const current = Math.ceil(cardsCarouselTrack.scrollLeft);

  cardsPrevBtn.disabled = current <= 0;
  cardsNextBtn.disabled = current >= Math.floor(maxScrollLeft);
}

// Move o carrossel uma etapa para frente ou para tras.
function scrollCards(direction) {
  if (!cardsCarouselTrack) {
    return;
  }

  const step = getCarouselStep();

  if (!step) {
    return;
  }

  cardsCarouselTrack.scrollBy({
    left: direction * step,
    behavior: 'smooth',
  });
}

// Rola o carrossel ate uma posicao especifica.
function scrollCardsTo(targetLeft, behavior = 'smooth') {
  if (!cardsCarouselTrack) {
    return;
  }

  cardsCarouselTrack.scrollTo({
    left: targetLeft,
    behavior,
  });
}

// Retorna o limite maximo de rolagem horizontal do carrossel.
function getCarouselMaxScroll() {
  if (!cardsCarouselTrack) {
    return 0;
  }

  return Math.max(0, cardsCarouselTrack.scrollWidth - cardsCarouselTrack.clientWidth);
}

// Interrompe o autoplay do carrossel.
function stopCarouselAutoplay() {
  if (!carouselAutoplayId) {
    return;
  }

  window.clearInterval(carouselAutoplayId);
  carouselAutoplayId = null;
}

// Avanca automaticamente o carrossel e reinicia ao chegar no fim.
function autoplayCarousel() {
  if (!cardsCarouselTrack || carouselIsDragging || document.hidden) {
    return;
  }

  const step = getCarouselStep();

  if (!step) {
    return;
  }

  const maxScrollLeft = getCarouselMaxScroll();
  const current = Math.ceil(cardsCarouselTrack.scrollLeft);
  const isAtEnd = current >= Math.floor(maxScrollLeft) - 2;
  const nextLeft = isAtEnd ? 0 : Math.min(maxScrollLeft, current + step);

  scrollCardsTo(nextLeft);
}

// Inicia o autoplay do carrossel.
function startCarouselAutoplay() {
  if (!cardsCarouselTrack || carouselAutoplayId) {
    return;
  }

  carouselAutoplayId = window.setInterval(autoplayCarousel, CAROUSEL_AUTOPLAY_DELAY);
}

// Reinicia o autoplay depois de uma interacao do usuario.
function restartCarouselAutoplay() {
  stopCarouselAutoplay();
  startCarouselAutoplay();
}

// Mantem um valor entre um minimo e um maximo.
function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

// Finaliza o arraste manual do carrossel.
function finishCarouselDrag(event) {
  if (!cardsCarouselTrack || !carouselIsDragging || carouselPointerId !== event.pointerId) {
    return;
  }

  carouselIsDragging = false;
  carouselPointerId = null;
  cardsCarouselTrack.classList.remove('is-dragging');

  if (cardsCarouselTrack.hasPointerCapture(event.pointerId)) {
    cardsCarouselTrack.releasePointerCapture(event.pointerId);
  }

  restartCarouselAutoplay();
}

// Garante que a aba flutuante continue visivel dentro da tela.
function keepFloatingTabInViewport() {
  const left = parseFloat(floatingRecommendationsTab.style.left);
  const top = parseFloat(floatingRecommendationsTab.style.top);

  if (Number.isNaN(left) || Number.isNaN(top)) {
    return;
  }

  const margin = 8;
  const maxLeft = Math.max(margin, window.innerWidth - floatingRecommendationsTab.offsetWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - floatingRecommendationsTab.offsetHeight - margin);

  floatingRecommendationsTab.style.left = `${clamp(left, margin, maxLeft)}px`;
  floatingRecommendationsTab.style.top = `${clamp(top, margin, maxTop)}px`;
}

// Eventos da aba flutuante de recomendacoes.
floatingRecommendationsBtn?.addEventListener('click', toggleFloatingTab);
floatingTabClose?.addEventListener('click', closeFloatingTab);

// Eventos de navegacao do carrossel.
cardsNextBtn?.addEventListener('click', () => {
  cardsCarouselTrack.scrollBy({ left: 300, behavior: 'smooth' });
});

cardsPrevBtn?.addEventListener('click', () => {
  cardsCarouselTrack.scrollBy({ left: -300, behavior: 'smooth' });
});

albumNextBtn?.addEventListener('click', () => {
  albumsCarouselTrack.scrollBy({ left: 300, behavior: 'smooth' });
});

albumPrevBtn?.addEventListener('click', () => {
  albumsCarouselTrack.scrollBy({ left: -300, behavior: 'smooth' });
});

cardsCarouselTrack?.addEventListener('scroll', updateCarouselButtons);
cardsCarouselTrack?.addEventListener('pointerdown', (event) => {
  if (event.button !== 0) return;

  if (event.target.closest('.card')) {
    return;
  }

  carouselIsDragging = true;
  carouselPointerId = event.pointerId;
  carouselStartX = event.clientX;
  carouselStartScrollLeft = cardsCarouselTrack.scrollLeft;

  cardsCarouselTrack.classList.add('is-dragging');
  cardsCarouselTrack.setPointerCapture(event.pointerId);
  stopCarouselAutoplay();
});

cardsCarouselTrack?.addEventListener('pointermove', (event) => {
  if (!carouselIsDragging || carouselPointerId !== event.pointerId) {
    return;
  }

  const deltaX = event.clientX - carouselStartX;
  const maxScrollLeft = getCarouselMaxScroll();
  const nextLeft = clamp(carouselStartScrollLeft - deltaX, 0, maxScrollLeft);

  cardsCarouselTrack.scrollLeft = nextLeft;
});

cardsCarouselTrack?.addEventListener('pointerup', finishCarouselDrag);
cardsCarouselTrack?.addEventListener('pointercancel', finishCarouselDrag);
cardsCarouselTrack?.addEventListener('mouseenter', stopCarouselAutoplay);
cardsCarouselTrack?.addEventListener('mouseleave', restartCarouselAutoplay);
cardsCarouselTrack?.addEventListener('focusin', stopCarouselAutoplay);
cardsCarouselTrack?.addEventListener('focusout', restartCarouselAutoplay);

openProfileBtn?.addEventListener('click', toggleProfileQuickMenu);
openProfileMenuItem?.addEventListener('click', handleOpenProfileRequest);
logoutItem?.addEventListener('click', async () => {
  try {
    if (authToken) {
      await apiRequest('/auth/logout', { method: 'POST', requiresAuth: true });
    }
  } catch (_error) {
    // Mantem logout local mesmo se a API falhar.
  }

  resetAuthSession();
  closeProfileQuickMenu();
  window.alert('Voce saiu da sua conta.');
});
closeProfileBtn?.addEventListener('click', closeProfileModal);
closeProfileOverlay?.addEventListener('click', closeProfileModal);
closeLoginBtn?.addEventListener('click', closeLoginModal);
closeLoginOverlay?.addEventListener('click', closeLoginModal);
globalStatusClose?.addEventListener('click', () => setGlobalStatusFeedback(''));

// Fecha o pop-up de cadastro pelos controles do modal.
closeSignupBtn?.addEventListener('click', closeSignupModal);
closeSignupOverlay?.addEventListener('click', closeSignupModal);

// Alterna para a tela de cadastro ao clicar no link.
goToSignupBtn?.addEventListener('click', showSignupView);

// Alterna para a tela de login ao clicar no link.
goToLoginBtn?.addEventListener('click', showLoginView);


// Envia os dados de cadastro para a API e faz login automatico em seguida.
signupForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const name = document.getElementById('signupName')?.value.trim() || '';
  const email = document.getElementById('signupEmail')?.value.trim() || '';
  const password = document.getElementById('signupPassword')?.value || '';
  const confirm = document.getElementById('signupConfirm')?.value || '';
  const signupSubmitBtn = signupForm.querySelector('button[type="submit"]');

  if (!name || !email || !password) {
    setSignupFeedback('Preencha todos os campos.');
    return;
  }

  if (password !== confirm) {
    setSignupFeedback('As senhas nao coincidem.');
    return;
  }

  if (password.length < 6) {
    setSignupFeedback('A senha precisa ter no minimo 6 caracteres.');
    return;
  }

  try {
    setSubmitButtonState(signupSubmitBtn, { isLoading: true, loadingText: 'Criando conta...' });

    setSignupFeedback('Criando conta...', true);

    await apiRequest('/auth/signup', {
      method: 'POST',
      body: { name, email, password },
    });

    setSignupFeedback('Conta criada! Entrando...', true);

    const payload = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    setAuthSession(payload?.session || null);
    signupForm.reset();
    closeSignupModal();
    openProfileModal();
    loadProfileData().catch(() => {
      // Mantem o perfil aberto com placeholders se o backend falhar apos autenticar.
    });
  } catch (error) {
    if (error?.status === 409) {
      setSignupFeedback('Este e-mail ja esta cadastrado. Tente entrar ou recuperar a senha.');
      return;
    }

    setSignupFeedback(error.message || 'Nao foi possivel criar a conta.');
  } finally {
    setSubmitButtonState(signupSubmitBtn, { isLoading: false });
  }
});

// Envia as credenciais para a API e abre o perfil quando o login for valido.
loginForm?.addEventListener('submit', async (event) => {
  event.preventDefault();

  const email = loginEmail?.value.trim() || '';
  const password = loginPassword?.value || '';
  const loginSubmitBtn = loginForm.querySelector('button[type="submit"]');

  if (!email || !password) {
    setLoginFeedback('Preencha e-mail e senha para continuar.');
    return;
  }

  try {
    setSubmitButtonState(loginSubmitBtn, { isLoading: true, loadingText: 'Entrando...' });

    setLoginFeedback('Entrando...', true);

    const payload = await apiRequest('/auth/login', {
      method: 'POST',
      body: { email, password },
    });

    setAuthSession(payload?.session || null);
    setLoginFeedback('Login realizado com sucesso.', true);
    closeLoginModal();
    loginForm.reset();
    openProfileModal();
    loadProfileData().catch(() => {
      // Mantem o perfil aberto com placeholders se o backend falhar apos autenticar.
    });
  } catch (error) {
    if (error.code === 'NETWORK_ERROR') {
      setLoginFeedback('NÃ£o foi possÃ­vel conectar ao servidor. Verifique sua internet ou se o backend estÃ¡ rodando.');
    } else {
      setLoginFeedback(error.message || 'Credenciais invÃ¡lidas ou erro no servidor. Tente novamente.');
    }
  } finally {
    setSubmitButtonState(loginSubmitBtn, { isLoading: false });
  }
});

// Fecha o menu rapido quando o usuario clica fora dele.
document.addEventListener('click', (event) => {
  if (!profileQuickMenu?.classList.contains('active')) {
    return;
  }

  if (event.target.closest('#openProfileBtn') || event.target.closest('#profileQuickMenu')) {
    return;
  }

  closeProfileQuickMenu();
});

// --- SISTEMA DE PESQUISA INTELIGENTE ---
const SEARCH_DATABASE = [
  { id: "wolves", title: "Wolves", artist: "Kanye West", album: "The Life of Pablo", coverUrl: "img/lifeofpablo.jpeg", artistId: "kanye", audioFile: "Wolves.mp3" },
  { id: "runaway", title: "Runaway", artist: "Kanye West", album: "My Beautiful Dark Twisted Fantasy", coverUrl: "img/twistedfantasy.jfif", artistId: "kanye", audioFile: "Runaway Album Version Edited.mp3" },
  { id: "stronger", title: "Stronger", artist: "Kanye West", album: "Graduation", coverUrl: "img/graduation.jpg", artistId: "kanye", audioFile: "" }, // Sem arquivo local
  { id: "square-hammer", title: "Square Hammer", artist: "Ghost", album: "Ceremony and Devotion", coverUrl: "img/ceremony.jpg", artistId: "ghost", audioFile: "Square Hammer.mp3" },
  { id: "satanized", title: "Satanized", artist: "Ghost", album: "SkeletÃ¡", coverUrl: "img/skeleta.jpeg", artistId: "ghost", audioFile: "Ghost Satanized Official Music Video.mp3" },
  { id: "mary-on-a-cross", title: "Mary On A Cross", artist: "Ghost", album: "Seven Inches of Satanic Panic", coverUrl: "img/seveninches.jpeg", artistId: "ghost", audioFile: "Ghost Mary On A Cross Official Audio.mp3" },
  { id: "ill-die-for-you", title: "I'll Die For You", artist: "Mitski", album: "Nothing's About to Happen to Me", coverUrl: "img/mitski.jpg", artistId: "mitski", audioFile: "Mitski I ll Change for You.mp3" },
  { id: "snuff", title: "Snuff", artist: "Slipknot", album: "All Hope Is Gone", coverUrl: "img/Slipknot.jpg", artistId: "slipknot", audioFile: "Snuff 2012 Remaster.mp3" },
  { id: "diamond-eyes", title: "Diamond Eyes", artist: "Deftones", album: "Diamond Eyes", coverUrl: "img/deftones.jfif", artistId: "deftones", audioFile: "Deftones Diamond Eyes Official Lyric Video.mp3" }
];

const searchResults = document.getElementById('searchResults');

function renderSearchResults(query) {
  if (!searchResults) return;
  
  if (!query) {
    searchResults.classList.remove('active');
    searchResults.setAttribute('aria-hidden', 'true');
    return;
  }

  const normalizedQuery = query.toLowerCase().trim();
  const filteredSongs = SEARCH_DATABASE.filter(song => 
    song.title.toLowerCase().includes(normalizedQuery) || 
    song.artist.toLowerCase().includes(normalizedQuery)
  );

  searchResults.innerHTML = '';

  if (filteredSongs.length === 0) {
    searchResults.innerHTML = '<div class="search-no-results">Nenhuma mÃºsica encontrada.</div>';
  } else {
    filteredSongs.forEach(song => {
      const item = document.createElement('div');
      item.className = 'search-result-item';
      
      item.innerHTML = `
        <img src="${song.coverUrl}" alt="Capa ${song.title}" class="search-result-image">
        <div class="search-result-info">
          <span class="search-result-title">${song.title}</span>
          <span class="search-result-artist">${song.artist} â€¢ ${song.album}</span>
        </div>
      `;

      item.addEventListener('click', () => {
        if (typeof openLyricsModal === 'function') {
          openLyricsModal(song);
          searchResults.classList.remove('active');
        } else {
          window.location.href = `main.html?id=${song.artistId}&song=${encodeURIComponent(song.title)}`;
        }
      });

      searchResults.appendChild(item);
    });
  }

  searchResults.classList.add('active');
  searchResults.setAttribute('aria-hidden', 'false');
}

/**
 * UtilitÃ¡rios para os carrossÃ©is da pÃ¡gina inicial.
 */
function updateCarouselButtons() {
  if (cardsCarouselTrack) {
    cardsPrevBtn.style.display = cardsCarouselTrack.scrollLeft <= 0 ? 'none' : 'flex';
    cardsNextBtn.style.display = 
      cardsCarouselTrack.scrollLeft >= cardsCarouselTrack.scrollWidth - cardsCarouselTrack.clientWidth ? 'none' : 'flex';
  }
  
  if (albumsCarouselTrack) {
    albumPrevBtn.style.display = albumsCarouselTrack.scrollLeft <= 0 ? 'none' : 'flex';
    albumNextBtn.style.display = 
      albumsCarouselTrack.scrollLeft >= albumsCarouselTrack.scrollWidth - albumsCarouselTrack.clientWidth ? 'none' : 'flex';
  }
}

cardsCarouselTrack?.addEventListener('scroll', updateCarouselButtons);
albumsCarouselTrack?.addEventListener('scroll', updateCarouselButtons);

window.addEventListener('resize', updateCarouselButtons);

searchInput?.addEventListener('input', (event) => {
  renderSearchResults(event.target.value);
});

searchInput?.addEventListener('focus', (event) => {
  if (event.target.value.trim()) {
    renderSearchResults(event.target.value);
  }
});

// Fecha pesquisa ao clicar fora
document.addEventListener('click', (event) => {
  if (!event.target.closest('.search-container') && searchResults?.classList.contains('active')) {
    searchResults.classList.remove('active');
    searchResults.setAttribute('aria-hidden', 'true');
  }
});

// Mantem o item ativo do menu e fecha o drawer no mobile.
menuItems.forEach((item) => {
  item.addEventListener('click', () => {
    syncMenuSelection(item.textContent.trim());
    closeFloatingMenu();
  });
});

menuToggleBtn?.addEventListener('click', toggleFloatingMenu);
floatingMenuClose?.addEventListener('click', closeFloatingMenu);
floatingMenuOverlay?.addEventListener('click', closeFloatingMenu);

// Centraliza os atalhos de teclado para fechar elementos abertos.
window.addEventListener('keydown', (event) => {
  if (event.key !== 'Escape') {
    return;
  }

  if (profileModal?.classList.contains('active')) {
    closeProfileModal();
  }

  if (loginModal?.classList.contains('active')) {
    closeLoginModal();
  }

  if (signupModal?.classList.contains('active')) {
    closeSignupModal();
  }

  if (profileQuickMenu?.classList.contains('active')) {
    closeProfileQuickMenu();
  }

  if (floatingRecommendationsTab?.classList.contains('active')) {
    closeFloatingTab();
  }

  if (floatingMenuDrawer?.classList.contains('active')) {
    closeFloatingMenu();
  }
});


// Inicia o arraste da aba flutuante a partir do cabecalho.
floatingTabDragHandle?.addEventListener('pointerdown', (event) => {
  if (!floatingRecommendationsTab.classList.contains('active')) {
    return;
  }

  if (event.target.closest('.floating-tab-close')) {
    return;
  }

  const rect = floatingRecommendationsTab.getBoundingClientRect();
  isDragging = true;
  dragPointerId = event.pointerId;
  dragOffsetX = event.clientX - rect.left;
  dragOffsetY = event.clientY - rect.top;

  floatingRecommendationsTab.style.left = `${rect.left}px`;
  floatingRecommendationsTab.style.top = `${rect.top}px`;
  floatingRecommendationsTab.style.right = 'auto';
  floatingRecommendationsTab.style.bottom = 'auto';
  floatingRecommendationsTab.classList.add('is-dragging');

  floatingTabDragHandle.setPointerCapture(event.pointerId);
});

// Atualiza a posicao da aba enquanto ela esta sendo arrastada.
floatingTabDragHandle?.addEventListener('pointermove', (event) => {
  if (!isDragging || dragPointerId !== event.pointerId) {
    return;
  }

  const margin = 8;
  const nextLeft = event.clientX - dragOffsetX;
  const nextTop = event.clientY - dragOffsetY;
  const maxLeft = Math.max(margin, window.innerWidth - floatingRecommendationsTab.offsetWidth - margin);
  const maxTop = Math.max(margin, window.innerHeight - floatingRecommendationsTab.offsetHeight - margin);

  floatingRecommendationsTab.style.left = `${clamp(nextLeft, margin, maxLeft)}px`;
  floatingRecommendationsTab.style.top = `${clamp(nextTop, margin, maxTop)}px`;
});

// Finaliza o arraste da aba flutuante.
function finishDrag(event) {
  if (!isDragging || dragPointerId !== event.pointerId) {
    return;
  }

  isDragging = false;
  dragPointerId = null;
  floatingRecommendationsTab.classList.remove('is-dragging');

  if (floatingTabDragHandle.hasPointerCapture(event.pointerId)) {
    floatingTabDragHandle.releasePointerCapture(event.pointerId);
  }
}

floatingTabDragHandle?.addEventListener('pointerup', finishDrag);
floatingTabDragHandle?.addEventListener('pointercancel', finishDrag);

// Mantem layout e autoplay sincronizados com eventos globais da pagina.
window.addEventListener('resize', keepFloatingTabInViewport);
window.addEventListener('resize', updateCarouselButtons);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopCarouselAutoplay();
  } else if (!carouselIsDragging) {
    restartCarouselAutoplay();
  }
});

// --- LÃ³gica de EdiÃ§Ã£o de Perfil --- //

// 1. EdiÃ§Ã£o de Texto (Nome, Email)
function setupEditButton(btnId, valueId, inputId, fieldName) {
  const btn = document.getElementById(btnId);
  const valueDisplay = document.getElementById(valueId);
  const inputEl = document.getElementById(inputId);

  if (!btn || !valueDisplay || !inputEl) return;

  btn.addEventListener('click', async () => {
    const isEditing = btn.classList.contains('save-mode');

    if (!isEditing) {
      // Iniciar ediÃ§Ã£o
      valueDisplay.style.display = 'none';
      inputEl.style.display = 'block';
      inputEl.focus();
      btn.textContent = 'Salvar';
      btn.classList.add('save-mode');
    } else {
      // Salvar
      const newValue = inputEl.value.trim();
      if (!newValue) return;

      try {
        btn.textContent = 'Gravando...';
        const bodyContent = {};
        bodyContent[fieldName] = newValue;

        await apiRequest('/profile/me', {
          method: 'PUT',
          requiresAuth: true,
          body: bodyContent
        });

        // Atualiza a visualizaÃ§Ã£o local
        valueDisplay.textContent = newValue;
        if (fieldName === 'full_name') document.getElementById('profileDisplayName').textContent = newValue;
        if (fieldName === 'email') document.getElementById('profileDisplayEmail').textContent = newValue;

      } catch (err) {
        console.error('Erro ao salvar:', err);
        inputEl.value = valueDisplay.textContent;
      } finally {
        valueDisplay.style.display = 'block';
        inputEl.style.display = 'none';
        btn.textContent = 'Editar';
        btn.classList.remove('save-mode');
      }
    }
  });
}

setupEditButton('editNameBtn', 'profileFullNameValue', 'editFullNameInput', 'full_name');
setupEditButton('editEmailBtn', 'profileEmailValue', 'editEmailInput', 'email');
setupEditButton('editPhoneBtn', 'profilePhoneValue', 'editPhoneInput', 'phone');

// 2. EdiÃ§Ã£o da Foto de Perfil
const profileImageClickable = document.getElementById('profileImageClickable');
const profileImageInput = document.getElementById('profileImageInput');

profileImageClickable?.addEventListener('click', () => {
  profileImageInput?.click();
});

profileImageClickable?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' || e.key === ' ') {
    e.preventDefault();
    profileImageInput?.click();
  }
});

profileImageInput?.addEventListener('change', async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;

  // Lemos a imagem como Base64 
  const reader = new FileReader();
  reader.onload = async (e) => {
    const base64Image = e.target.result;

    try {
      // Opcional: Alerta visual de carregamento
      if (profileImageClickable) profileImageClickable.style.opacity = '0.5';

      const response = await apiRequest('/profile/me', {
        method: 'PUT',
        requiresAuth: true,
        body: { profile_image: base64Image }
      });

      // Aplica os dados retornados diretamente, evitando uma segunda chamada GET
      if (response && response.profile) {
        applyProfileData(response.profile);
      }

    } catch (err) {
      console.error('Erro ao salvar foto:', err);
      if (err.message.includes('413')) {
        alert('A imagem Ã© muito grande. Tente uma foto menor ou mais leve.');
      } else {
        alert('NÃ£o foi possÃ­vel salvar a imagem. Verifique sua conexÃ£o.');
      }
    } finally {
      if (profileImageClickable) profileImageClickable.style.opacity = '1';
    }
  };
  reader.readAsDataURL(file);
});

updateCarouselButtons();
updateAuthUI();
startCarouselAutoplay();

// Garante que os listeners de letras sejam aplicados aos cards estÃ¡ticos
if (typeof setupLyricsModalTriggers === 'function') {
  setupLyricsModalTriggers();
}

ensureApiConnectivity();

// Utilitario para ajustar manualmente a URL da API pelo console.
window.setLyricsApiBaseUrl = (nextBaseUrl) => {
  updateApiBaseUrl(nextBaseUrl);
  setGlobalStatusFeedback(`URL da API atualizada para ${API_BASE_URL}.`);
};

// Tenta restaurar a sessao ja salva ao carregar a pagina.
if (isUserLoggedIn) {
  loadProfileData().catch(() => {
    resetAuthSession();
  });
}

// --- Conteúdo mesclado de letras.js ---
const lyricsModal = document.getElementById('lyricsModal');
const closeLyricsBtn = document.getElementById('closeLyricsBtn');
const closeLyricsOverlay = document.getElementById('closeLyricsOverlay');
const lyricsModalTitle = document.getElementById('lyricsModalTitle');
const lyricsModalArtist = document.getElementById('lyricsModalArtist');
const lyricsModalAlbum = document.getElementById('lyricsModalAlbum');
const lyricsModalCover = document.getElementById('lyricsModalCover');
const lyricsModalText = document.getElementById('lyricsModalText');
const lyricsFeedback = document.getElementById('lyricsFeedback');

const COVER_PLACEHOLDER = 'data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'100\' height=\'100\' viewBox=\'0 0 100 100\'%3E%3Crect width=\'100\' height=\'100\' fill=\'%23395B44\'/%3E%3Ctext x=\'50\' y=\'55\' font-family=\'Arial\' font-size=\'14\' fill=\'%23C1DBB3\' text-anchor=\'middle\'%3Eâ™ª%3C/text%3E%3C/svg%3E';

// VariÃ¡veis globais para controle de Ã¡udio
let currentAudio = null;
let currentSongPlaying = null;
let progressInterval = null;

// Converte segundos para o formato mm:ss.
function formatTime(seconds) {
  if (isNaN(seconds) || seconds < 0) return "00:00";
  const min = Math.floor(seconds / 60);
  const sec = Math.floor(seconds % 60);
  return `${min.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
}

// Atualiza tempo e barra de progresso do player no modal.
function updateProgress() {
  if (!currentAudio) return;
  const timeDisplay = document.getElementById('lyricsTime');
  const progressFill = document.getElementById('lyricsProgressFill');
  
  const current = formatTime(currentAudio.currentTime);
  const total = formatTime(currentAudio.duration);
  
  if (timeDisplay) {
    timeDisplay.textContent = `${current} / ${total}`;
  }
  
  if (progressFill && currentAudio.duration) {
    const percent = (currentAudio.currentTime / currentAudio.duration) * 100;
    progressFill.style.width = `${percent}%`;
  }
}

// Alterna play/pause e troca o audio quando a musica muda.
function toggleAudio(songData) {
  const playBtn = document.getElementById('lyricsPlayBtn');
  const playIcon = document.getElementById('playIcon');
  
  const fileName = songData.audioFile || `${songData.title.toLowerCase().replace(/ /g, '_')}.mp3`;
  const audioPath = `msc/${fileName}`;

  // Se jÃ¡ estiver tocando ESSA mÃºsica, faz pause/play
  if (currentAudio && currentSongPlaying === songData.title) {
    if (currentAudio.paused) {
      currentAudio.play().catch(err => console.error("Erro ao retomar Ã¡udio:", err));
      playIcon.textContent = 'â¸';
      playBtn.classList.add('playing');
    } else {
      currentAudio.pause();
      playIcon.textContent = 'â–¶';
      playBtn.classList.remove('playing');
    }
    return;
  }

  // Novo Ã¡udio ou outra mÃºsica
  if (currentAudio) {
    currentAudio.pause();
    currentAudio.src = ""; // Libera o recurso
    clearInterval(progressInterval);
  }

  currentAudio = new Audio(encodeURI(audioPath));
  currentAudio.load(); // ForÃ§a o carregamento
  currentSongPlaying = songData.title;
  
  // Atualiza duraÃ§Ã£o assim que os metadados carregarem
  currentAudio.addEventListener('loadedmetadata', updateProgress);
  
  currentAudio.play().then(() => {
    playIcon.textContent = 'â¸';
    playBtn.classList.add('playing');
    // Atualiza a cada 200ms para maior fluidez no contador
    progressInterval = setInterval(updateProgress, 200);
    lyricsFeedback.textContent = ""; 
  }).catch(err => {
    console.error("Erro ao tocar Ã¡udio:", err);
    lyricsFeedback.style.color = "#ff5555";
    lyricsFeedback.textContent = `Arquivo "${fileName}" nÃ£o encontrado em /msc/.`;
    playIcon.textContent = 'â–¶';
    playBtn.classList.remove('playing');
  });

  currentAudio.onended = () => {
    playIcon.textContent = 'â–¶';
    playBtn.classList.remove('playing');
    clearInterval(progressInterval);
    currentAudio = null;
    currentSongPlaying = null;
    const timeDisplay = document.getElementById('lyricsTime');
    if (timeDisplay) timeDisplay.textContent = '00:00 / 00:00';
  };
}

// Abre o modal de letra e prepara os controles de audio.
function openLyricsModal(songData) {
  if (!lyricsModal) return;

  lyricsModalTitle.textContent = songData.title || 'TÃ­tulo desconhecido';
  lyricsModalArtist.textContent = songData.artist || 'Artista desconhecido';
  lyricsModalAlbum.textContent = songData.album || 'Ãlbum desconhecido';
  lyricsModalCover.src = songData.coverUrl || COVER_PLACEHOLDER;
  lyricsModalCover.alt = songData.coverUrl ? `Capa do Ã¡lbum ${songData.album || songData.title}` : 'Sem capa disponÃ­vel';
  lyricsModalText.textContent = 'Carregando letra...';
  lyricsFeedback.textContent = '';

  const playBtn = document.getElementById('lyricsPlayBtn');
  const progressFill = document.getElementById('lyricsProgressFill');
  const timeDisplay = document.getElementById('lyricsTime');

  if (playBtn) {
    playBtn.style.backgroundImage = `url(${songData.coverUrl || ''})`;
    playBtn.classList.remove('playing');
    document.getElementById('playIcon').textContent = 'â–¶';
    
    const newBtn = playBtn.cloneNode(true);
    playBtn.parentNode.replaceChild(newBtn, playBtn);
    newBtn.addEventListener('click', () => toggleAudio(songData));
  }

  if (progressFill) progressFill.style.width = '0%';
  if (timeDisplay) timeDisplay.textContent = '00:00 / 00:00';

  lyricsModal.classList.add('active');
  lyricsModal.setAttribute('aria-hidden', 'false');
  updateBodyScrollLock();
  fetchLyricsForSong(songData);
}

// Fecha o modal de letra e interrompe o audio atual.
function closeLyricsModal() {
  if (!lyricsModal) return;
  lyricsModal.classList.remove('active');
  lyricsModal.setAttribute('aria-hidden', 'true');
  updateBodyScrollLock();

  // Para a mÃºsica ao fechar
  if (currentAudio) {
    currentAudio.pause();
    currentAudio = null;
    currentSongPlaying = null;
  }
}

// Busca a letra no banco local simulado e atualiza o modal.
async function fetchLyricsForSong(songData) {
  try {
    await new Promise(resolve => setTimeout(resolve, 800));
    const mockLyrics = getMockLyrics(songData.title, songData.artist);
    if (mockLyrics) {
      lyricsModalText.textContent = mockLyrics;
      lyricsFeedback.textContent = '';
    } else {
      lyricsModalText.textContent = `Letra nÃ£o disponÃ­vel para "${songData.title}" no momento.\n\nEnquanto isso, que tal explorar outras mÃºsicas?`;
      lyricsFeedback.textContent = 'Letra nÃ£o encontrada no banco de dados local.';
    }
  } catch (error) {
    console.error('Erro ao buscar letra:', error);
    lyricsModalText.textContent = 'NÃ£o foi possÃ­vel carregar a letra.';
    lyricsFeedback.textContent = error.message || 'Erro de conexÃ£o. Tente novamente mais tarde.';
  }
}

// Retorna a letra mais proxima com base em titulo e artista.
function getMockLyrics(title, artist) {
  const titleLower = title.toLowerCase().trim();
  const artistLower = artist.toLowerCase().trim();

  const mockDatabase = {
// MÃºsicas do Kanye West
    'wolves|kanye west': `[Kanye West]
Lost out, beat up
Dancin', down there
I found you, somewhere out
'Round, 'round there, right, right there

Lost and beat up
// Conecta os itens de recomendacao ao redirecionamento de artista.
Down there, dancin'
I found you, somewhere out
Right down there, right 'round there

Lost and found out
Turned out how you thought
Daddy found out
How you turned out, how you turned out

If mama knew now
How you turned out, you too wild
You too wild, you too wild
You too wild, I need you now

Got to (got to) love you (love you)
Found you, found you
Right down, right now
Right now, right now

If your mama knew how
You turned out, you too wild
You too wild, you too wild
You too wild, and I need you now
Lost in my doubt

[Vic Mensa]
Cry, I'm not sorry
Cry, who needs sorry when there's Hennessy?
Don't fool yourself
Your eyes don't lie, you're much too good to be true
Don't fire fight
Yeah, I feel you burning, everything's burning
Don't fly too high
Your wings might melt, you're much too good to be true
I'm just bad for you
I'm just bad, bad, bad for you

[Sia]
I was lost and beat up
Turned out, burned up
You found me, through a heartache
Didn't know me, you were drawn in

I was lost and beat up
I was warm flesh, unseasoned
You found me, in your gaze
I found me, oh, Jesus

I was too wild, I was too wild
I was too wild, I was too wild
I was too wild, I was too wild

[Kanye West]
And I need you now
Lost and found out

Yeah
You gotta let me know if I could be your Joseph
Only tell you real shit, that's the tea, no sip
Don't trip, don't trip, that pussy slippery, no whip
We ain't trippin' on shit, we just sippin' on this
Just forget the whole shit, we could laugh about nothin'
I impregnate your mind, let's have a baby without fuckin', yo

I know it's corny bitches you wish you could unfollow
I know it's corny niggas you wish you could unswallow
I know it's corny bitches you wish you could unfollow
I know it's corny niggas you wish you could unswallow
I know it's corny bitches you wish you could unfollow
I know it's corny niggas you wish you could unswallow

You tried to play nice, everybody just took advantage
You left your fridge open, somebody just took a sandwich
I said: Baby, what if you was clubbin'
Thuggin', hustlin', before you met your husband?
Then I said: What if Mary was in the club
'Fore she met Joseph around hella thugs?
Cover Nori in lambs' wool
We surrounded by the fuckin' wolves

(What if Mary) what if Mary
(Was in the club) was in the club
'Fore she met Joseph with no love?
Cover Saint in lambs' wool
(And she was) we surrounded by
(Surrounded by) the fuckin' wolves`,

'runaway|kanye west': `Look at ya, look at ya, look at ya, look at ya (look at ya)
Look at ya, look at ya, look at ya, look at ya (look at ya)
Look at ya, look at ya, look at ya, look at ya (look at ya)
Look at ya, look at ya, look at ya, look at ya

And I always find, yeah, I always find something wrong
You been puttin' up with my shit just way too long
I'm so gifted at finding what I don't like the most
So I think it's time for us to have a toast

Let's have a toast for the douchebags
Let's have a toast for the assholes
Let's have a toast for the scumbags
Every one of them that I know
Let's have a toast for the jerk-offs
That'll never take work off
Baby, I got a plan
Run away fast as you can

She find pictures in my email
I sent this bitch a picture of my dick
I don't know what it is with females
But I'm not too good at that shit
See, I could have me a good girl
And still be addicted to them hoodrats
And I just blame everything on you
At least you know that's what I'm good at

And I always find, yeah, I always find
Yeah, I always find something wrong
You been puttin' up with my shit just way too long
I'm so gifted at finding what I don't like the most
So I think it's time for us to have a toast

Let's have a toast for the douchebags
Let's have a toast for the assholes
Let's have a toast for the scumbags
Every one of them that I know
Let's have a toast for the jerk-offs
That'll never take work off
Baby, I got a plan
Run away fast as you can

Run away from me, baby
Ah, run away
Run away from me, baby (look at ya, look at ya, look at ya)
Run away
When it starts to get crazy (look at ya, look at ya, look at ya)
Then run away
Babe, I got a plan, run away as fast as you can

Run away from me, baby
Run away
Run away from me, baby (look at, look at, look at, look at, look at, look at, look at ya)
Run away
When it starts to get crazy (look at ya, look at ya, look at ya, look at ya)
Why can't she just run away?
Baby, I got a plan
Run away as fast as you can (look at ya, look at ya, look at ya)

Twenty-four seven, three sixty-five, pussy stays on my mind
I, I, I, I did it, alright, alright, I admit it
Now pick your next move, you could leave or live with it
Ichabod Crane with that motherfuckin' top off
Split and go where? Back to wearing knockoffs?
Haha, knock it off, Neimans, shop it off
Let's talk over mai tais, waitress, top it off
Hoes like vultures, wanna fly in your Freddy loafers
You can't blame 'em, they ain't never seen Versace sofas
Every bag, every blouse, every bracelet
Comes with a price tag, baby, face it
You should leave if you can't accept the basics
Plenty hoes in the baller-nigga matrix
Invisibly set, the Rolex is faceless
I'm just young, rich, and tasteless, P

Never was much of a romantic
I could never take the intimacy
And I know I did damage
'Cause the look in your eyes is killing me
I guess you knew of that advantage
'Cause you could blame me for everything
And I don't know how I'ma manage
If one day, you just up and leave

And I always find, yeah, I always find something wrong
You been puttin' up with my shit just way too long
I'm so gifted at finding what I don't like the most
So I think it's time for us to have a toast

Let's have a toast for the douchebags
Let's have a toast for the assholes
Let's have a toast for the scumbags
Every one of them that I know
Let's have a toast for the jerk-offs
That'll never take work off
Baby, I got a plan
Run away fast as you can`,

'stronger|kanye west': `Work it, make it, do it
Make us harder, better, faster, stronger
(Work it harder, make it better) n-na-now th-that that don't kill me
(Do it faster, make us stronger) can only make me stronger
(More than ever, hour after hour) I need you to hurry up now
(Work is never over) cause I can't wait much longer
(Work it harder, make it better) I know I got to be right now
(Do it faster, make us stronger) 'Cause I can't get much wronger
(More than ever, hour after hour) man, I've been waitin' all night now
That's how long I've been on ya

Work it harder
Make it better
Do it faster
Make us stronger (I need you right now)
More than ever
Hour after hour
I need you right now

Let's get lost tonight, you could be my black kate moss tonight
Play secretary, I'm the boss tonight
You don't give a fuck what they all say, right?
Awesome the Christian in Christian Dior
Danm, they don't make 'em like this anymore
I ask cause I'm not sure, do anybody make real shit anymore?
Bow in presence of greatness cause right now that has forsaken us
You should be honored by my lateness
That I'd even show up to this fake shit
So go ahead, go nuts, go ape shit
Specially on my best stand on my BAPE shit
Act like you can't tell who made this
New gospel homey take six, and take this haters

Th-that that don't kill me
Can only make me stronger
I need you to hurry up now
Cause I can't wait much longer
I know I got to be right now
'Cause I can't get much wronger
Man, I've been waitin' all night now
That's how long I've been on ya

Work it harder
Make it better
Do it faster
Make us stronger (I need you right now)
More than ever
Hour after hour
I need you right now

Me likey

I don't know if you got a man or not
If you made plans or not
If God put me in your plans or not
I'm tripping, this drink got me saying a lot
But I know that God put you in front of me
So how the hell could you front on me?
There's a thousand yous there's only one of me
I'm tripping, I'm caught up in the moment, right?

This is Louis Vuitton dime night
So we gon' do everything that kan like
Heard they'd do anything for a Klondike
I'd do anything for a blond dike
And she'll do anything for the limelight
And we'll do anything when the time's right
Uh, baby you're making it
Harder, better, faster, stronger

Th-that that don't kill me
Can only make me stronger
I need you to hurry up now
Cause I can't wait much longer
I know I got to be right now
'Cause I can't get much wronger
Man, I've been waitin' all night now
That's how long I've been on ya

Work it harder
Make it better
Do it faster
Make us stronger (I need you right now)
More than ever
Hour after hour
I need you right now

(Work it harder, make it better) you know how long I've been on ya
(Do it faster, make us stronger) since prince was on Appolonia
(More than ever, hour after hour) since O.J. has isotoners
Don't act like I never told ya

Work it, work is never over
Work it, work is never over don't act like I (never) told ya
Harder, work is never over uh
Better, work is never over don't act like I (never) told ya
Work it, work is never over don't act like I (never) told ya
Work it, work is never over don't act like I (never) told ya
Harder, work is never over uh, baby you're making it
Harder, better, faster, stronger

(Work it harder, make it better) you know how long I've been on ya
(Do it faster, make us stronger) since prince was on Appolonia
(More than ever, hour after hour) since O.J. has isotoners
Don't act like I never told ya

(Work it harder, make it better) you know how long I've been on ya
(Do it faster, make us stronger) since prince was on Appolonia
(More than ever, hour after hour) since O.J. has isotoners
Don't act like I never told ya`,

// MÃºsicas do Ghost

    'satanized|ghost': `There is something inside me
And they don't know if there is a cure
A demonic possession
Unlike any before

It's a sickening heartache
And it's slowly tormenting my soul
I've invested my prayers
Into making me whole

I should have known not to give in
I should have known not to give in

Blasphemy, heresy
Save me from the monster that is eating me
I'm victimized
Blasphemy, heresy
Save me, from the bottom of my heart, I know
I'm satanized
I'm satanized
I'm satanized

An nescitis quoniam membra vestra
Templum est Spiritus Sancti
Qui in vobis est
Quem habetis a Deo et non estis vestri?

Through a life of devotion
I've been quelling my urges to burst
I've been fighting the notion
To, by love, be coerced

I should have known not to give in
I should have known not to give in

Blasphemy, heresy
Save me from the monster that is eating me
I'm paralyzed
Blasphemy, heresy
Save me, from the bottom of my heart, I know
I'm satanized
I'm satanized
I'm satanized

Like a deadly affliction
That is twisting and bending my core
I have begged God for the remedy
But I'm no longer sure

I should have known not to give in
I should have known not to give in

Blasphemy, heresy
Save me from the monster that is eating me
I'm laicized
Blasphemy, heresy
Save me, from the bottom of my heart, I know
I'm satanized

From the bottom of my heart, I know
I'm satanized
From the bottom of my heart, I know
I'm satanized
I'm satanized
I'm satanized`,

 'mary on a cross|ghost': `We were speeding together
Down the dark avenues
But besides all the stardom
All we got was blues
But through all the sorrow
We've been riding high
And the truth of the matter is
I never let you go, let you go

We were scanning the cities
Rocking to pay their dues
But besides all the glamour
All we got was bruised
But through all the sorrow
We've been riding high
And the truth of the matter is
I never let you go, let you go

You go down just like Holy Mary
Mary on a, Mary on a cross
Not just another Bloody Mary
Mary on a, Mary on a cross
If you choose to run away with me
I will tickle you internally
And I see nothing wrong with that

We were searching for reasons
To play by the rules
But we quickly found out
It was just for fools
Now through all the sorrow
We'll be riding high
And the truth of the matter is
I never let you go, let you go

You go down just like Holy Mary
Mary on a, Mary on a cross
Not just another Bloody Mary
Mary on a, Mary on a

You go down just like Holy Mary
Mary on a, Mary on a cross
Your beauty never, ever scared me
Mary on a, Mary on a cross
If you choose to run away with me
I will tickle you internally
And I see nothing wrong with that

(Mary on a, Mary on a cross)
Nothing wrong with that
(Mary on a, Mary on a cross)
Nothing wrong with that
(Mary on a, Mary on a cross)
(Mary on a) Mary on a cross`,

'square hammer|ghost': `Mating in the night
'Neath heavens torn asunder
You call on me
To solve a crooked rhyme

As I'm closing in
Imposing on your slumber
You call on me
As bells begin to chime

Are you on the square?
Are you on the level?
Are you ready to swear right here, right now
Before the devil?

That you're on the square?
That you're on the level?
That you're ready to stand right here, right now?
Right here, right now

Hiding from the light
Sacrificing nothing
Still, you call on me
For entrance to the shrine

Hammering the nails
Into a sacred coffin
You call on me
For powers clandestine

Are you on the square?
Are you on the level?
Are you ready to swear right here, right now
Before the devil?

That you're on the square?
That you're on the level?
That you're ready to stand right here, right now?
Right here, right now

Are you on the square?
Are you on the level?
Are you ready to swear right here, right now
Before the devil?

That you're on the square?
That you're on the level?
That you're ready to stand right here, right now?
Right here, right now

Right here, right now
Right here, right now
Right here, right now
Right here, right now`,

'lachryma|ghost': `Ripping through every poem
Like a vampire should
And it takes one to know 'em
Like I knew you would

In the middle of the night, it feeds
In the middle of the night, it eats you

Everybody knows
Everywhere I go
I can never run and I cannot hide

I'm done crying
Over someone like you
I'm done crying
I hope you're feeling it too now
I'm done

Crying
Crying

Now that sweet's gone sour
Seeping down the cracks
Mm, getting worse by the hour
The vile rot attacks, oh

In the middle of the night, it feeds
In the middle of the night, it eats you

Everybody knows
Everywhere I go
I can never run and I cannot hide

I'm done crying
Over someone like you
I'm done crying
I hope you're feeling it too, now
I'm done

Crying
Crying

Everybody knows
Everywhere I go
And I cannot wait until the day when

I'm done crying
Over someone like you
I'm done crying
I hope you're feeling it too, now

I'm done crying (crying)
Over someone like you
I'm done crying (crying)
I need somebody new now
I'm done`,

//MÃºsicas da Mitski

    'i\'ll die for you|mitski': `How do I let our love die
When you're the only other keeper
Of my most precious memories?
Yeah, I've been drinking
Why's that gotta mean
I can't call you 'bout you and me?

'Cause I'll do anything
For you to love me again
If you don't like me now
I will change for you

Bars, such magic places
You can be with other people
Without having anyone at all, but now
They say they're closing
So I'm loitering outside
Watching all the cars passing by
Like a kid waiting for my ride

I'll do anything
For you to love me again
If you don't like me now
I will change for you
I'll change for you`,

'i\'washing machine heart|mitski': `Washing Machine Heart
Mitski

Toss your dirty shoes in my washing machine heart
Baby, bang it up inside
I'm not wearing my usual lipstick
I thought maybe we would kiss tonight

Baby, will you kiss me already? And
Toss your dirty shoes in my washing machine heart
Baby, bang it up inside

Baby, though I've closed my eyes
I know who you pretend I am
I know who you pretend I am

Do mi ti
Why not me?
Why not me?

Do mi ti
Why not me?
Why not me?

Do mi ti
Why not me?
Why not me?`,


//Letras do Slipknot
'snuff|slipknot': `Bury all your secrets in my skin
Come away with innocence
And leave me with my sins
The air around me still feels like a cage
And love is just a camouflage
For what resembles rage again

So if you love me, let me go
And run away before I know
My heart is just too dark to care
I can't destroy what isn't there
Deliver me into my fate
If I'm alone, I cannot hate
I don't deserve to have you
My smile was taken long ago
If I can change, I hope I never know

I still press your letters to my lips
And cherish them in parts of me
That savor every kiss
I couldn't face a life without your light
But all of that was ripped apart
When you refused to fight

So save your breath, I will not hear
I think I made it very clear
You couldn't hate enough to love
Is that supposed to be enough?
I only wish you weren't my friend
Then I could hurt you in the end
I never claimed to be a saint
My own was banished long ago
It took the death of hope to let you go

So break yourself against my stones
And spit your pity in my soul
You never needed any help
You sold me out to save yourself
And I won't listen to your shame
You ran away, you're all the same
Angels lie to keep control
My love was punished long ago
If you still care, don't ever let me know
If you still care, don't ever let me know`,

'people = shit|slipknot': `People = Shit
Slipknot

Yeah! No! Yeah!
C'mon!
Here we go again, motherfucker!

Come on down, and see the idiot right here
Too fucked to beg and not afraid to care
What's the matter with calamity anyway?
Right? Get the fuck outta my face
Understand that I can't feel anything
It isn't like I wanna sift through the decay
I feel like a wound, like I got a fuckin'
Gun against my head, you live when I'm dead

One more time, motherfucker!

Everybody hates me now, so fuck it
Blood's on my face and my hands, and I
Don't know why, I'm not afraid to cry
But that's none of your business
Whose life is it? Get it? See it? Feel it? Eat it?
Spin it around so I can spit in it's face
I wanna leave without a trace
'Cause I don't wanna die in this place

People equal shit
People equal shit
People equal shit
People equal shit

(People equal shit) whatcha gonna do?
(People equal shit) 'cause I am not afraid of you!
(People equal shit) I'm everything you'll never be!
(People equal shit)

Yeah! C'mon!

It never stops you can't be everything to everyone
Contagion, I'm sittin' at be side of Satan
What do you want from me?
They never told me the failure I was meant to be, yea
Overdo it don't tell me you blew it
Stop your bitchin' and fight your way through it
I'm not like you, I just fuck up

C'mon, motherfucker, everybody has to die
C'mon, motherfucker, everybody has to die

I know why

People equal shit
People equal shit
People equal shit
People equal shit
People equal shit

(People equal shit) Yeah!
(People equal shit) Yeah!
(People equal shit) Yeah!
(People equal shit) Ahhh!

People equal shit
People equal shit
People equal shit
People equal shit

(People equal shit) whatcha gonna do?
(People equal shit) 'cause I am not afraid of you
(People equal shit) I'm everything you'll never be
(People equal shit)

Yeah
Got? That right!`,


//MÃºsicas do Deftones
'diamond eyes|deftones': `To the edge
Till we all get off
I will take you away with me
Once and for all

Time will see us realign
Diamonds rain across the sky
And shower me into the same
Realm

Calculate our embrace, hold on
Come with me now
Run away outer space with me
Once and for all

Time will see us realign
Diamonds rain across the sky
And shower me into the same
Realm

Time will see us realign
Diamonds rain across the sky
And I will lead us to the same
Realm

Get set

When the coffin shakes
And the needle breaks
Come, run away with me
Come on, you'll see, once and for all

Time will see us realign
Diamonds rain across the sky
And shower me into the same
Realm

Time will lead us to the same
Realm
I will lead us to the same
Realm`,

'be quiet and drive|deftones': `This town don't feel mine
I'm fast to get away, far
I dressed you in her clothes
So drive me far

Away
Away
Away

It feels good to know you're all mine
Now drive me far

Away
Away
Away

Far (away)
I don't care where, just far (away)
I don't care where, just far (away)
I don't care where, just far (away)
I don't care

Far (away)
I don't care where, just far (away)
I don't care where, just far (away)
I don't care where, just far (away)
I don't care

Far (away)
I don't care where, just far (away)
I don't care where, just far (away)
I don't care where, just far (away)
Away

Far (away)
I don't care where, just far (away)
I don't care where, just far (away)
I don't care where, just far (away)
Away

So far (away)
I don't care where, far (away)
I don't care just where, far (away)
I don't care, somewhere far (away)`,
  };

  for (const [key, lyrics] of Object.entries(mockDatabase)) {
    const [mockTitle, mockArtist] = key.split('|');

    const titleMatch =
      titleLower.includes(mockTitle) ||
      mockTitle.includes(titleLower);

    const artistMatch =
      artistLower.includes(mockArtist) ||
      mockArtist.includes(artistLower);

    if (titleMatch && artistMatch) {
      return lyrics;
    }
  }

  return null;
}

// Adiciona listeners de clique aos cards de mÃºsica
function setupLyricsModalTriggers() {
  document.querySelectorAll('.card').forEach(card => {
    // Evita duplicar listeners se o card jÃ¡ foi populado dinamicamente
    if (card.dataset.hasListener) return;
    
    card.addEventListener('click', () => {
      if (carouselIsDragging) return;

      const subtitle = card.querySelector('.card-subtitle')?.textContent || '';
      const parts = subtitle.split(' - ');

      openLyricsModal({
        id: card.dataset.songId || null,
        audioFile: card.getAttribute('data-audio-file') || null,
        title: card.querySelector('.card-title')?.textContent || 'MÃºsica Desconhecida',
        artist: parts[0] || 'Artista Desconhecido',
        album: parts[1] || 'Ãlbum Desconhecido',
        coverUrl: card.querySelector('.card-image img')?.src || ''
      });
    });
    card.dataset.hasListener = "true";
  });
}

closeLyricsBtn?.addEventListener('click', closeLyricsModal);
closeLyricsOverlay?.addEventListener('click', closeLyricsModal);

window.addEventListener('keydown', (event) => {
  if (event.key === 'Escape' && lyricsModal?.classList.contains('active')) {
    closeLyricsModal();
    event.stopPropagation();
  }
});

// Adiciona listeners para os itens de recomendaÃ§Ã£o na aba flutuante
function setupRecommendationTriggers() {
  document.querySelectorAll('.recommendation-item').forEach(item => {
    item.style.cursor = 'pointer';
    item.addEventListener('click', () => {
      const text = item.textContent.trim();
      const parts = text.split(' - ');
      if (parts.length < 2) return;

      const title = parts[0].trim();
      const artistName = parts[1].trim();
      
      // Mapeia o nome do artista para o ID usado na URL da pÃ¡gina do artista
      const artistMap = {
        'kanye west': 'kanye',
        'ghost': 'ghost',
        'mitski': 'mitski',
        'slipknot': 'slipknot',
        'deftones': 'deftones'
      };

      const artistId = artistMap[artistName.toLowerCase()];
      if (artistId) {
        // Navega para a pÃ¡gina do artista passando o tÃ­tulo da mÃºsica na URL
        window.location.href = `main.html?id=${artistId}&song=${encodeURIComponent(title)}`;
      }
    });
  });
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => {
    setupLyricsModalTriggers();
    setupRecommendationTriggers();
  });
} else {
  setupLyricsModalTriggers();
  setupRecommendationTriggers();
}


// --- Conteúdo mesclado de artista.js ---
// artista.js - Logica para preenchimento dinÃ¢mico da pÃ¡gina do artista

const artistData = {
  kanye: {
    name: "Kanye West",
    listeners: "68.2M Ouvintes mensais",
    bannerImg: "img/bannerkanye.jpeg",
    songs: [
      { title: "Wolves", subtitle: "The Life of Pablo", cover: "img/lifeofpablo.jpeg", anim: "img/kanyewolves.gif", audioFile: "Wolves.mp3" },
      { title: "Runaway", subtitle: "My Beautiful Dark Twisted Fantasy", cover: "img/twistedfantasy.jfif", anim: "img/runawaygif.gif", audioFile: "Runaway Album Version Edited.mp3" },
      { title: "Stronger", subtitle: "Graduation", cover: "img/graduation.jpg", anim: "img/strongergif.gif", audioFile: "" }
    ]
  },
  ghost: {
    name: "Ghost",
    listeners: "9.5M Ouvintes mensais",
    bannerImg: "img/bannerghost.jpeg",
    songs: [
      { title: "Square Hammer", subtitle: "Ceremony and Devotion", cover: "img/ceremony.jpg", anim: "img/terzo.gif", audioFile: "Square Hammer.mp3" },
      { title: "Satanized", subtitle: "SkeletÃ¡", cover: "img/skeleta.jpeg", anim: "img/perpetua.gif", audioFile: "Ghost Satanized Official Music Video.mp3" },
      { title: "Lachryma", subtitle: "SkeletÃ¡", cover: "img/skeleta.jpeg", anim: "img/lachryma.webp", audioFile: "Lachryma.mp3" },
      { title: "Mary On A Cross", subtitle: "Seven Inches of Satanic Panic", cover: "img/seveninches.jpeg", anim: "img/maryonacross.gif", audioFile: "Ghost Mary On A Cross Official Audio.mp3" }
    ]
  },
  mitski: {
    name: "Mitski",
    listeners: "1.2M Ouvintes mensais",
    bannerImg: "img/mitskibanner.jpg",
    songs: [
      { title: "I'll Die For You", subtitle: "Nothing's About to Happen to Me", cover: "img/mitski.jpg", anim: "img/mitskigif.gif", audioFile: "Mitski I ll Change for You.mp3" },
      { title: "Washing Machine Heart", subtitle: "Be The Cowboy", cover: "img/bethecowboy.jpg", anim: "img/machineheart.gif", audioFile: "Washing Machine Heart.mp3" }
    ]
  },
  slipknot: {
    name: "Slipknot",
    listeners: "10.1M Ouvintes mensais",
    bannerImg: "img/Slipknotbanner.jpg",
    songs: [
      { title: "Snuff", subtitle: "All Hope Is Gone", cover: "img/Slipknot.jpg", anim: "img/Slipknotgif.gif", audioFile: "Snuff 2012 Remaster.mp3" },
      { title: "People = Shit", subtitle: "IOWA", cover: "img/iowa.jpg", anim: "img/people.gif", audioFile: "People Shit.mp3" }
    ]
  },
  deftones: {
    name: "Deftones",
    listeners: "4.2M Ouvintes mensais",
    bannerImg: "img/deftonesbanner.jpg",
    songs: [
      { title: "Diamond Eyes", subtitle: "Diamond Eyes", cover: "img/deftones.jfif", anim: "img/deftonesgif.gif", audioFile: "Deftones Diamond Eyes Official Lyric Video.mp3" },
      { title: "Be Quiet and Drive", subtitle: "Around The Fur", cover: "img/aroundthefur.jpg", anim: "img/bequiet.gif", audioFile: "Be Quiet and Drive.mp3" }
    ]
  }
};

// Carrega a visao de artista com base nos parametros da URL.
function loadArtist() {
  const homePageView = document.getElementById('homePageView');
  const artistPageView = document.getElementById('artistPageView');
  const artistNameEl = document.getElementById('artistName');
  const artistListenersEl = document.getElementById('artistListeners');
  const heroSection = document.getElementById('artistHero');
  const songsContainer = document.getElementById('artistSongs');

  // Se a estrutura de artista não estiver na página atual, não executa.
  if (!artistNameEl || !artistListenersEl || !heroSection || !songsContainer) {
    return;
  }

  const urlParams = new URLSearchParams(window.location.search);
  const artistId = urlParams.get('id');

  const shouldShowArtistView = Boolean(artistId);
  if (homePageView) {
    homePageView.style.display = shouldShowArtistView ? 'none' : 'block';
  }
  if (artistPageView) {
    artistPageView.style.display = shouldShowArtistView ? 'block' : 'none';
  }

  if (!artistId) {
    return;
  }

  const data = artistData[artistId];
  if (!data) {
    artistNameEl.textContent = "Artista não encontrado";
    artistListenersEl.textContent = "Verifique o link e tente novamente.";
    songsContainer.innerHTML = '';
    return;
  }

  // Preencher nome e ouvintes
  artistNameEl.textContent = data.name;
  artistListenersEl.textContent = data.listeners;

  // Ajustar banner
  if (data.bannerImg) {
    heroSection.style.backgroundImage = `linear-gradient(rgba(0, 0, 0, 0.2), rgba(0, 0, 0, 0.8)), url('${data.bannerImg}')`;
    heroSection.classList.remove('no-banner');
  } else {
    // Se nÃ£o tiver banner, usamos uma imagem neutra ou um gradiente verde escuro.
    heroSection.classList.add('no-banner');
  }

  // Preencher mÃºsicas
  songsContainer.innerHTML = ''; // Limpa

  data.songs.forEach(song => {
    // Criando o elemento de mÃºsica usando os mesmos cards do main
    const card = document.createElement('div');
    card.className = 'card';
    card.dataset.songId = song.title.toLowerCase().replace(/ /g, '-');

    let imageContent = `<img class="static" src="${song.cover}" alt="${song.title}">`;
    if (song.anim) {
       imageContent += `<img class="gif" src="${song.anim}" alt="Animado">`;
    }

    card.innerHTML = `
      <div class="card-image">
        ${imageContent}
      </div>
      <p class="card-title">${song.title}</p>
      <p class="card-subtitle">${song.subtitle}</p>
    `;

    
    card.addEventListener('click', () => {
      if (typeof openLyricsModal === 'function') {
        openLyricsModal({
          id: card.dataset.songId,
          title: song.title,
          artist: data.name,
          album: song.subtitle,
          coverUrl: song.cover,
          audioFile: song.audioFile
        });
      }
    });

    songsContainer.appendChild(card);
  });

  // --- FUNCIONALIDADE DO BOTÃƒO SEGUIR ---
  const followBtn = document.getElementById('followBtn');
  if (followBtn) {
    followBtn.addEventListener('click', () => {
      const isFollowing = followBtn.textContent === 'Seguindo';
      
      if (isFollowing) {
        followBtn.textContent = 'Seguir';
        followBtn.classList.remove('following');
      } else {
        followBtn.textContent = 'Seguindo';
        followBtn.classList.add('following');
      }
    });
  }

  // --- NOVIDADE: Abre a letra automaticamente se vier do redirecionamento de recomendaÃ§Ãµes ---
  const songTitleToOpen = urlParams.get('song');
  if (songTitleToOpen) {
    const songDataToOpen = data.songs.find(s => s.title.toLowerCase() === songTitleToOpen.toLowerCase());
    if (songDataToOpen) {
      // Pequeno delay para garantir que o modal de letra (em letras.js) esteja pronto
      setTimeout(() => {
        if (typeof openLyricsModal === 'function') {
          openLyricsModal({
            id: songDataToOpen.title.toLowerCase().replace(/ /g, '-'),
            title: songDataToOpen.title,
            artist: data.name,
            album: songDataToOpen.subtitle,
            coverUrl: songDataToOpen.cover,
            audioFile: songDataToOpen.audioFile
          });
        }
      }, 500);
    }
  }
}


// Inicia o carregamento assim que o script Ã© lido
document.addEventListener('DOMContentLoaded', loadArtist);
