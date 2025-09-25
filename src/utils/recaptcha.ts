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