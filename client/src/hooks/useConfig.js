import { useEffect, useState } from 'react';
import { api } from '../lib/api';
import { SITE } from '../lib/site';

/**
 * Loads the registration deadline from the server (single source of truth, also enforced by the API)
 * and measures the offset between the server clock and this device's clock, so the countdown is right
 * even if the visitor's phone clock is wrong.
 */
export function useConfig() {
  const [config, setConfig] = useState({
    registrationDeadline: SITE.registrationDeadline,
    eventDate: SITE.eventDate,
    totalRegistered: null,
    offsetMs: 0,
    loaded: false,
  });

  useEffect(() => {
    const controller = new AbortController();
    const sentAt = Date.now();
    api
      .getConfig(controller.signal)
      .then((c) => {
        const roundTrip = Date.now() - sentAt;
        setConfig({
          registrationDeadline: c.registrationDeadline,
          eventDate: c.eventDate,
          totalRegistered: c.totalRegistered,
          offsetMs: new Date(c.serverTime).getTime() + roundTrip / 2 - Date.now(),
          loaded: true,
        });
      })
      .catch(() => {
        /* offline / API down: keep the build-time fallbacks */
      });
    return () => controller.abort();
  }, []);

  return config;
}
