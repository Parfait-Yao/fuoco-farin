'use client';

import LocalFireDepartmentRounded from '@mui/icons-material/LocalFireDepartmentRounded';
import EcoRounded from '@mui/icons-material/EnergySavingsLeafRounded';
import DeliveryDiningRounded from '@mui/icons-material/DeliveryDiningRounded';
import TuneRounded from '@mui/icons-material/TuneRounded';
import PhoneIphoneRounded from '@mui/icons-material/PhoneIphoneRounded';
import CreditCardRounded from '@mui/icons-material/CreditCardRounded';
import VerifiedRounded from '@mui/icons-material/VerifiedRounded';
import MenuBookRounded from '@mui/icons-material/MenuBookRounded';
import ShoppingBasketRounded from '@mui/icons-material/ShoppingBasketRounded';
import WhatshotRounded from '@mui/icons-material/WhatshotRounded';
import type { SvgIconProps } from '@mui/material';

const ICONS = {
  LocalFireDepartment: LocalFireDepartmentRounded,
  Eco: EcoRounded,
  DeliveryDining: DeliveryDiningRounded,
  Tune: TuneRounded,
  PhoneIphone: PhoneIphoneRounded,
  CreditCard: CreditCardRounded,
  Verified: VerifiedRounded,
  MenuBook: MenuBookRounded,
  ShoppingBasket: ShoppingBasketRounded,
  Whatshot: WhatshotRounded,
} as const;

export type IconName = keyof typeof ICONS;

/** Maps icon names stored in mock content to Material UI icons. */
export function DynamicIcon({ name, ...props }: { name: IconName } & SvgIconProps) {
  const Icon = ICONS[name];
  return <Icon {...props} />;
}
