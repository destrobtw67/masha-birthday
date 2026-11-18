(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  const finePointer = window.matchMedia("(pointer: fine)").matches;
  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));
  const rand = (min, max) => min + Math.random() * (max - min);
  const pick = (items) => items[Math.floor(Math.random() * items.length)];

  /* ---------- уведомления ---------- */

  const toastEl = $("#toast");
  let toastTimer = 0;

  function toast(message) {
    if (!toastEl) return;
    toastEl.textContent = message;
    toastEl.classList.add("show");
    window.clearTimeout(toastTimer);
    toastTimer = window.setTimeout(() => toastEl.classList.remove("show"), 2800);
  }

  /* ---------- шапка и прогресс ---------- */

  const head = $("#head");
  const progress = $("#progress");
  let scrollQueued = false;

  function updateScrollUI() {
    scrollQueued = false;
    const y = window.scrollY;
    if (head) head.classList.toggle("scrolled", y > 24);
    if (progress) {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.style.transform = `scaleX(${max > 0 ? clamp(y / max, 0, 1) : 0})`;
    }
  }

  function queueScrollUI() {
    if (scrollQueued) return;
    scrollQueued = true;
    requestAnimationFrame(updateScrollUI);
  }

  window.addEventListener("scroll", queueScrollUI, { passive: true });
  window.addEventListener("resize", queueScrollUI);
  updateScrollUI();

  /* ---------- появление секций ---------- */

  const revealItems = $$(".reveal");

  if (!reduceMotion && "IntersectionObserver" in window) {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (!entry.isIntersecting) return;
          entry.target.classList.add("in");
          observer.unobserve(entry.target);
        });
      },
      { rootMargin: "0px 0px -8% 0px", threshold: 0.08 }
    );
    revealItems.forEach((item) => observer.observe(item));
  } else {
    revealItems.forEach((item) => item.classList.add("in"));
  }

  // первый экран показываем сразу, не дожидаясь наблюдателя
  const heroRevealItems = $$(".hero .reveal");
  window.setTimeout(() => {
    heroRevealItems.forEach((item) => item.classList.add("in"));
  }, 120);

  /* ---------- сердечки в hero ---------- */

  const heroHearts = $("#heroHearts");

  if (heroHearts && !reduceMotion) {
    const glyphs = ["♥", "✦", "✧", "·"];
    const colors = ["rgba(255,143,189,.75)", "rgba(255,210,125,.7)", "rgba(183,155,255,.7)"];

    for (let i = 0; i < 9; i += 1) {
      const heart = document.createElement("span");
      heart.textContent = pick(glyphs);
      heart.style.left = `${rand(4, 96)}%`;
      heart.style.fontSize = `${rand(9, 20)}px`;
      heart.style.color = pick(colors);
      heart.style.setProperty("--o", rand(0.15, 0.4).toFixed(2));
      heart.style.setProperty("--dx", `${rand(-80, 80)}px`);
      heart.style.setProperty("--rot", `${rand(-90, 90)}deg`);
      heart.style.animationDuration = `${rand(13, 24)}s`;
      heart.style.animationDelay = `${rand(-24, 0)}s`;
      heroHearts.appendChild(heart);
    }
  }

  /* ---------- звёздное небо ---------- */

  const starCanvas = $("#stars");

  if (starCanvas) {
    const starCtx = starCanvas.getContext("2d");
    let stars = [];
    let width = 0;
    let height = 0;
    let shoot = null;
    let nextShoot = 0;
    let starRaf = 0;

    function sizeStars() {
      const dpr = Math.min(2, window.devicePixelRatio || 1);
      width = window.innerWidth;
      height = window.innerHeight;
      starCanvas.width = Math.floor(width * dpr);
      starCanvas.height = Math.floor(height * dpr);
      starCtx.setTransform(dpr, 0, 0, dpr, 0, 0);

      const count = Math.round(clamp((width * height) / 11500, 55, 170));
      stars = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        r: rand(0.3, 1.4),
        a: rand(0.18, 0.75),
        phase: Math.random() * Math.PI * 2,
        speed: rand(0.4, 1.1),
        bright: Math.random() > 0.92
      }));

      nextShoot = performance.now() + rand(3500, 8000);
      if (reduceMotion) drawStars(0);
    }

    function drawStars(now) {
      starCtx.clearRect(0, 0, width, height);

      stars.forEach((star) => {
        const twinkle = reduceMotion ? 1 : 0.65 + Math.sin(now * 0.0012 * star.speed + star.phase) * 0.35;
        const alpha = clamp(star.a * twinkle, 0, 1);

        starCtx.beginPath();
        starCtx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
        starCtx.fillStyle = star.bright
          ? `rgba(255, 224, 196, ${alpha})`
          : `rgba(255, 244, 252, ${alpha})`;
        starCtx.fill();

        if (star.bright) {
          const radius = star.r * 3.4;
          const glow = starCtx.createRadialGradient(star.x, star.y, 0, star.x, star.y, radius);
          glow.addColorStop(0, `rgba(255, 214, 170, ${alpha * 0.22})`);
          glow.addColorStop(1, "rgba(255, 214, 170, 0)");
          starCtx.beginPath();
          starCtx.arc(star.x, star.y, radius, 0, Math.PI * 2);
          starCtx.fillStyle = glow;
          starCtx.fill();
        }
      });

      if (reduceMotion) return;

      if (!shoot && now > nextShoot) {
        shoot = {
          x: rand(width * 0.15, width * 0.85),
          y: rand(0, height * 0.35),
          vx: rand(4, 7),
          vy: rand(1.8, 3.2),
          life: 1
        };
        nextShoot = now + rand(9000, 16000);
      }

      if (shoot) {
        const tail = 20;
        const trail = starCtx.createLinearGradient(
          shoot.x,
          shoot.y,
          shoot.x - shoot.vx * tail,
          shoot.y - shoot.vy * tail
        );
        trail.addColorStop(0, `rgba(255, 240, 250, ${0.8 * shoot.life})`);
        trail.addColorStop(1, "rgba(255, 240, 250, 0)");
        starCtx.strokeStyle = trail;
        starCtx.lineWidth = 1.4;
        starCtx.beginPath();
        starCtx.moveTo(shoot.x, shoot.y);
        starCtx.lineTo(shoot.x - shoot.vx * tail, shoot.y - shoot.vy * tail);
        starCtx.stroke();

        shoot.x += shoot.vx;
        shoot.y += shoot.vy;
        shoot.life -= 0.012;

        if (shoot.life <= 0 || shoot.x > width + 80 || shoot.y > height + 80) {
          shoot = null;
        }
      }
    }

    function starLoop(now) {
      drawStars(now);
      starRaf = requestAnimationFrame(starLoop);
    }

    sizeStars();
    if (!reduceMotion) starRaf = requestAnimationFrame(starLoop);

    let resizeTimer = 0;
    window.addEventListener("resize", () => {
      window.clearTimeout(resizeTimer);
      resizeTimer = window.setTimeout(() => {
        cancelAnimationFrame(starRaf);
        starRaf = 0;
        sizeStars();
        if (!reduceMotion) starRaf = requestAnimationFrame(starLoop);
      }, 150);
    });

    document.addEventListener("visibilitychange", () => {
      if (reduceMotion) return;
      if (document.hidden) {
        cancelAnimationFrame(starRaf);
        starRaf = 0;
      } else if (!starRaf) {
        starRaf = requestAnimationFrame(starLoop);
      }
    });
  }

  /* ---------- конфетти ---------- */

  const confettiCanvas = $("#confetti");
  let confettiCtx = null;
  let confettiWidth = 0;
  let confettiHeight = 0;
  let confettiParts = [];
  let confettiRaf = 0;
  const confettiColors = ["#ff8fbd", "#ffd27d", "#b79bff", "#ff5d8f", "#fff2f7"];

  function sizeConfetti() {
    if (!confettiCanvas) return;
    const dpr = Math.min(2, window.devicePixelRatio || 1);
    confettiWidth = window.innerWidth;
    confettiHeight = window.innerHeight;
    confettiCanvas.width = Math.floor(confettiWidth * dpr);
    confettiCanvas.height = Math.floor(confettiHeight * dpr);
    if (confettiCtx) confettiCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
  }

  function drawHeart(ctx, size) {
    const s = size / 16;
    ctx.beginPath();
    ctx.moveTo(0, 5 * s);
    ctx.bezierCurveTo(-10 * s, -3 * s, -5 * s, -10 * s, 0, -4 * s);
    ctx.bezierCurveTo(5 * s, -10 * s, 10 * s, -3 * s, 0, 5 * s);
    ctx.closePath();
    ctx.fill();
  }

  function spawnConfetti(x, y, count = 80, options = {}) {
    if (!confettiCtx || reduceMotion) return;

    const hearts = Boolean(options.hearts);
    const power = options.power || 1;

    for (let i = 0; i < count; i += 1) {
      const angle = rand(0, Math.PI * 2);
      const speed = rand(2.2, 8.5) * power;
      const roll = Math.random();
      const shape = hearts && roll < 0.5 ? "heart" : roll < 0.64 ? "circle" : "rect";

      confettiParts.push({
        x,
        y,
        vx: Math.cos(angle) * speed,
        vy: Math.sin(angle) * speed - rand(1, 4.5) * power,
        gravity: rand(0.16, 0.26),
        drag: rand(0.985, 0.995),
        w: rand(4, 9),
        h: rand(5, 12),
        rot: rand(0, Math.PI * 2),
        vr: rand(-0.22, 0.22),
        color: pick(confettiColors),
        shape,
        life: rand(80, 170),
        wobble: rand(0, Math.PI * 2),
        wobbleSpeed: rand(0.04, 0.1)
      });
    }

    if (!confettiRaf) confettiRaf = requestAnimationFrame(confettiLoop);
  }

  function confettiLoop() {
    if (!confettiCtx) return;
    confettiCtx.clearRect(0, 0, confettiWidth, confettiHeight);

    for (let i = confettiParts.length - 1; i >= 0; i -= 1) {
      const part = confettiParts[i];
      part.life -= 1;
      part.vy += part.gravity;
      part.vx *= part.drag;
      part.vy *= part.drag;
      part.wobble += part.wobbleSpeed;
      part.x += part.vx + Math.sin(part.wobble) * 0.6;
      part.y += part.vy;
      part.rot += part.vr;

      if (
        part.life <= 0 ||
        part.y > confettiHeight + 60 ||
        part.x < -100 ||
        part.x > confettiWidth + 100
      ) {
        confettiParts.splice(i, 1);
        continue;
      }

      const alpha = clamp(part.life / 45, 0, 1);
      confettiCtx.save();
      confettiCtx.globalAlpha = alpha;
      confettiCtx.translate(part.x, part.y);
      confettiCtx.rotate(part.rot);
      confettiCtx.fillStyle = part.color;

      if (part.shape === "circle") {
        confettiCtx.beginPath();
        confettiCtx.arc(0, 0, part.w / 2, 0, Math.PI * 2);
        confettiCtx.fill();
      } else if (part.shape === "heart") {
        drawHeart(confettiCtx, part.w * 1.1);
      } else {
        confettiCtx.fillRect(-part.w / 2, -part.h / 2, part.w, part.h);
      }

      confettiCtx.restore();
    }

    if (confettiParts.length) {
      confettiRaf = requestAnimationFrame(confettiLoop);
    } else {
      confettiRaf = 0;
      confettiCtx.clearRect(0, 0, confettiWidth, confettiHeight);
    }
  }

  if (confettiCanvas) {
    confettiCtx = confettiCanvas.getContext("2d");
    sizeConfetti();
    window.addEventListener("resize", sizeConfetti);
  }

  /* ---------- фото в поляроидах ---------- */

  $$(".polaroid img").forEach((img) => {
    const frame = img.closest(".polaroid");
    const original = img.getAttribute("src") || "photos/1.jpg";
    const base = original.replace(/\.[^/.]+$/, "");
    const extensions = ["jpeg", "png", "webp"];
    let attempt = 0;

    const fail = () => {
      if (frame) frame.classList.add("no-photo");
      img.remove();
    };

    const photoReady = () => {
      if (frame) frame.classList.remove("is-loading");
    };

    const nextSource = () => {
      if (attempt >= extensions.length) {
        fail();
        return;
      }
      if (frame) frame.classList.add("is-loading");
      img.src = `${base}.${extensions[attempt]}`;
      attempt += 1;
    };

    img.addEventListener("load", photoReady);
    img.addEventListener("error", nextSource);

    if (frame) frame.classList.add("is-loading");
    if (img.complete) {
      if (img.naturalWidth > 0) photoReady();
      else nextSource();
    }
  });

  /* ---------- фото крупно ---------- */

  const lightbox = $("#lightbox");
  const lightboxImg = $("#lightboxImg");
  const lightboxCaption = $("#lightboxCaption");
  const lightboxClose = $("#lightboxClose");
  let lightboxTrigger = null;
  let lightboxIsOpen = false;
  let lightboxTimer = 0;

  function openLightbox(trigger) {
    if (!lightbox || !lightboxImg || lightboxIsOpen) return;
    const photo = trigger.querySelector("img");
    if (!photo) return;

    lightboxTrigger = trigger;
    lightboxImg.src = photo.currentSrc || photo.src;
    lightboxImg.alt = photo.alt || "";
    lightboxImg.classList.add("is-loading");
    if (lightboxCaption) {
      const caption = trigger.closest(".polaroid")?.querySelector("figcaption");
      lightboxCaption.textContent = caption ? caption.textContent.trim() : "";
    }

    lightboxIsOpen = true;
    lightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    requestAnimationFrame(() => lightbox.classList.add("open"));
    if (lightboxClose) lightboxClose.focus({ preventScroll: true });
  }

  function closeLightbox() {
    if (!lightbox || !lightboxIsOpen) return;
    lightboxIsOpen = false;
    lightbox.classList.remove("open");
    document.body.classList.remove("lightbox-open");
    window.clearTimeout(lightboxTimer);

    const finish = () => {
      if (lightboxIsOpen) return;
      lightbox.hidden = true;
      lightboxImg.src = "";
      if (lightboxTrigger) {
        lightboxTrigger.focus({ preventScroll: true });
        lightboxTrigger = null;
      }
    };

    if (reduceMotion) finish();
    else lightboxTimer = window.setTimeout(finish, 380);
  }

  $$(".polaroid").forEach((frame) => {
    const photo = frame.querySelector(".polaroid__photo");
    if (!photo) return;
    photo.setAttribute("role", "button");
    photo.setAttribute("tabindex", "0");
    photo.setAttribute("aria-label", "Смотреть фотографию крупно");
    photo.addEventListener("click", () => openLightbox(photo));
    photo.addEventListener("keydown", (event) => {
      if (event.key !== "Enter" && event.key !== " ") return;
      event.preventDefault();
      openLightbox(photo);
    });
  });

  if (lightbox) {
    lightbox.addEventListener("click", (event) => {
      if (!event.target.closest(".lightbox__figure")) closeLightbox();
    });
  }
  if (lightboxClose) lightboxClose.addEventListener("click", closeLightbox);
  if (lightboxImg) lightboxImg.addEventListener("load", () => lightboxImg.classList.remove("is-loading"));

  /* ---------- фото в кнопке «на главную» ---------- */

  const brandMark = $(".brand__mark");
  const brandAva = $(".brand__ava");

  if (brandMark && brandAva) {
    const avaOriginal = brandAva.getAttribute("src") || "photos/ava.jpg";
    const avaBase = avaOriginal.replace(/\.[^/.]+$/, "");
    const avaExtensions = ["jpeg", "png", "webp"];
    let avaAttempt = 0;

    const avaShow = () => {
      brandAva.hidden = false;
      brandMark.classList.add("has-ava");
    };

    const avaNext = () => {
      if (avaAttempt >= avaExtensions.length) {
        brandAva.remove();
        return;
      }
      brandAva.src = `${avaBase}.${avaExtensions[avaAttempt]}`;
      avaAttempt += 1;
    };

    brandAva.addEventListener("load", avaShow);
    brandAva.addEventListener("error", avaNext);

    if (brandAva.complete && brandAva.naturalWidth > 0) avaShow();
    else if (brandAva.complete && brandAva.naturalWidth === 0) avaNext();
  }

  /* ---------- свечи ---------- */

  const cakeSvg = $("#cakeSvg");
  const blowBtn = $("#blowBtn");
  const blowLabel = $("#blowLabel");
  const cakeNote = $("#cakeNote");
  const candles = cakeSvg ? $$(".candle", cakeSvg) : [];
  let cakeOut = false;
  let candleTimers = [];

  if (cakeSvg && blowBtn && cakeNote && candles.length) {
    blowBtn.addEventListener("click", () => {
      candleTimers.forEach((id) => window.clearTimeout(id));
      candleTimers = [];
      cakeOut = !cakeOut;

      if (!cakeOut) {
        candles.forEach((candle) => candle.classList.remove("out"));
        if (blowLabel) blowLabel.textContent = "Задуть свечи";
        cakeNote.textContent = "Пять из пяти свечей горят. Пора загадывать.";
        cakeNote.classList.remove("is-done");
        return;
      }

      candles.forEach((candle, index) => {
        const id = window.setTimeout(() => candle.classList.add("out"), 60 + index * 110);
        candleTimers.push(id);
      });

      if (blowLabel) blowLabel.textContent = "Загадать ещё раз";
      cakeNote.textContent = "Желание загадано. Вселенная в курсе — я прослежу. ✨";
      cakeNote.classList.add("is-done");

      const box = cakeSvg.getBoundingClientRect();
      window.setTimeout(() => {
        spawnConfetti(
          box.left + box.width / 2,
          Math.max(box.top + box.height * 0.22, 110),
          110,
          { hearts: true, power: 1.1 }
        );
      }, 650);
    });
  }

  /* ---------- письмо ---------- */

  const letterScene = $("#letterScene");
  const envelope = $("#envelope");
  const envelopeHint = $(".envelope__hint");
  const letterCard = $("#letterCard");
  const letterClose = $("#letterClose");
  const letterTitle = $("#letterTitle");
  const letterLock = $("#letterLock");
  const letterLockClose = $("#letterLockClose");
  const letterForm = $("#letterForm");
  const letterPassword = $("#letterPassword");
  const letterLockNote = $("#letterLockNote");
  const letterUnlockKey = "masha-letter-unlocked";
  const letterPasswordWords = ["клевер", "klever", "clover"];
  const lockNoteDefault = "Без пароля не откроется.";
  const lockNoteError = "Не подходит. Пароль лежит на карточке в коробочке с подарком.";
  let letterIsOpen = false;
  let letterTimer = 0;
  let lockIsOpen = false;
  let lockTimer = 0;
  let letterUnlocked = false;

  try {
    letterUnlocked = window.localStorage.getItem(letterUnlockKey) === "1";
  } catch (error) {
    letterUnlocked = false;
  }

  function paintEnvelopeState() {
    if (!envelope) return;
    if (envelopeHint) {
      envelopeHint.textContent = letterUnlocked
        ? "нажми, чтобы открыть"
        : "нажми, чтобы ввести пароль";
    }
    envelope.setAttribute(
      "aria-label",
      letterUnlocked ? "Открыть письмо" : "Открыть письмо — понадобится пароль"
    );
  }

  function normalizePassword(value) {
    return value
      .toLowerCase()
      .replace(/ё/g, "е")
      .replace(/[^a-zа-я0-9]/g, "");
  }

  function openLetter() {
    if (!letterScene || !letterCard || !envelope || letterIsOpen) return;
    letterIsOpen = true;

    letterCard.hidden = false;
    envelope.classList.add("open");
    envelope.setAttribute("aria-expanded", "true");
    void letterCard.offsetWidth;

    requestAnimationFrame(() => {
      letterScene.classList.add("open");
      letterCard.scrollIntoView({
        behavior: reduceMotion ? "auto" : "smooth",
        block: "center"
      });
    });

    window.clearTimeout(letterTimer);
    letterTimer = window.setTimeout(() => {
      if (letterTitle) letterTitle.focus({ preventScroll: true });
    }, 700);
  }

  function closeLetter() {
    if (!letterScene || !letterCard || !envelope || !letterIsOpen) return;
    letterIsOpen = false;

    letterScene.classList.remove("open");
    envelope.classList.remove("open");
    envelope.setAttribute("aria-expanded", "false");
    window.clearTimeout(letterTimer);

    letterTimer = window.setTimeout(() => {
      letterCard.hidden = true;
      envelope.focus({ preventScroll: true });
    }, 650);
  }

  function resetLockNote() {
    if (!letterLockNote) return;
    letterLockNote.textContent = lockNoteDefault;
    letterLockNote.classList.remove("is-error");
  }

  function openLock() {
    if (!letterScene || !letterLock || !envelope || lockIsOpen || letterIsOpen) return;
    lockIsOpen = true;

    resetLockNote();
    letterLock.hidden = false;
    envelope.setAttribute("aria-expanded", "true");
    requestAnimationFrame(() => {
      letterScene.classList.add("locked");
    });

    window.clearTimeout(lockTimer);
    lockTimer = window.setTimeout(() => {
      if (!lockIsOpen) return;
      if (letterPassword) letterPassword.focus({ preventScroll: true });
    }, reduceMotion ? 0 : 380);
  }

  function closeLock(returnFocus = true) {
    if (!letterScene || !letterLock || !envelope || !lockIsOpen) return;
    lockIsOpen = false;

    letterScene.classList.remove("locked");
    envelope.setAttribute("aria-expanded", "false");
    if (letterPassword) {
      letterPassword.value = "";
      letterPassword.removeAttribute("aria-invalid");
    }
    resetLockNote();

    window.clearTimeout(lockTimer);
    if (reduceMotion) {
      letterLock.hidden = true;
      if (returnFocus) envelope.focus({ preventScroll: true });
      return;
    }

    lockTimer = window.setTimeout(() => {
      if (lockIsOpen) return;
      letterLock.hidden = true;
      if (returnFocus) envelope.focus({ preventScroll: true });
    }, 360);
  }

  function unlockLetter() {
    letterUnlocked = true;
    try {
      window.localStorage.setItem(letterUnlockKey, "1");
    } catch (error) {
      /* приватный режим — просто живём без сохранения */
    }
    paintEnvelopeState();

    lockIsOpen = false;
    if (letterLock) letterLock.hidden = true;
    if (letterScene) letterScene.classList.remove("locked");
    if (letterForm) letterForm.reset();
    if (letterPassword) letterPassword.removeAttribute("aria-invalid");
    resetLockNote();
    openLetter();
    toast("Пароль верный. Письмо открыто ♥");
  }

  if (envelope) {
    paintEnvelopeState();
    envelope.addEventListener("click", () => {
      if (letterUnlocked) openLetter();
      else openLock();
    });
  }

  if (letterClose) letterClose.addEventListener("click", closeLetter);
  if (letterLockClose) letterLockClose.addEventListener("click", () => closeLock(true));

  if (letterForm) {
    letterForm.addEventListener("submit", (event) => {
      event.preventDefault();
      if (!letterPassword) return;

      const value = normalizePassword(letterPassword.value);
      if (!value) {
        if (letterLockNote) {
          letterLockNote.textContent = "Сначала введи пароль.";
          letterLockNote.classList.add("is-error");
        }
        letterPassword.focus();
        return;
      }

      if (letterPasswordWords.includes(value)) {
        unlockLetter();
        return;
      }

      if (letterLockNote) {
        letterLockNote.textContent = lockNoteError;
        letterLockNote.classList.add("is-error");
      }
      letterPassword.setAttribute("aria-invalid", "true");
      letterPassword.focus();
      letterPassword.select();

      if (letterLock) {
        letterLock.classList.remove("shake");
        void letterLock.offsetWidth;
        letterLock.classList.add("shake");
      }
    });

    if (letterPassword) {
      letterPassword.addEventListener("input", () => {
        if (letterPassword.getAttribute("aria-invalid") !== "true") return;
        letterPassword.removeAttribute("aria-invalid");
        resetLockNote();
      });
    }
  }

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    if (lightboxIsOpen) {
      closeLightbox();
      return;
    }
    if (lockIsOpen) closeLock(true);
    else if (letterIsOpen) closeLetter();
  });

  /* ---------- подарок ---------- */

  const giftSection = $("#gift");
  const giftExperience = $("#giftExperience");
  const giftBtn = $("#giftBtn");
  const giftReveal = $("#giftReveal");
  const giftTitle = $("#giftTitle");

  if (giftSection && giftExperience && giftBtn && giftReveal) {
    giftBtn.addEventListener("click", () => {
      giftSection.classList.add("opened");
      giftBtn.disabled = true;
      giftReveal.setAttribute("aria-hidden", "false");

      const box = giftExperience.getBoundingClientRect();
      window.setTimeout(() => {
        spawnConfetti(
          box.left + box.width / 2,
          Math.max(box.top + box.height * 0.34, 100),
          170,
          { hearts: true, power: 1.3 }
        );
        if (giftTitle) giftTitle.focus({ preventScroll: true });
      }, 650);
    });
  }

  /* ---------- обнимашки ---------- */

  const hugLines = [
    "Обнял. Крепко-крепко.",
    "Иди сюда. Ещё раз.",
    "Обнимаю так, что не вырвешься.",
    "Ты — самое тёплое, что со мной случилось.",
    "Люблю. Это не подлежит обжалованию."
  ];

  const hugBtn = $("#hugBtn");

  if (hugBtn) {
    hugBtn.addEventListener("click", () => {
      const box = hugBtn.getBoundingClientRect();
      spawnConfetti(box.left + box.width / 2, box.top + box.height / 2, 70, {
        hearts: true,
        power: 0.85
      });
      toast(pick(hugLines));
    });
  }

  const heartBtn = $("#heartBtn");

  if (heartBtn) {
    heartBtn.addEventListener("click", () => {
      const box = heartBtn.getBoundingClientRect();
      spawnConfetti(box.left + box.width / 2, box.top + box.height / 2, 42, {
        hearts: true,
        power: 0.75
      });
      toast(pick(hugLines));
    });
  }

  /* ---------- музыка ---------- */

  const soundBtn = $("#sound");

  const musicBox = (() => {
    const notes = {
      G4: 392.0,
      A4: 440.0,
      B4: 493.88,
      C5: 523.25,
      D5: 587.33,
      E5: 659.25,
      F5: 698.46,
      G5: 783.99
    };

    const melody = [
      ["G4", 0.5], ["G4", 0.5], ["A4", 1], ["G4", 1], ["C5", 1], ["B4", 2],
      ["G4", 0.5], ["G4", 0.5], ["A4", 1], ["G4", 1], ["D5", 1], ["C5", 2],
      ["G4", 0.5], ["G4", 0.5], ["G5", 1], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2],
      ["F5", 0.5], ["F5", 0.5], ["E5", 1], ["C5", 1], ["D5", 1], ["C5", 2],
      [null, 2]
    ];

    const beat = 0.42;
    let ctx = null;
    let master = null;
    let session = null;
    let playing = false;
    let timer = 0;
    let runId = 0;

    function ensureContext() {
      if (ctx) return true;
      const AudioContextClass = window.AudioContext || window.webkitAudioContext;
      if (!AudioContextClass) return false;

      ctx = new AudioContextClass();
      master = ctx.createGain();
      master.gain.value = 0.55;
      master.connect(ctx.destination);
      return true;
    }

    function createSession() {
      const song = ctx.createGain();
      song.gain.value = 0.0001;
      song.connect(master);

      const send = ctx.createDelay(1);
      send.delayTime.value = 0.28;

      const feedback = ctx.createGain();
      feedback.gain.value = 0.24;

      const wet = ctx.createGain();
      wet.gain.value = 0.22;

      send.connect(feedback);
      feedback.connect(send);
      send.connect(wet);
      wet.connect(master);

      return { song, send };
    }

    function pluck(frequency, when, duration, bus) {
      const gain = ctx.createGain();
      const osc = ctx.createOscillator();
      const overtone = ctx.createOscillator();
      const overtoneGain = ctx.createGain();

      osc.type = "sine";
      osc.frequency.value = frequency;

      overtone.type = "triangle";
      overtone.frequency.value = frequency * 2.004;
      overtoneGain.gain.value = 0.12;

      overtone.connect(overtoneGain);
      overtoneGain.connect(gain);
      osc.connect(gain);

      const release = Math.max(0.6, duration * 1.7);
      gain.gain.setValueAtTime(0.0001, when);
      gain.gain.exponentialRampToValueAtTime(0.22, when + 0.012);
      gain.gain.exponentialRampToValueAtTime(0.0001, when + release);

      gain.connect(bus.song);
      gain.connect(bus.send);

      osc.start(when);
      overtone.start(when);
      osc.stop(when + release + 0.1);
      overtone.stop(when + release + 0.1);
    }

    function schedule(from, bus) {
      let time = from;
      melody.forEach(([name, beats]) => {
        const duration = beats * beat;
        if (name) pluck(notes[name], time, duration, bus);
        time += duration;
      });
      return time;
    }

    function loop(bus, id) {
      if (!playing || id !== runId || !ctx) return;
      const end = schedule(ctx.currentTime + 0.08, bus);
      const wait = Math.max(700, (end - ctx.currentTime) * 1000 + 900);
      timer = window.setTimeout(() => loop(bus, id), wait);
    }

    async function start() {
      if (!ensureContext()) return false;
      try {
        await ctx.resume();
      } catch (error) {
        return false;
      }

      playing = true;
      runId += 1;
      window.clearTimeout(timer);

      session = createSession();
      const now = ctx.currentTime;
      session.song.gain.setValueAtTime(0.0001, now);
      session.song.gain.exponentialRampToValueAtTime(1, now + 0.7);

      loop(session, runId);
      return true;
    }

    function stop() {
      playing = false;
      runId += 1;
      window.clearTimeout(timer);
      if (!ctx) return;

      const oldSession = session;
      session = null;

      if (!oldSession) return;

      const now = ctx.currentTime;
      oldSession.song.gain.cancelScheduledValues(now);
      oldSession.song.gain.setValueAtTime(Math.max(oldSession.song.gain.value, 0.0001), now);
      oldSession.song.gain.exponentialRampToValueAtTime(0.0001, now + 0.3);

      window.setTimeout(() => {
        try {
          oldSession.song.disconnect();
          oldSession.send.disconnect();
        } catch (error) {
          /* уже отключено */
        }
      }, 1200);
    }

    return { start, stop };
  })();

  if (soundBtn) {
    soundBtn.addEventListener("click", async () => {
      const isPlaying = soundBtn.classList.contains("playing");

      if (isPlaying) {
        musicBox.stop();
        soundBtn.classList.remove("playing");
        soundBtn.setAttribute("aria-pressed", "false");
        soundBtn.setAttribute("aria-label", "Музыка — включить");
        soundBtn.setAttribute("title", "Музыка — включить");
        return;
      }

      const started = await musicBox.start();

      if (started) {
        soundBtn.classList.add("playing");
        soundBtn.setAttribute("aria-pressed", "true");
        soundBtn.setAttribute("aria-label", "Музыка — выключить");
        soundBtn.setAttribute("title", "Музыка — выключить");
        toast("Включаю музыку для тебя ♪");
      } else {
        toast("Не получилось включить звук. Попробуй ещё раз ♥");
      }
    });
  }

  /* ---------- искры за курсором ---------- */

  if (finePointer && !reduceMotion) {
    const glyphs = ["✦", "♥", "✧", "·"];
    const colors = ["#ff8fbd", "#ffd27d", "#b79bff"];
    let lastSpark = 0;

    window.addEventListener(
      "pointermove",
      (event) => {
        if (event.pointerType !== "mouse") return;
        const now = performance.now();
        if (now - lastSpark < 70) return;
        lastSpark = now;

        const spark = document.createElement("span");
        spark.className = "cursor-spark";
        spark.textContent = pick(glyphs);
        spark.style.left = `${event.clientX}px`;
        spark.style.top = `${event.clientY}px`;
        spark.style.color = pick(colors);
        spark.style.fontSize = `${rand(9, 15)}px`;
        spark.style.setProperty("--sx", `${rand(-24, 24)}px`);
        spark.style.setProperty("--sy", `${rand(-56, -24)}px`);
        spark.style.setProperty("--sr", `${rand(-90, 90)}deg`);
        document.body.appendChild(spark);

        window.setTimeout(() => spark.remove(), 950);
      },
      { passive: true }
    );
  }
})();
