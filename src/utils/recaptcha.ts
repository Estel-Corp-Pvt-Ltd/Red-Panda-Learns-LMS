export const loadRecaptcha = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    // already loaded
    if ((window as any).grecaptcha) {
      resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = `https://www.google.com/recaptcha/api.js?render=${import.meta.env.VITE_RECAPTCHA_SITE_KEY}`;
    script.async = true;
    script.defer = true;

    script.onload = () => resolve();
    script.onerror = () => reject("Failed to load reCAPTCHA");

    document.body.appendChild(script);
  });
};


export const getRecaptchaToken = async (action = "submit") => {
  return new Promise<string>((resolve, reject) => {
    const grecaptcha = (window as any).grecaptcha;
    if (!grecaptcha) {
      reject("⚠️ reCAPTCHA not loaded");
      return;
    }
    grecaptcha.ready(() => {
      grecaptcha
        .execute(import.meta.env.VITE_RECAPTCHA_SITE_KEY, { action })
        .then(resolve)
        .catch(reject);
    });
  });
};

export const isLowEndDevice = () => {
  const hardwareConcurrency = navigator.hardwareConcurrency || 1;
  const memory = (navigator as any)?.deviceMemory || 4;
  return hardwareConcurrency <= 2 || memory <= 2;
}
