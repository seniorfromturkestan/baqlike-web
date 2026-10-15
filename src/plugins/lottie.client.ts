import Vue3LottiePlugin, { Vue3Lottie } from 'vue3-lottie';

export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(Vue3LottiePlugin, { name: 'Vue3Lottie' });
  nuxtApp.vueApp.component('Vue3Lottie', Vue3Lottie);
});
