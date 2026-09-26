// next-sitemap configuration
module.exports = {
  siteUrl: process.env.NEXT_PUBLIC_SITE_URL || 'https://example.com',
  generateRobotsTxt: true,
  // optional: alternateRefs based on locales
  alternateRefs: [
    { href: 'https://example.com', hreflang: 'x-default' },
    { href: 'https://example.com/en', hreflang: 'en' },
    { href: 'https://example.com/fr', hreflang: 'fr' },
    { href: 'https://example.com/es', hreflang: 'es' },
  ],
};
