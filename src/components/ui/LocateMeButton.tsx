'use client';

import * as React from 'react';
import { Alert, Box, Button, Typography } from '@mui/material';
import MyLocationRounded from '@mui/icons-material/MyLocationRounded';
import { ABIDJAN_DISTRICTS } from '@/constants';
import { useLocale, useMessages } from '@/i18n/client';
import { LoadingButton } from './form';

export interface GeoPosition {
  latitude: number;
  longitude: number;
}

export interface LocatedAddress extends GeoPosition {
  accuracy: number;
  street?: string;
  district?: string;
  city?: string;
}

const normalize = (value: string) =>
  value
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z]/g, '');

/** Matches a reverse-geocoding place name to one of the known districts (communes). */
function matchDistrict(candidates: (string | undefined)[]): string | undefined {
  for (const candidate of candidates) {
    if (!candidate) continue;
    const key = normalize(candidate);
    const found = ABIDJAN_DISTRICTS.find((d) => key.includes(normalize(d)));
    if (found) return found;
  }
  return undefined;
}

interface NominatimAddress {
  house_number?: string;
  road?: string;
  pedestrian?: string;
  residential?: string;
  neighbourhood?: string;
  quarter?: string;
  suburb?: string;
  city_district?: string;
  city?: string;
  town?: string;
  village?: string;
  county?: string;
  state_district?: string;
}

/** Reverse geocoding with OpenStreetMap Nominatim (free, no key, called on user action only). */
async function reverseGeocode(position: GeoPosition, locale: string): Promise<Omit<LocatedAddress, keyof GeoPosition | 'accuracy'>> {
  const url = new URL('https://nominatim.openstreetmap.org/reverse');
  url.search = new URLSearchParams({
    format: 'jsonv2',
    lat: String(position.latitude),
    lon: String(position.longitude),
    zoom: '18',
    addressdetails: '1',
    'accept-language': locale,
  }).toString();
  const res = await fetch(url, { headers: { Accept: 'application/json' } });
  if (!res.ok) return {};
  const data = (await res.json()) as { address?: NominatimAddress; display_name?: string };
  const a = data.address ?? {};
  const road = a.road ?? a.pedestrian ?? a.residential;
  const area = a.neighbourhood ?? a.quarter;
  const street = [a.house_number && road ? `${a.house_number} ${road}` : road, area].filter(Boolean).join(', ') || data.display_name?.split(',').slice(0, 2).join(',').trim();
  return {
    street: street && street.length >= 5 ? street.slice(0, 160) : undefined,
    district: matchDistrict([a.city_district, a.suburb, a.town, a.city, a.county, a.state_district, data.display_name]),
    city: a.city ?? a.town ?? a.village,
  };
}

type Status = { kind: 'idle' } | { kind: 'loading' } | { kind: 'success'; accuracy: number; partial: boolean } | { kind: 'error'; message: string };

/**
 * Optional "use my location" helper for address forms. Nothing happens until
 * the user clicks: the browser then asks for permission. On success the
 * parent receives the GPS coordinates and, when found, the street, district
 * and city. The user can always type or correct the address by hand.
 */
export function LocateMeButton({ onLocated, onClear, hasPosition }: { onLocated: (result: LocatedAddress) => void; onClear: () => void; hasPosition: boolean }) {
  const t = useMessages('common').geo;
  const locale = useLocale();
  const [status, setStatus] = React.useState<Status>({ kind: 'idle' });

  const locate = () => {
    if (typeof navigator === 'undefined' || !('geolocation' in navigator)) {
      setStatus({ kind: 'error', message: t.unsupported });
      return;
    }
    setStatus({ kind: 'loading' });
    navigator.geolocation.getCurrentPosition(
      async ({ coords }) => {
        const position = { latitude: coords.latitude, longitude: coords.longitude };
        const accuracy = Math.round(coords.accuracy);
        const address = await reverseGeocode(position, locale).catch(() => ({}) as Awaited<ReturnType<typeof reverseGeocode>>);
        onLocated({ ...position, accuracy, ...address });
        setStatus({ kind: 'success', accuracy, partial: !address.street || !address.district });
      },
      (error) => {
        const message = error.code === error.PERMISSION_DENIED ? t.denied : error.code === error.TIMEOUT ? t.timeout : t.unavailable;
        setStatus({ kind: 'error', message });
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 0 },
    );
  };

  const clear = () => {
    setStatus({ kind: 'idle' });
    onClear();
  };

  return (
    <Box className="space-y-2">
      <Box className="flex flex-wrap items-center gap-2">
        <LoadingButton variant="outlined" startIcon={<MyLocationRounded />} loading={status.kind === 'loading'} onClick={locate}>
          {status.kind === 'loading' ? t.locating : t.useMyLocation}
        </LoadingButton>
        {hasPosition && (
          <Button size="small" color="inherit" onClick={clear}>
            {t.remove}
          </Button>
        )}
      </Box>
      {status.kind === 'idle' && (
        <Typography variant="body2" color="text.secondary">
          {t.hint}
        </Typography>
      )}
      {status.kind === 'success' && hasPosition && (
        <Alert severity={status.partial ? 'warning' : 'success'} className="rounded-2xl">
          {status.partial ? t.noAddress : t.located(status.accuracy)}
        </Alert>
      )}
      {status.kind === 'error' && (
        <Alert severity="info" className="rounded-2xl" role="alert">
          {status.message}
        </Alert>
      )}
    </Box>
  );
}

/** Link to the exact GPS position, for the delivery driver and the restaurant. */
export function mapUrl({ latitude, longitude }: GeoPosition) {
  return `https://www.google.com/maps/search/?api=1&query=${latitude},${longitude}`;
}
