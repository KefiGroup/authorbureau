import { useEffect } from "react";

interface DocumentMetaOptions {
  title: string;
  description?: string;
  ogTitle?: string;
  ogDescription?: string;
  ogImage?: string;
  ogUrl?: string;
  twitterCard?: "summary" | "summary_large_image";
  jsonLd?: Record<string, unknown>;
}

function setMetaTag(property: string, content: string, isOg = false) {
  const attr = isOg ? "property" : "name";
  let el = document.querySelector(`meta[${attr}="${property}"]`) as HTMLMetaElement | null;
  if (!el) {
    el = document.createElement("meta");
    el.setAttribute(attr, property);
    document.head.appendChild(el);
  }
  el.setAttribute("content", content);
}

function removeMetaTag(property: string, isOg = false) {
  const attr = isOg ? "property" : "name";
  const el = document.querySelector(`meta[${attr}="${property}"]`);
  if (el) el.remove();
}

const JSON_LD_ID = "document-meta-jsonld";

export function useDocumentMeta(options: DocumentMetaOptions) {
  useEffect(() => {
    const prevTitle = document.title;
    document.title = options.title;

    if (options.description) setMetaTag("description", options.description);
    if (options.ogTitle) setMetaTag("og:title", options.ogTitle, true);
    if (options.ogDescription) setMetaTag("og:description", options.ogDescription, true);
    if (options.ogImage) setMetaTag("og:image", options.ogImage, true);
    if (options.ogUrl) setMetaTag("og:url", options.ogUrl, true);
    setMetaTag("og:type", "website", true);
    if (options.twitterCard) setMetaTag("twitter:card", options.twitterCard);

    // JSON-LD
    let scriptEl = document.getElementById(JSON_LD_ID) as HTMLScriptElement | null;
    if (options.jsonLd) {
      if (!scriptEl) {
        scriptEl = document.createElement("script");
        scriptEl.id = JSON_LD_ID;
        scriptEl.type = "application/ld+json";
        document.head.appendChild(scriptEl);
      }
      scriptEl.textContent = JSON.stringify(options.jsonLd);
    }

    return () => {
      document.title = prevTitle;
      removeMetaTag("description");
      removeMetaTag("og:title", true);
      removeMetaTag("og:description", true);
      removeMetaTag("og:image", true);
      removeMetaTag("og:url", true);
      removeMetaTag("og:type", true);
      removeMetaTag("twitter:card");
      const el = document.getElementById(JSON_LD_ID);
      if (el) el.remove();
    };
  }, [options.title, options.description, options.ogImage, options.ogUrl]);
}
