const overrideCanonicalLink = () => {
    const link = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')!;
    link.setAttribute('href', window.location.origin);
};

overrideCanonicalLink();
