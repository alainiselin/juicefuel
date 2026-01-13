// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
    compatibilityDate: "2025-07-15",
    devtools: { enabled: true },
    modules: ["@nuxtjs/tailwindcss", "@pinia/nuxt"],
    components: [
        {
            path: '~/components',
            pathPrefix: false,
        },
    ],
    runtimeConfig: {
        // Private keys only available on server
        authSecret: process.env.AUTH_SECRET,
        googleClientId: process.env.GOOGLE_CLIENT_ID,
        googleClientSecret: process.env.GOOGLE_CLIENT_SECRET,
        authOrigin: process.env.AUTH_ORIGIN,
        // Public keys exposed to client
        public: {
            authOrigin: process.env.AUTH_ORIGIN,
        },
    },
});

