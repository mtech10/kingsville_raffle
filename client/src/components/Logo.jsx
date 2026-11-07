import { Building2 } from 'lucide-react';
import { useState } from 'react';

/**
 * LOGO PLACEHOLDER
 * Drop your real logo at  client/public/logo.png  (square or wide PNG/SVG-as-PNG, transparent background).
 * Until that file exists, the dashed gold placeholder below is shown automatically.
 */
export default function Logo({ className = '' }) {
  const [hasImage, setHasImage] = useState(true);

  return (
    <a href="/" className={`flex items-center gap-3 ${className}`} aria-label="Kingsville Estate home">
      {hasImage ? (
        <img
          src="/logo.png"
          alt=""
          className="h-10 w-10 rounded-lg object-contain"
          onError={() => setHasImage(false)}
        />
      ) : (
        <span
          className="flex h-10 w-10 items-center justify-center rounded-lg border border-dashed border-gold-400/70 bg-gold-400/10 text-gold-300"
          title="Logo placeholder: add client/public/logo.png"
        >
          <Building2 className="h-5 w-5" aria-hidden="true" />
        </span>
      )}
      <span className="font-display text-xl font-bold leading-none tracking-wide text-white">
        Kingsville <span className="text-gold-300">Estate</span>
      </span>
    </a>
  );
}
