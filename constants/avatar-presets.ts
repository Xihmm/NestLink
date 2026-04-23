import { AvatarPresetId } from '@/types/user';

export const AVATAR_PRESETS: Array<{
  id: AvatarPresetId;
  emoji: string;
  label: string;
  backgroundColor: string;
  accentColor: string;
}> = [
  { id: 'otter', emoji: '🦦', label: 'Otter', backgroundColor: '#1E3A5F', accentColor: '#7DD3FC' },
  { id: 'frog', emoji: '🐸', label: 'Frog', backgroundColor: '#173F35', accentColor: '#86EFAC' },
  { id: 'cat', emoji: '🐱', label: 'Cat', backgroundColor: '#4C1D3D', accentColor: '#F9A8D4' },
  { id: 'panda', emoji: '🐼', label: 'Panda', backgroundColor: '#1F2937', accentColor: '#E5E7EB' },
  { id: 'duck', emoji: '🦆', label: 'Duck', backgroundColor: '#3F2A14', accentColor: '#FCD34D' },
  { id: 'hamster', emoji: '🐹', label: 'Hamster', backgroundColor: '#4A2C1C', accentColor: '#FDBA74' },
];

export const DEFAULT_AVATAR_PRESET: AvatarPresetId = 'otter';
