const injectCanonicalLink = () => {
    const link = document.createElement('link');
    link.rel = 'canonical';
    link.href = window.location.origin;
    document.head.appendChild(link);
};

injectCanonicalLink();
